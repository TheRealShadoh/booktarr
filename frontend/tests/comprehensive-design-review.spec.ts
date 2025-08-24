import { test, expect } from '@playwright/test';

test.describe('Comprehensive Design Review - BookTarr Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/', { 
      waitUntil: 'networkidle',
      timeout: 30000
    });
  });

  test('Phase 0: Application Load and Initial Assessment @design', async ({ page }) => {
    console.log('\n=== PHASE 0: PREPARATION ===');
    
    // Basic loading verification
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/phase0-initial-load.png',
      fullPage: true 
    });
    
    // Get page title and basic info
    const title = await page.title();
    const url = page.url();
    
    console.log(`✓ Application Title: ${title}`);
    console.log(`✓ Application URL: ${url}`);
    
    // Check for any immediate console errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Wait a moment for any console messages
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
      console.log('Console messages:');
      consoleMessages.forEach(msg => console.log(`  ${msg}`));
    }
    
    expect(title).toBe('Booktarr');
  });

  test('Phase 1: Navigation and Main Layout @design', async ({ page }) => {
    console.log('\n=== PHASE 1: NAVIGATION AND LAYOUT ===');
    
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of main layout
    await page.screenshot({ 
      path: 'test-results/phase1-main-layout.png',
      fullPage: true 
    });
    
    // Check for main navigation elements
    const navigationElements = [
      'nav', '[role="navigation"]', '.sidebar', '.nav', 'header'
    ];
    
    for (const selector of navigationElements) {
      const element = await page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✓ Found navigation element: ${selector}`);
      }
    }
    
    // Look for main content area
    const contentSelectors = [
      'main', '[role="main"]', '.main', '.content', '#root'
    ];
    
    for (const selector of contentSelectors) {
      const element = await page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✓ Found content element: ${selector}`);
      }
    }
    
    // Test navigation if available
    const navLinks = await page.locator('a, button').filter({ hasText: /library|series|settings|books/i });
    const navCount = await navLinks.count();
    
    if (navCount > 0) {
      console.log(`✓ Found ${navCount} potential navigation links`);
      
      // Test each navigation link
      for (let i = 0; i < Math.min(navCount, 5); i++) {
        const link = navLinks.nth(i);
        const text = await link.textContent();
        
        try {
          await link.click();
          await page.waitForTimeout(1000);
          
          // Take screenshot after navigation
          await page.screenshot({ 
            path: `test-results/phase1-nav-${text?.toLowerCase().replace(/\s+/g, '-') || i}.png`,
            fullPage: true 
          });
          
          console.log(`✓ Successfully navigated to: ${text}`);
        } catch (error) {
          console.log(`✗ Failed to navigate to: ${text} - ${error.message}`);
        }
      }
    } else {
      console.log('⚠ No navigation links found');
    }
  });

  test('Phase 2: Responsive Design Testing @design', async ({ page, browserName }) => {
    console.log('\n=== PHASE 2: RESPONSIVE DESIGN ===');
    
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `test-results/phase2-responsive-${viewport.name}.png`,
        fullPage: true 
      });
      
      console.log(`✓ Captured ${viewport.name} viewport (${viewport.width}x${viewport.height})`);
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      if (hasHorizontalScroll) {
        console.log(`⚠ Horizontal scroll detected on ${viewport.name}`);
      } else {
        console.log(`✓ No horizontal scroll on ${viewport.name}`);
      }
    }
  });

  test('Phase 3: Interactive Elements Testing @design', async ({ page }) => {
    console.log('\n=== PHASE 3: INTERACTIVE ELEMENTS ===');
    
    await page.waitForLoadState('networkidle');
    
    // Find all interactive elements
    const interactiveSelectors = [
      'button', 'input', 'select', 'textarea', 'a[href]', '[role="button"]', '[role="link"]'
    ];
    
    let totalInteractiveElements = 0;
    
    for (const selector of interactiveSelectors) {
      const elements = await page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`✓ Found ${count} ${selector} elements`);
        totalInteractiveElements += count;
        
        // Test first few elements of each type
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          const text = await element.textContent() || '';
          const tagName = await element.evaluate(el => el.tagName);
          
          try {
            // Test hover state
            await element.hover();
            await page.waitForTimeout(100);
            
            console.log(`✓ Hover tested on ${tagName}: ${text.slice(0, 30)}...`);
          } catch (error) {
            console.log(`⚠ Hover failed on ${tagName}: ${text.slice(0, 30)}...`);
          }
        }
      }
    }
    
    console.log(`✓ Total interactive elements found: ${totalInteractiveElements}`);
    
    // Take screenshot after interaction testing
    await page.screenshot({ 
      path: 'test-results/phase3-interactive-elements.png',
      fullPage: true 
    });
  });

  test('Phase 4: Content and Loading States @design', async ({ page }) => {
    console.log('\n=== PHASE 4: CONTENT AND LOADING STATES ===');
    
    // Check for loading states
    const loadingIndicators = await page.locator(':has-text("loading"), :has-text("Loading"), .loading, .spinner').count();
    
    if (loadingIndicators > 0) {
      console.log(`⚠ Found ${loadingIndicators} loading indicators still visible`);
      await page.screenshot({ 
        path: 'test-results/phase4-loading-states.png',
        fullPage: true 
      });
    } else {
      console.log('✓ No loading indicators visible');
    }
    
    // Check for empty states
    const emptyStateTexts = ['no books', 'no results', 'empty', 'nothing found'];
    for (const text of emptyStateTexts) {
      const elements = await page.locator(`:has-text("${text}")`).count();
      if (elements > 0) {
        console.log(`✓ Found empty state: "${text}"`);
      }
    }
    
    // Check for data content
    const dataIndicators = [
      'book', 'series', 'title', 'author', 'isbn'
    ];
    
    let hasContent = false;
    for (const indicator of dataIndicators) {
      const elements = await page.locator(`:has-text("${indicator}")`).count();
      if (elements > 0) {
        console.log(`✓ Found content references: ${elements} mentions of "${indicator}"`);
        hasContent = true;
      }
    }
    
    if (!hasContent) {
      console.log('⚠ No book/series content detected');
    }
    
    // Take final content screenshot
    await page.screenshot({ 
      path: 'test-results/phase4-content-analysis.png',
      fullPage: true 
    });
  });

  test('Phase 5: Accessibility Snapshot @design', async ({ page }) => {
    console.log('\n=== PHASE 5: ACCESSIBILITY ===');
    
    // Take accessibility snapshot
    const snapshot = await page.accessibility.snapshot();
    
    if (snapshot) {
      console.log('✓ Accessibility tree captured');
      console.log(`✓ Accessibility tree has ${JSON.stringify(snapshot).length} characters`);
      
      // Basic accessibility checks
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
      console.log(`✓ Found ${headings} heading elements`);
      
      const landmarks = await page.locator('nav, main, header, footer, aside, section[aria-label]').count();
      console.log(`✓ Found ${landmarks} landmark elements`);
      
      const altTexts = await page.locator('img[alt]').count();
      const totalImages = await page.locator('img').count();
      console.log(`✓ Found ${altTexts}/${totalImages} images with alt text`);
      
    } else {
      console.log('⚠ Could not capture accessibility tree');
    }
    
    // Final accessibility screenshot
    await page.screenshot({ 
      path: 'test-results/phase5-accessibility.png',
      fullPage: true 
    });
  });
});