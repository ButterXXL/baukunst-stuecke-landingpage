const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testVideoPerformance() {
    console.log('🎬 Starting Video Performance Test...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const results = {
        pageLoad: null,
        videoElement: null,
        videoMetadata: null,
        videoPlayback: null,
        networkRequests: [],
        errors: [],
        timeline: []
    };
    
    // Track network requests
    page.on('request', request => {
        if (request.url().includes('.mov') || request.url().includes('.mp4')) {
            results.networkRequests.push({
                url: request.url(),
                method: request.method(),
                timestamp: Date.now()
            });
        }
    });
    
    // Track console errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            results.errors.push(msg.text());
        }
    });
    
    try {
        const startTime = Date.now();
        results.timeline.push({ event: 'Test started', time: 0 });
        
        // Get the absolute path to the HTML file
        const htmlPath = path.resolve(__dirname, 'bks_landing_2.html');
        const fileUrl = `file://${htmlPath}`;
        
        console.log(`📄 Loading website: ${fileUrl}`);
        results.timeline.push({ event: 'Navigation started', time: Date.now() - startTime });
        
        // Navigate to the local HTML file
        await page.goto(fileUrl, { waitUntil: 'networkidle', timeout: 60000 });
        
        const pageLoadTime = Date.now() - startTime;
        results.pageLoad = pageLoadTime;
        results.timeline.push({ event: 'Page loaded', time: pageLoadTime });
        console.log(`✅ Page loaded in: ${pageLoadTime}ms`);
        
        // Wait for video element
        console.log('\n🎥 Checking for video element...');
        const videoElementTime = Date.now();
        await page.waitForSelector('#heroVideo', { timeout: 10000 });
        const videoFoundTime = Date.now() - startTime;
        results.videoElement = Date.now() - videoElementTime;
        results.timeline.push({ event: 'Video element found', time: videoFoundTime });
        console.log(`✅ Video element found in: ${results.videoElement}ms`);
        
        // Get video element properties
        const videoInfo = await page.evaluate(() => {
            const video = document.getElementById('heroVideo');
            return {
                src: video.currentSrc || video.src,
                readyState: video.readyState,
                paused: video.paused,
                currentTime: video.currentTime,
                duration: video.duration,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                autoplay: video.autoplay,
                muted: video.muted,
                loop: video.loop,
                preload: video.preload
            };
        });
        
        console.log('\n📊 Video Element Properties:');
        console.log(`   Source: ${videoInfo.src}`);
        console.log(`   Ready State: ${videoInfo.readyState} (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)`);
        console.log(`   Paused: ${videoInfo.paused}`);
        console.log(`   Current Time: ${videoInfo.currentTime}s`);
        console.log(`   Duration: ${videoInfo.duration}s`);
        console.log(`   Dimensions: ${videoInfo.videoWidth}x${videoInfo.videoHeight}`);
        console.log(`   Autoplay: ${videoInfo.autoplay}`);
        console.log(`   Muted: ${videoInfo.muted}`);
        console.log(`   Loop: ${videoInfo.loop}`);
        console.log(`   Preload: ${videoInfo.preload}`);
        
        // Wait for video metadata to load
        console.log('\n⏳ Waiting for video metadata...');
        await page.waitForFunction(() => {
            const video = document.getElementById('heroVideo');
            return video.readyState >= 1; // HAVE_METADATA
        }, { timeout: 30000 });
        
        const metadataTime = Date.now() - startTime;
        results.videoMetadata = metadataTime - videoFoundTime;
        results.timeline.push({ event: 'Video metadata loaded', time: metadataTime });
        console.log(`✅ Video metadata loaded in: ${results.videoMetadata}ms`);
        
        // Check if video is playing
        console.log('\n🎬 Checking video playback...');
        let playbackStarted = false;
        let playbackTime = null;
        
        // Wait up to 10 seconds for video to start playing
        for (let i = 0; i < 100; i++) {
            const isPlaying = await page.evaluate(() => {
                const video = document.getElementById('heroVideo');
                return !video.paused && video.currentTime > 0;
            });
            
            if (isPlaying && !playbackStarted) {
                playbackStarted = true;
                playbackTime = Date.now() - startTime;
                results.videoPlayback = playbackTime - videoFoundTime;
                results.timeline.push({ event: 'Video playback started', time: playbackTime });
                console.log(`✅ Video playback started in: ${results.videoPlayback}ms`);
                break;
            }
            
            await page.waitForTimeout(100);
        }
        
        if (!playbackStarted) {
            console.log('❌ Video did not start playing automatically');
            results.timeline.push({ event: 'Video playback failed', time: Date.now() - startTime });
            
            // Try to manually trigger play
            console.log('🔄 Attempting manual play...');
            const manualPlayResult = await page.evaluate(async () => {
                const video = document.getElementById('heroVideo');
                try {
                    await video.play();
                    return { success: true, error: null };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            });
            
            if (manualPlayResult.success) {
                console.log('✅ Manual play successful');
            } else {
                console.log(`❌ Manual play failed: ${manualPlayResult.error}`);
            }
        }
        
        // Get final video state
        const finalVideoState = await page.evaluate(() => {
            const video = document.getElementById('heroVideo');
            return {
                readyState: video.readyState,
                paused: video.paused,
                currentTime: video.currentTime,
                duration: video.duration,
                networkState: video.networkState,
                buffered: video.buffered.length > 0 ? {
                    start: video.buffered.start(0),
                    end: video.buffered.end(0)
                } : null
            };
        });
        
        console.log('\n📊 Final Video State:');
        console.log(`   Ready State: ${finalVideoState.readyState}`);
        console.log(`   Paused: ${finalVideoState.paused}`);
        console.log(`   Current Time: ${finalVideoState.currentTime}s`);
        console.log(`   Duration: ${finalVideoState.duration}s`);
        console.log(`   Network State: ${finalVideoState.networkState} (0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE)`);
        console.log(`   Buffered: ${finalVideoState.buffered ? `${finalVideoState.buffered.start}s - ${finalVideoState.buffered.end}s` : 'None'}`);
        
        // Check file size and type
        const videoFileInfo = await page.evaluate(() => {
            const video = document.getElementById('heroVideo');
            const source = video.querySelector('source');
            return {
                src: source ? source.src : video.src,
                type: source ? source.type : 'unknown'
            };
        });
        
        console.log('\n📁 Video File Info:');
        console.log(`   Source: ${videoFileInfo.src}`);
        console.log(`   Type: ${videoFileInfo.type}`);
        
        // Take a screenshot
        await page.screenshot({ 
            path: 'video-test-screenshot.png',
            fullPage: false 
        });
        console.log('\n📸 Screenshot saved as video-test-screenshot.png');
        
        // Network requests summary
        console.log('\n🌐 Network Requests:');
        results.networkRequests.forEach(req => {
            console.log(`   ${req.method} ${req.url}`);
        });
        
        // Errors summary
        if (results.errors.length > 0) {
            console.log('\n❌ Console Errors:');
            results.errors.forEach(error => {
                console.log(`   ${error}`);
            });
        }
        
        // Timeline summary
        console.log('\n⏱️ Timeline:');
        results.timeline.forEach(event => {
            console.log(`   ${event.time}ms: ${event.event}`);
        });
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (finalVideoState.paused) {
            console.log('   - Video is not playing - browser autoplay policy may be blocking it');
            console.log('   - Consider adding a play button or user interaction requirement');
        }
        if (finalVideoState.readyState < 4) {
            console.log('   - Video is not fully loaded - file may be too large');
            console.log('   - Consider compressing the video or using a streaming format');
        }
        if (videoFileInfo.type.includes('quicktime')) {
            console.log('   - MOV format may not be optimal for web browsers');
            console.log('   - Consider converting to MP4 with H.264 codec');
        }
        
        // Save results to file
        fs.writeFileSync('video-test-results.json', JSON.stringify(results, null, 2));
        console.log('\n💾 Detailed results saved to video-test-results.json');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        results.errors.push(error.message);
    } finally {
        await browser.close();
        console.log('\n🏁 Test completed!');
    }
}

// Run the test
testVideoPerformance().catch(console.error);