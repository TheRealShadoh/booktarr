import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should capture settings page for debugging import', async ({ page }) => {
    // Navigate to Settings page
    await page.click('text=Settings');
    
    // Take a screenshot to see what's on settings page
    await page.screenshot({ 
      path: 'test-results/settings-debug.png',
      fullPage: true 
    });

    // Look for ImportPage related elements
    const importElements = await page.locator('text=/import/i').all();
    console.log(`Found ${importElements.length} elements with 'import' text`);
    
    for (const element of importElements) {
      const text = await element.textContent();
      console.log(`Import element: ${text?.trim()}`);
    }
    
    // Look for file inputs
    const fileInputs = await page.locator('input[type="file"]').all();
    console.log(`Found ${fileInputs.length} file inputs`);
    
    // Look for specific file upload elements
    const uploadLabel = await page.locator('label[for="file-upload"]').count();
    console.log(`Found ${uploadLabel} upload labels`);
    
    const fileUploadInput = await page.locator('#file-upload').count();
    console.log(`Found ${fileUploadInput} #file-upload elements`);
    
    // Look for any elements containing "upload"
    const uploadElements = await page.locator('text=/upload/i').all();
    console.log(`Found ${uploadElements.length} elements with 'upload' text`);
    
    for (const element of uploadElements) {
      const text = await element.textContent();
      console.log(`Upload element: ${text?.trim()}`);
    }
  });
});