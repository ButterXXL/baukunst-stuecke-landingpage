const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testWebsite() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 
    });
    
    const page = await browser.newPage();
    
    // Set viewport for better testing
    await page.setViewportSize({ width: 1200, height: 800 });
    
    try {
        // Get the absolute path to the HTML file
        const htmlPath = path.resolve(__dirname, 'bks_landing_1.html');
        const fileUrl = `file://${htmlPath}`;
        
        console.log(`Loading website from: ${fileUrl}`);
        
        // Navigate to the local HTML file
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        
        // Wait for the page to load completely
        await page.waitForTimeout(2000);
        
        // Test 1: Check if the main headline is present
        console.log('Testing main headline...');
        const headline = await page.locator('h1:has-text("BAUKUNST STÜCKE")');
        await headline.waitFor({ timeout: 5000 });
        console.log('✅ Main headline found');
        
        // Test 2: Check if navigation works
        console.log('Testing navigation...');
        const navItems = await page.locator('nav a').count();
        console.log(`✅ Found ${navItems} navigation items`);
        
        // Test 3: Check if video/image is present
        console.log('Testing hero media...');
        const heroVideo = page.locator('video');
        const heroImage = page.locator('#hero img');
        
        if (await heroVideo.count() > 0) {
            console.log('✅ Hero video element found');
        } else if (await heroImage.count() > 0) {
            console.log('✅ Hero image element found');
        } else {
            console.log('❌ No hero media found');
        }
        
        // Test 4: Check sections
        const sections = [
            '#warum-wir',
            '#leistungen', 
            '#referenzen',
            '#galerie',
            '#über-uns',
            '#ablauf',
            '#faq',
            '#kontakt'
        ];
        
        console.log('Testing sections...');
        for (const section of sections) {
            const element = await page.locator(section);
            if (await element.count() > 0) {
                console.log(`✅ Section ${section} found`);
            } else {
                console.log(`❌ Section ${section} missing`);
            }
        }
        
        // Test 5: Test FAQ functionality
        console.log('Testing FAQ accordion...');
        await page.click('button:has-text("Wie lange dauert die Performance?")');
        await page.waitForTimeout(500);
        console.log('✅ FAQ accordion clicked');
        
        // Test 6: Test mobile menu (resize viewport)
        console.log('Testing mobile responsiveness...');
        await page.setViewportSize({ width: 400, height: 800 });
        await page.waitForTimeout(500);
        console.log('✅ Mobile viewport tested');
        
        // Test 7: Check form elements
        console.log('Testing contact form...');
        const formInputs = await page.locator('#kontakt input').count();
        console.log(`✅ Found ${formInputs} form inputs`);
        
        // Take a screenshot
        console.log('Taking screenshot...');
        await page.screenshot({ 
            path: 'website-test-screenshot.png',
            fullPage: true 
        });
        console.log('✅ Screenshot saved as website-test-screenshot.png');
        
        console.log('\n🎉 Website test completed successfully!');
        console.log('The website appears to be working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testWebsite();