import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Debug CSV Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should debug the complete CSV import process', async ({ page }) => {
    // Navigate to CSV import
    await page.click('text=Settings');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/debug-01-settings-page.png',
      fullPage: true 
    });
    
    await page.click('text=Import');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/debug-02-import-page.png',
      fullPage: true 
    });
    
    // Click on CSV option
    await page.click('text="CSV"');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/debug-03-csv-selected.png',
      fullPage: true 
    });
    
    // Upload the CSV file
    const csvPath = path.join(process.cwd(), '../sample_data', 'HandyLib.csv');
    console.log(`Uploading CSV from: ${csvPath}`);
    
    const fileInput = page.locator('input[type="file"]');
    const fileInputCount = await fileInput.count();
    console.log(`Found ${fileInputCount} file input elements`);
    
    if (fileInputCount > 0) {
      await fileInput.setInputFiles(csvPath);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/debug-04-file-uploaded.png',
        fullPage: true 
      });
      
      // Look for any buttons that appear after file upload
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Found ${buttonCount} buttons after file upload`);
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const buttonText = await button.textContent();
        const isVisible = await button.isVisible();
        const isEnabled = await button.isEnabled();
        console.log(`Button ${i}: "${buttonText}" (visible: ${isVisible}, enabled: ${isEnabled})`);
      }
      
      // Look specifically for Preview button
      const previewButton = page.locator('button:has-text("Preview")');
      const previewCount = await previewButton.count();
      console.log(`Found ${previewCount} Preview buttons`);
      
      if (previewCount > 0) {
        const isPreviewVisible = await previewButton.first().isVisible();
        const isPreviewEnabled = await previewButton.first().isEnabled();
        console.log(`Preview button - visible: ${isPreviewVisible}, enabled: ${isPreviewEnabled}`);
        
        if (isPreviewVisible && isPreviewEnabled) {
          console.log('Clicking Preview button...');
          await previewButton.first().click();
          await page.waitForTimeout(5000); // Wait longer for preview to load
          
          await page.screenshot({ 
            path: 'test-results/debug-05-preview-clicked.png',
            fullPage: true 
          });
          
          // Check for preview content
          const previewContent = page.locator('.preview, .book-preview, [data-testid="preview"]');
          const previewContentCount = await previewContent.count();
          console.log(`Found ${previewContentCount} preview content elements`);
          
          // Check for any error messages
          const errorElements = page.locator('.error, .alert, [data-testid="error"]');
          const errorCount = await errorElements.count();
          console.log(`Found ${errorCount} error elements`);
          
          if (errorCount > 0) {
            for (let i = 0; i < errorCount; i++) {
              const errorText = await errorElements.nth(i).textContent();
              console.log(`Error ${i}: "${errorText}"`);
            }
          }
          
          // Look for Import button after preview
          const importButton = page.locator('button:has-text("Import")');
          const importCount = await importButton.count();
          console.log(`Found ${importCount} Import buttons after preview`);
          
          if (importCount > 0) {
            const isImportVisible = await importButton.first().isVisible();
            const isImportEnabled = await importButton.first().isEnabled();
            console.log(`Import button - visible: ${isImportVisible}, enabled: ${isImportEnabled}`);
          }
          
          // Check the page content for any text about books
          const pageText = await page.textContent('body');
          const hasBookText = pageText?.includes('book') || pageText?.includes('Book');
          console.log(`Page contains book-related text: ${hasBookText}`);
          
        } else {
          console.log('Preview button not clickable');
        }
      } else {
        console.log('No Preview button found - looking for other action buttons');
        
        // Look for any other action buttons
        const actionButtons = page.locator('button:has-text("Process"), button:has-text("Parse"), button:has-text("Upload")');
        const actionCount = await actionButtons.count();
        console.log(`Found ${actionCount} alternative action buttons`);
        
        if (actionCount > 0) {
          for (let i = 0; i < actionCount; i++) {
            const buttonText = await actionButtons.nth(i).textContent();
            console.log(`Action button ${i}: "${buttonText}"`);
          }
        }
      }
    } else {
      console.log('No file input found!');
    }
    
    await page.screenshot({ 
      path: 'test-results/debug-06-final-state.png',
      fullPage: true 
    });
  });
});