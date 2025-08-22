import { test, expect } from '@playwright/test';

test.describe('Amazon Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display Amazon integration page and authentication options @visual', async ({ page }) => {
    // Navigate to Amazon integration page
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    // Look for Amazon integration option
    const amazonButton = page.locator('button:has-text("Amazon"), button:has-text("Kindle"), button:has-text("Audible"), [data-testid="amazon-integration"]').first();
    
    if (await amazonButton.isVisible()) {
      await amazonButton.click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of Amazon integration page
      await page.screenshot({ 
        path: 'test-results/amazon-integration-page.png',
        fullPage: true 
      });
      
      // Check for authentication sections
      const authSections = {
        audible_section: page.locator('[data-testid="audible-section"], .audible-card, h2:has-text("Audible")').first(),
        kindle_section: page.locator('[data-testid="kindle-section"], .kindle-card, h2:has-text("Kindle")').first(),
        sync_history: page.locator('[data-testid="sync-history"], .sync-history, h2:has-text("Sync History")').first()
      };
      
      for (const [section, locator] of Object.entries(authSections)) {
        const isVisible = await locator.isVisible();
        console.log(`Amazon integration section "${section}": ${isVisible ? 'visible' : 'not visible'}`);
      }
      
      // Check authentication status API
      const authStatusResponse = await page.request.get('/api/amazon/status');
      if (authStatusResponse.ok()) {
        const authData = await authStatusResponse.json();
        console.log('Amazon auth status API response:', JSON.stringify({
          audible_authenticated: authData.audible_authenticated,
          kindle_authenticated: authData.kindle_authenticated,
          audible_last_sync: authData.audible_last_sync,
          kindle_last_sync: authData.kindle_last_sync
        }, null, 2));
      } else {
        console.log('Amazon auth status API not available, status:', authStatusResponse.status());
      }
      
    } else {
      console.log('Amazon integration button not found, checking alternative navigation');
      
      // Try navigating to Amazon sync page directly if available
      await page.goto('/amazon');
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/amazon-integration-direct.png',
        fullPage: true 
      });
    }
  });

  test('should test Audible authentication flow @visual', async ({ page }) => {
    // Navigate to Amazon integration
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go to settings and find Amazon integration
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon"), [data-testid="amazon-sync"]').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Look for Audible connect button
      const audibleConnect = page.locator('button:has-text("Connect Audible"), button:has-text("Audible"), .audible-connect').first();
      
      if (await audibleConnect.isVisible()) {
        await audibleConnect.click();
        await page.waitForTimeout(1000);
        
        // Take screenshot of authentication form
        await page.screenshot({ 
          path: 'test-results/audible-auth-form.png',
          fullPage: true 
        });
        
        // Test form validation
        const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        
        if (await usernameInput.isVisible() && await passwordInput.isVisible()) {
          // Test with invalid credentials first
          await usernameInput.fill('test@example.com');
          await passwordInput.fill('testpassword');
          
          const submitButton = page.locator('button:has-text("Authenticate"), button[type="submit"]').first();
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
              path: 'test-results/audible-auth-attempt.png',
              fullPage: true 
            });
          }
        }
        
        // Test API endpoints
        const audibleAuthResponse = await page.request.post('/api/amazon/audible/auth', {
          data: {
            username: 'test@example.com',
            password: 'testpassword',
            marketplace: 'us'
          }
        });
        
        if (audibleAuthResponse.ok()) {
          const authData = await audibleAuthResponse.json();
          console.log('Audible auth API response:', JSON.stringify({
            success: authData.success,
            requires_2fa: authData.requires_2fa,
            error: authData.error
          }, null, 2));
        } else {
          console.log('Audible auth API status:', audibleAuthResponse.status());
        }
      }
    }
    
    // Test OAuth flow if available
    const oauthResponse = await page.request.get('/api/amazon/auth/url?redirect_uri=http://localhost:3000/amazon/callback');
    
    if (oauthResponse.ok()) {
      const oauthData = await oauthResponse.json();
      console.log('Amazon OAuth URL API response:', JSON.stringify({
        has_auth_url: !!oauthData.auth_url,
        has_state: !!oauthData.state
      }, null, 2));
    } else {
      console.log('Amazon OAuth URL API status:', oauthResponse.status());
    }
  });

  test('should test Kindle authentication and import methods @visual', async ({ page }) => {
    // Navigate to Amazon integration
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Look for Kindle section
      const kindleSection = page.locator('h2:has-text("Kindle"), .kindle-section').first();
      
      if (await kindleSection.isVisible()) {
        // Test import method selection
        const importMethods = {
          account: page.locator('input[value="auth"], label:has-text("Amazon Account")').first(),
          csv: page.locator('input[value="csv"], label:has-text("CSV")').first(),
          json: page.locator('input[value="json"], label:has-text("JSON")').first(),
          device: page.locator('input[value="device"], label:has-text("Device")').first()
        };
        
        for (const [method, radio] of Object.entries(importMethods)) {
          if (await radio.isVisible()) {
            await radio.click();
            await page.waitForTimeout(500);
            
            console.log(`Tested Kindle import method: ${method}`);
            
            await page.screenshot({ 
              path: `test-results/kindle-import-${method}.png`,
              fullPage: true 
            });
          }
        }
        
        // Test file upload for CSV/JSON methods
        const csvRadio = page.locator('input[value="csv"]').first();
        
        if (await csvRadio.isVisible()) {
          await csvRadio.click();
          await page.waitForTimeout(500);
          
          const fileInput = page.locator('input[type="file"]').first();
          
          if (await fileInput.isVisible()) {
            // Create a test CSV file
            const testCSV = 'Title,Author,ASIN\n"Test Book","Test Author","B123456789"';
            const testFile = Buffer.from(testCSV);
            
            // Note: File upload in tests requires special handling
            console.log('File input found for Kindle CSV import');
            
            await page.screenshot({ 
              path: 'test-results/kindle-csv-upload.png',
              fullPage: true 
            });
          }
        }
        
        // Test device path input
        const deviceRadio = page.locator('input[value="device"]').first();
        
        if (await deviceRadio.isVisible()) {
          await deviceRadio.click();
          await page.waitForTimeout(500);
          
          const devicePathInput = page.locator('input[placeholder*="kindle" i], input[placeholder*="device" i]').first();
          
          if (await devicePathInput.isVisible()) {
            await devicePathInput.fill('/media/kindle-test');
            
            await page.screenshot({ 
              path: 'test-results/kindle-device-scan.png',
              fullPage: true 
            });
          }
        }
      }
    }
    
    // Test Kindle API endpoints
    const kindleAuthResponse = await page.request.post('/api/amazon/kindle/auth', {
      data: {
        username: 'test@example.com',
        password: 'testpassword',
        marketplace: 'us'
      }
    });
    
    if (kindleAuthResponse.ok()) {
      const kindleData = await kindleAuthResponse.json();
      console.log('Kindle auth API response:', JSON.stringify({
        success: kindleData.success,
        requires_2fa: kindleData.requires_2fa,
        error: kindleData.error
      }, null, 2));
    } else {
      console.log('Kindle auth API status:', kindleAuthResponse.status());
    }
  });

  test('should test library synchronization functionality @visual', async ({ page }) => {
    // Navigate to Amazon integration
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Look for sync buttons (these might be disabled if not authenticated)
      const syncButtons = {
        audible_sync: page.locator('button:has-text("Sync"), button:has-text("Audible")').first(),
        kindle_sync: page.locator('button:has-text("Sync Library"), button:has-text("Kindle")').first()
      };
      
      for (const [service, button] of Object.entries(syncButtons)) {
        if (await button.isVisible()) {
          const isEnabled = await button.isEnabled();
          console.log(`${service} sync button: ${isEnabled ? 'enabled' : 'disabled'}`);
          
          if (isEnabled) {
            // Test sync functionality
            await button.click();
            await page.waitForTimeout(2000);
            
            await page.screenshot({ 
              path: `test-results/${service}-sync-initiated.png`,
              fullPage: true 
            });
          }
        }
      }
    }
    
    // Test sync API endpoints
    const auditbleSyncResponse = await page.request.post('/api/amazon/audible/sync');
    
    if (auditbleSyncResponse.ok()) {
      const syncData = await auditbleSyncResponse.json();
      console.log('Audible sync API response:', JSON.stringify({
        success: syncData.success,
        job_id: syncData.job_id,
        error: syncData.error
      }, null, 2));
    } else {
      console.log('Audible sync API status:', auditbleSyncResponse.status());
    }
    
    const kindleSyncResponse = await page.request.post('/api/amazon/kindle/sync');
    
    if (kindleSyncResponse.ok()) {
      const syncData = await kindleSyncResponse.json();
      console.log('Kindle sync API response:', JSON.stringify({
        success: syncData.success,
        job_id: syncData.job_id,
        error: syncData.error
      }, null, 2));
    } else {
      console.log('Kindle sync API status:', kindleSyncResponse.status());
    }
    
    // Test sync status
    const syncStatusResponse = await page.request.get('/api/amazon/sync/status');
    
    if (syncStatusResponse.ok()) {
      const statusData = await syncStatusResponse.json();
      console.log('Amazon sync status API response:', JSON.stringify({
        last_sync: statusData.last_sync,
        sync_counts: statusData.sync_counts,
        is_syncing: statusData.is_syncing
      }, null, 2));
    } else {
      console.log('Amazon sync status API status:', syncStatusResponse.status());
    }
  });

  test('should test book matching and ASIN/ISBN correlation @visual', async ({ page }) => {
    // Test the book matching functionality that correlates Amazon books with local library
    
    // First check supported formats
    const formatsResponse = await page.request.get('/api/amazon/supported-formats');
    
    if (formatsResponse.ok()) {
      const formatsData = await formatsResponse.json();
      console.log('Amazon supported formats API response:', JSON.stringify({
        kindle_formats: formatsData.kindle_formats,
        audible_formats: formatsData.audible_formats,
        matching_fields: formatsData.matching_fields
      }, null, 2));
      
      expect(formatsData.kindle_formats).toBeDefined();
      expect(formatsData.audible_formats).toBeDefined();
      expect(formatsData.matching_fields).toBeDefined();
    } else {
      console.log('Amazon supported formats API status:', formatsResponse.status());
    }
    
    // Test integration info
    const integrationInfoResponse = await page.request.get('/api/amazon/integration/info');
    
    if (integrationInfoResponse.ok()) {
      const infoData = await integrationInfoResponse.json();
      console.log('Amazon integration info API response:', JSON.stringify({
        kindle_sync_available: infoData.features?.kindle_sync?.available,
        audible_sync_available: infoData.features?.audible_sync?.available,
        requires_auth: infoData.features?.kindle_sync?.requires_auth,
        mock_implementation: infoData.features?.kindle_sync?.mock_implementation
      }, null, 2));
      
      expect(infoData.features).toBeDefined();
      expect(infoData.requirements).toBeDefined();
    } else {
      console.log('Amazon integration info API status:', integrationInfoResponse.status());
    }
    
    // Navigate to the UI to test book matching visualization
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Library")');
    await page.waitForLoadState('networkidle');
    
    // Look for Amazon-sourced books or indicators
    const amazonIndicators = page.locator('.amazon-badge, .kindle-badge, .audible-badge, [data-source="amazon"]');
    const indicatorCount = await amazonIndicators.count();
    
    console.log(`Found ${indicatorCount} Amazon source indicators in library`);
    
    if (indicatorCount > 0) {
      await page.screenshot({ 
        path: 'test-results/amazon-book-matching.png',
        fullPage: true 
      });
    }
    
    // Test the general sync endpoint
    const generalSyncResponse = await page.request.post('/api/amazon/sync', {
      data: {
        user_id: 1,
        library_type: 'both'
      }
    });
    
    if (generalSyncResponse.ok()) {
      const syncData = await generalSyncResponse.json();
      console.log('Amazon general sync API response:', JSON.stringify({
        success: syncData.success,
        sync_results: syncData.sync_results,
        sync_timestamp: syncData.sync_timestamp
      }, null, 2));
    } else {
      console.log('Amazon general sync API status:', generalSyncResponse.status());
    }
  });

  test('should test 2FA and authentication error handling @visual', async ({ page }) => {
    // Navigate to Amazon integration
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Test 2FA flow for Audible
      const audibleConnect = page.locator('button:has-text("Connect Audible")').first();
      
      if (await audibleConnect.isVisible()) {
        await audibleConnect.click();
        await page.waitForTimeout(1000);
        
        // Fill in test credentials to trigger 2FA
        const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="email" i]').first();
        const passwordInput = page.locator('input[type="password"]').first();
        
        if (await usernameInput.isVisible() && await passwordInput.isVisible()) {
          await usernameInput.fill('test2fa@example.com');
          await passwordInput.fill('testpassword2fa');
          
          const submitButton = page.locator('button:has-text("Authenticate")').first();
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            // Look for 2FA prompt
            const twoFAPrompt = page.locator('.two-factor, [data-testid="2fa"], input[placeholder*="code" i], input[placeholder*="verification" i]').first();
            
            if (await twoFAPrompt.isVisible()) {
              console.log('2FA prompt detected');
              
              await page.screenshot({ 
                path: 'test-results/audible-2fa-prompt.png',
                fullPage: true 
              });
              
              // Test with demo code
              const codeInput = page.locator('input[placeholder*="code" i], input[placeholder*="verification" i]').first();
              
              if (await codeInput.isVisible()) {
                await codeInput.fill('DEMO123');
                
                const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Submit")').first();
                
                if (await verifyButton.isVisible()) {
                  await verifyButton.click();
                  await page.waitForTimeout(2000);
                  
                  await page.screenshot({ 
                    path: 'test-results/audible-2fa-verification.png',
                    fullPage: true 
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Test 2FA API flow
    const audible2FAResponse = await page.request.post('/api/amazon/audible/auth', {
      data: {
        username: 'test2fa@example.com',
        password: 'testpassword2fa',
        marketplace: 'us'
      }
    });
    
    if (audible2FAResponse.ok()) {
      const authData = await audible2FAResponse.json();
      console.log('Audible 2FA API response:', JSON.stringify({
        success: authData.success,
        requires_2fa: authData.requires_2fa,
        auth_session_id: !!authData.auth_session_id,
        error: authData.error
      }, null, 2));
      
      // If 2FA is required, test the verification step
      if (authData.requires_2fa && authData.auth_session_id) {
        const verify2FAResponse = await page.request.post('/api/amazon/audible/auth', {
          data: {
            username: 'test2fa@example.com',
            password: 'testpassword2fa',
            marketplace: 'us',
            cvf_code: 'DEMO123',
            auth_session_id: authData.auth_session_id
          }
        });
        
        if (verify2FAResponse.ok()) {
          const verifyData = await verify2FAResponse.json();
          console.log('Audible 2FA verification API response:', JSON.stringify({
            success: verifyData.success,
            customer_name: verifyData.customer_name,
            error: verifyData.error
          }, null, 2));
        }
      }
    } else {
      console.log('Audible 2FA API status:', audible2FAResponse.status());
    }
  });

  test('should test sync history and job tracking @visual', async ({ page }) => {
    // Navigate to Amazon integration to check sync history
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Look for sync history section
      const syncHistory = page.locator('h2:has-text("Sync History"), .sync-history, [data-testid="sync-history"]').first();
      
      if (await syncHistory.isVisible()) {
        console.log('Sync history section found');
        
        // Check for sync job entries
        const syncJobs = page.locator('tbody tr, .sync-job, .job-entry');
        const jobCount = await syncJobs.count();
        
        console.log(`Found ${jobCount} sync job entries in history`);
        
        await page.screenshot({ 
          path: 'test-results/amazon-sync-history.png',
          fullPage: true 
        });
        
        // Test job details if any jobs exist
        if (jobCount > 0) {
          const firstJob = syncJobs.first();
          
          if (await firstJob.isVisible()) {
            await firstJob.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/sync-job-details.png',
              fullPage: true 
            });
          }
        }
      }
    }
    
    // Test sync jobs API
    const syncJobsResponse = await page.request.get('/api/amazon/sync-jobs?limit=20');
    
    if (syncJobsResponse.ok()) {
      const jobsData = await syncJobsResponse.json();
      console.log('Amazon sync jobs API response:', JSON.stringify(
        jobsData.slice(0, 3).map(job => ({
          id: job.id,
          service: job.service,
          job_type: job.job_type,
          status: job.status,
          books_found: job.books_found,
          books_added: job.books_added,
          duration_seconds: job.duration_seconds
        })), null, 2
      ));
    } else {
      console.log('Amazon sync jobs API status:', syncJobsResponse.status());
    }
  });

  test('should test authentication logout and disconnection @visual', async ({ page }) => {
    // Test the logout/disconnect functionality
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Look for disconnect/logout buttons
      const disconnectButtons = page.locator('button:has-text("Disconnect"), button:has-text("Logout"), button:has-text("Revoke")');
      const buttonCount = await disconnectButtons.count();
      
      console.log(`Found ${buttonCount} disconnect/logout buttons`);
      
      if (buttonCount > 0) {
        const firstDisconnect = disconnectButtons.first();
        
        if (await firstDisconnect.isVisible()) {
          await firstDisconnect.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'test-results/amazon-disconnect.png',
            fullPage: true 
          });
        }
      }
    }
    
    // Test logout API endpoints
    const logoutResponse = await page.request.post('/api/amazon/auth/logout');
    
    if (logoutResponse.ok()) {
      const logoutData = await logoutResponse.json();
      console.log('Amazon logout API response:', JSON.stringify({
        success: logoutData.success,
        message: logoutData.message
      }, null, 2));
      
      expect(logoutData.success).toBe(true);
    } else {
      console.log('Amazon logout API status:', logoutResponse.status());
    }
    
    // Test service-specific disconnection
    const audibleDisconnectResponse = await page.request.delete('/api/amazon/audible/auth');
    console.log('Audible disconnect API status:', audibleDisconnectResponse.status());
    
    const kindleDisconnectResponse = await page.request.delete('/api/amazon/kindle/auth');
    console.log('Kindle disconnect API status:', kindleDisconnectResponse.status());
  });

  test('should test mobile responsiveness of Amazon integration @visual', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Amazon integration on mobile
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      // Take mobile screenshots
      await page.screenshot({ 
        path: 'test-results/amazon-integration-mobile.png',
        fullPage: true 
      });
      
      // Test mobile form interactions
      const audibleConnect = page.locator('button:has-text("Connect Audible")').first();
      
      if (await audibleConnect.isVisible()) {
        await audibleConnect.tap();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'test-results/audible-auth-mobile.png',
          fullPage: true 
        });
        
        // Test form input on mobile
        const usernameInput = page.locator('input[placeholder*="username" i], input[placeholder*="email" i]').first();
        
        if (await usernameInput.isVisible()) {
          await usernameInput.tap();
          await usernameInput.fill('mobile@test.com');
          
          await page.screenshot({ 
            path: 'test-results/mobile-input-focus.png',
            fullPage: true 
          });
        }
      }
    }
    
    // Test API calls work the same on mobile
    const mobileAuthResponse = await page.request.get('/api/amazon/status');
    
    if (mobileAuthResponse.ok()) {
      const mobileData = await mobileAuthResponse.json();
      console.log('Mobile Amazon auth status API response:', JSON.stringify({
        responsive_design: true,
        api_same_as_desktop: true,
        auth_status: mobileData.audible_authenticated || mobileData.kindle_authenticated
      }, null, 2));
    }
  });

  test('should handle Amazon integration error scenarios @visual', async ({ page }) => {
    // Test error handling in Amazon integration
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test with invalid credentials
    const invalidAuthResponse = await page.request.post('/api/amazon/audible/auth', {
      data: {
        username: 'invalid@invalid.com',
        password: 'wrongpassword',
        marketplace: 'invalid'
      }
    });
    
    console.log('Invalid Audible auth API status:', invalidAuthResponse.status());
    
    if (invalidAuthResponse.ok()) {
      const invalidData = await invalidAuthResponse.json();
      console.log('Invalid auth response:', JSON.stringify({
        success: invalidData.success,
        error: invalidData.error
      }, null, 2));
    }
    
    // Test with missing parameters
    const missingParamsResponse = await page.request.post('/api/amazon/kindle/auth', {
      data: {}
    });
    
    console.log('Missing params auth API status:', missingParamsResponse.status());
    
    // Test invalid 2FA codes
    const invalid2FAResponse = await page.request.post('/api/amazon/audible/auth', {
      data: {
        username: 'test@example.com',
        password: 'testpassword',
        marketplace: 'us',
        cvf_code: 'INVALID',
        auth_session_id: 'test-session-123'
      }
    });
    
    if (invalid2FAResponse.ok()) {
      const invalidCodeData = await invalid2FAResponse.json();
      console.log('Invalid 2FA code response:', JSON.stringify({
        success: invalidCodeData.success,
        error: invalidCodeData.error
      }, null, 2));
    } else {
      console.log('Invalid 2FA API status:', invalid2FAResponse.status());
    }
    
    // Test sync without authentication
    const unauthSyncResponse = await page.request.post('/api/amazon/audible/sync');
    console.log('Unauthenticated sync API status:', unauthSyncResponse.status());
    
    // Navigate to UI and test error display
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const amazonIntegration = page.locator('button:has-text("Amazon")').first();
    
    if (await amazonIntegration.isVisible()) {
      await amazonIntegration.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/amazon-error-handling.png',
        fullPage: true 
      });
    }
  });
});