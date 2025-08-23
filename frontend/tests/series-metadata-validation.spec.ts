import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

test.describe('Series Metadata Validation', () => {
  test.setTimeout(180000); // 3 minutes

  test('should validate Bleach series has correct volume count after import', async ({ page }) => {
    // Step 1: Reset library via API
    console.log('🔄 Resetting library via API...');
    const resetResponse = await page.request.post('/api/settings/remove-all-data', {
      data: { confirmation: 'DELETE' }
    });
    expect(resetResponse.ok()).toBeTruthy();
    console.log('✅ Library reset completed');

    // Step 2: Import CSV via API
    console.log('📂 Importing CSV via API...');
    const csvPath = join(process.cwd(), '..', 'sample_data', 'HandyLib.csv');
    const fileBuffer = readFileSync(csvPath);
    
    const importResponse = await page.request.post('/api/books/import', {
      multipart: {
        'file': { 
          name: 'HandyLib.csv', 
          mimeType: 'text/csv', 
          buffer: fileBuffer 
        },
        'format': 'handylib',
        'field_mapping': '{}',
        'skip_duplicates': 'true',
        'enrich_metadata': 'true'
      }
    });

    expect(importResponse.ok()).toBeTruthy();
    const importResult = await importResponse.json();
    console.log(`📚 Import completed: ${importResult.imported} books imported, ${importResult.errors?.length || 0} errors`);
    
    // Validate 314 books were imported
    expect(importResult.imported).toBe(314);

    // Step 3: Wait a moment for series processing
    await page.waitForTimeout(5000);

    // Step 4: Check series metadata via API
    console.log('🔍 Checking series metadata via API...');
    const seriesResponse = await page.request.get('/api/series/');
    expect(seriesResponse.ok()).toBeTruthy();
    
    const seriesResult = await seriesResponse.json();
    const seriesData = seriesResult.series || [];
    console.log(`📊 Found ${seriesData.length} series`);

    // Step 5: Find and validate Bleach series
    const bleachSeries = seriesData.find((s: any) => s.name.toLowerCase().includes('bleach'));
    expect(bleachSeries).toBeTruthy();
    
    console.log(`📖 Bleach series data:`, {
      name: bleachSeries.name,
      total_books: bleachSeries.total_books,
      owned_count: bleachSeries.owned_count,
      status: bleachSeries.status
    });

    // Validate Bleach has correct volume count
    expect(bleachSeries.total_books).toBeGreaterThanOrEqual(74);
    expect(bleachSeries.total_books).toBeLessThanOrEqual(75);
    
    // Validate owned count is reasonable (should be around 4)
    expect(bleachSeries.owned_count).toBeGreaterThanOrEqual(3);
    expect(bleachSeries.owned_count).toBeLessThanOrEqual(5);

    console.log(`✅ Bleach validation passed: ${bleachSeries.owned_count}/${bleachSeries.total_books} volumes`);

    // Step 6: Test series details API
    const bleachDetailsResponse = await page.request.get(`/api/series/${encodeURIComponent(bleachSeries.name)}`);
    expect(bleachDetailsResponse.ok()).toBeTruthy();
    
    const bleachDetails = await bleachDetailsResponse.json();
    console.log(`📋 Bleach details: ${bleachDetails.volumes?.length || 0} volumes in details`);
    
    // Validate series details has all volumes
    expect(bleachDetails.total_books).toBeGreaterThanOrEqual(74);
    expect(bleachDetails.volumes?.length).toBeGreaterThan(50); // Should have many volumes

    console.log('🎉 All Bleach series validations passed!');
  });

  test('should validate series metadata quality across multiple series', async ({ page }) => {
    // Check that multiple series have reasonable metadata
    const seriesResponse = await page.request.get('/api/series/');
    expect(seriesResponse.ok()).toBeTruthy();
    
    const seriesResult = await seriesResponse.json();
    const seriesData = seriesResult.series || [];
    
    // Find series that should have external metadata
    const knownSeries = [
      { name: 'bleach', minVolumes: 70 },
      { name: 'citrus', minVolumes: 8 },
      { name: 'spy', minVolumes: 7 },
      { name: 'horimiya', minVolumes: 8 }
    ];

    let validatedSeries = 0;
    
    for (const known of knownSeries) {
      const foundSeries = seriesData.find((s: any) => 
        s.name.toLowerCase().includes(known.name)
      );
      
      if (foundSeries) {
        console.log(`📊 ${foundSeries.name}: ${foundSeries.owned_count}/${foundSeries.total_books} volumes`);
        
        // Validate total_books is reasonable
        if (foundSeries.total_books >= known.minVolumes) {
          validatedSeries++;
          console.log(`✅ ${foundSeries.name} has good metadata (${foundSeries.total_books} volumes)`);
        } else {
          console.log(`⚠️  ${foundSeries.name} has suspicious volume count: ${foundSeries.total_books}`);
        }
      }
    }

    // Should have validated at least 2 series with good metadata
    expect(validatedSeries).toBeGreaterThanOrEqual(2);
    console.log(`✅ Validated ${validatedSeries} series with good metadata`);
  });
});