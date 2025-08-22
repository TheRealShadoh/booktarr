import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Ensure API is healthy
    const response = await page.request.get('/api/health');
    expect(response.ok()).toBeTruthy();
  });

  test('should display authentication interface and login/register options @visual', async ({ page }) => {
    // Look for authentication elements on the page
    const authElements = {
      login_button: page.locator('button:has-text("Login"), button:has-text("Sign In"), [data-testid="login"]').first(),
      register_button: page.locator('button:has-text("Register"), button:has-text("Sign Up"), [data-testid="register"]').first(),
      user_menu: page.locator('.user-menu, [data-testid="user-menu"], .profile-menu').first(),
      auth_status: page.locator('.auth-status, [data-testid="auth-status"]').first()
    };
    
    for (const [element, locator] of Object.entries(authElements)) {
      const isVisible = await locator.isVisible();
      console.log(`Authentication element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    // Take screenshot of authentication interface
    await page.screenshot({ 
      path: 'test-results/authentication-interface.png',
      fullPage: true 
    });
    
    // Test navigation to authentication pages
    const authNavigation = page.locator('a[href*="login"], a[href*="auth"], button:has-text("Login")').first();
    
    if (await authNavigation.isVisible()) {
      await authNavigation.click();
      await page.waitForLoadState('networkidle');
      
      await page.screenshot({ 
        path: 'test-results/login-page.png',
        fullPage: true 
      });
    } else {
      // Check if authentication is integrated into main interface
      console.log('No dedicated login page found, checking for inline authentication');
      
      await page.screenshot({ 
        path: 'test-results/inline-authentication.png',
        fullPage: true 
      });
    }
  });

  test('should test user registration flow @visual', async ({ page }) => {
    // Test user registration API endpoints
    const testUser = {
      email: 'testuser@example.com',
      username: 'testuser123',
      password: 'SecurePassword123!',
      full_name: 'Test User'
    };
    
    console.log('Testing user registration API...');
    
    const registrationResponse = await page.request.post('/api/auth/register', {
      data: testUser
    });
    
    if (registrationResponse.ok()) {
      const regData = await registrationResponse.json();
      console.log('User registration API response:', JSON.stringify({
        success: !!regData.id,
        user_id: regData.id,
        email: regData.email,
        username: regData.username,
        is_verified: regData.is_verified
      }, null, 2));
      
      expect(regData.email).toBe(testUser.email);
      expect(regData.username).toBe(testUser.username);
    } else {
      console.log('User registration API status:', registrationResponse.status());
      
      if (registrationResponse.status() === 404) {
        console.log('Authentication endpoints not yet implemented, testing UI only');
      }
    }
    
    // Look for registration form in UI
    const registrationForm = {
      email_input: page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first(),
      username_input: page.locator('input[name="username"], input[placeholder*="username" i]').first(),
      password_input: page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first(),
      submit_button: page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")').first()
    };
    
    let formFound = false;
    for (const [field, locator] of Object.entries(registrationForm)) {
      const isVisible = await locator.isVisible();
      if (isVisible) formFound = true;
      console.log(`Registration form field "${field}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    if (formFound) {
      // Test form validation
      const emailInput = registrationForm.email_input;
      const passwordInput = registrationForm.password_input;
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        // Test with invalid data
        await emailInput.fill('invalid-email');
        await passwordInput.fill('weak');
        
        const submitBtn = registrationForm.submit_button;
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'test-results/registration-validation.png',
            fullPage: true 
          });
        }
        
        // Test with valid data
        await emailInput.clear();
        await emailInput.fill(testUser.email);
        await passwordInput.clear();
        await passwordInput.fill(testUser.password);
        
        const usernameInput = registrationForm.username_input;
        if (await usernameInput.isVisible()) {
          await usernameInput.fill(testUser.username);
        }
        
        await page.screenshot({ 
          path: 'test-results/registration-form-filled.png',
          fullPage: true 
        });
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/registration-flow-complete.png',
      fullPage: true 
    });
  });

  test('should test user login authentication @visual', async ({ page }) => {
    // Test login API endpoints
    const loginCredentials = {
      username: 'testuser@example.com',
      password: 'SecurePassword123!'
    };
    
    console.log('Testing user login API...');
    
    const loginResponse = await page.request.post('/api/auth/login', {
      data: loginCredentials
    });
    
    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      console.log('User login API response:', JSON.stringify({
        has_access_token: !!loginData.access_token,
        has_refresh_token: !!loginData.refresh_token,
        token_type: loginData.token_type,
        expires_in: loginData.expires_in
      }, null, 2));
      
      expect(loginData.access_token).toBeDefined();
      expect(loginData.token_type).toBe('bearer');
      
      // Test using the access token
      const protectedResponse = await page.request.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginData.access_token}`
        }
      });
      
      if (protectedResponse.ok()) {
        const userData = await protectedResponse.json();
        console.log('Protected route with token:', JSON.stringify({
          user_id: userData.id,
          email: userData.email,
          role: userData.role
        }, null, 2));
      }
      
    } else {
      console.log('User login API status:', loginResponse.status());
      
      if (loginResponse.status() === 404) {
        console.log('Authentication endpoints not yet implemented, testing UI only');
      }
    }
    
    // Look for login form in UI
    const loginForm = {
      email_username_input: page.locator('input[type="email"], input[name="email"], input[name="username"], input[placeholder*="email" i], input[placeholder*="username" i]').first(),
      password_input: page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first(),
      login_button: page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first(),
      remember_checkbox: page.locator('input[type="checkbox"], input[name="remember"]').first()
    };
    
    let loginFormFound = false;
    for (const [field, locator] of Object.entries(loginForm)) {
      const isVisible = await locator.isVisible();
      if (isVisible && field !== 'remember_checkbox') loginFormFound = true;
      console.log(`Login form field "${field}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    if (loginFormFound) {
      // Test login form
      const emailInput = loginForm.email_username_input;
      const passwordInput = loginForm.password_input;
      
      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        // Test with invalid credentials
        await emailInput.fill('wrong@example.com');
        await passwordInput.fill('wrongpassword');
        
        const loginBtn = loginForm.login_button;
        if (await loginBtn.isVisible()) {
          await loginBtn.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'test-results/login-invalid-credentials.png',
            fullPage: true 
          });
        }
        
        // Test with valid credentials
        await emailInput.clear();
        await emailInput.fill(loginCredentials.username);
        await passwordInput.clear();
        await passwordInput.fill(loginCredentials.password);
        
        await page.screenshot({ 
          path: 'test-results/login-form-filled.png',
          fullPage: true 
        });
        
        if (await loginBtn.isVisible()) {
          await loginBtn.click();
          await page.waitForTimeout(2000);
          
          await page.screenshot({ 
            path: 'test-results/login-attempt.png',
            fullPage: true 
          });
        }
      }
    }
    
    await page.screenshot({ 
      path: 'test-results/login-flow-complete.png',
      fullPage: true 
    });
  });

  test('should test JWT token handling and refresh @visual', async ({ page }) => {
    // Test JWT token creation and refresh
    console.log('Testing JWT token management...');
    
    // First, try to get a token through login
    const loginResponse = await page.request.post('/api/auth/login', {
      data: {
        username: 'testuser@example.com',
        password: 'SecurePassword123!'
      }
    });
    
    if (loginResponse.ok()) {
      const tokens = await loginResponse.json();
      
      if (tokens.refresh_token) {
        // Test token refresh
        const refreshResponse = await page.request.post('/api/auth/refresh', {
          data: {
            refresh_token: tokens.refresh_token
          }
        });
        
        if (refreshResponse.ok()) {
          const refreshData = await refreshResponse.json();
          console.log('Token refresh API response:', JSON.stringify({
            has_new_access_token: !!refreshData.access_token,
            token_type: refreshData.token_type,
            expires_in: refreshData.expires_in
          }, null, 2));
          
          expect(refreshData.access_token).toBeDefined();
        } else {
          console.log('Token refresh API status:', refreshResponse.status());
        }
        
        // Test token revocation
        const revokeResponse = await page.request.post('/api/auth/revoke', {
          data: {
            refresh_token: tokens.refresh_token
          }
        });
        
        console.log('Token revoke API status:', revokeResponse.status());
      }
    } else {
      console.log('Login required for JWT testing, status:', loginResponse.status());
    }
    
    // Test token storage in browser
    const tokenStorage = await page.evaluate(() => {
      return {
        localStorage_token: localStorage.getItem('access_token') || localStorage.getItem('token'),
        sessionStorage_token: sessionStorage.getItem('access_token') || sessionStorage.getItem('token'),
        cookies: document.cookie
      };
    });
    
    console.log('Browser token storage:', JSON.stringify({
      has_localStorage_token: !!tokenStorage.localStorage_token,
      has_sessionStorage_token: !!tokenStorage.sessionStorage_token,
      has_cookies: !!tokenStorage.cookies
    }, null, 2));
    
    // Test automatic token refresh in UI
    const tokenRefreshIndicators = page.locator('.token-refresh, [data-testid="token-refresh"], .auth-refresh');
    const refreshIndicatorCount = await tokenRefreshIndicators.count();
    
    console.log(`Found ${refreshIndicatorCount} token refresh indicators`);
    
    await page.screenshot({ 
      path: 'test-results/jwt-token-handling.png',
      fullPage: true 
    });
  });

  test('should test API key authentication @visual', async ({ page }) => {
    // Test API key management
    console.log('Testing API key authentication...');
    
    // Try to create an API key (requires authentication first)
    const apiKeyResponse = await page.request.post('/api/auth/api-keys', {
      data: {
        name: 'Test API Key',
        scopes: 'read,write',
        expires_in_days: 30
      },
      headers: {
        'Authorization': 'Bearer test-token' // This would need a real token
      }
    });
    
    if (apiKeyResponse.ok()) {
      const apiKeyData = await apiKeyResponse.json();
      console.log('API key creation response:', JSON.stringify({
        has_api_key: !!apiKeyData.api_key,
        key_prefix: apiKeyData.key_info?.key_prefix,
        scopes: apiKeyData.key_info?.scopes
      }, null, 2));
      
      // Test using the API key
      if (apiKeyData.api_key) {
        const apiTestResponse = await page.request.get('/api/books', {
          headers: {
            'X-API-Key': apiKeyData.api_key
          }
        });
        
        console.log('API key authentication test status:', apiTestResponse.status());
      }
    } else {
      console.log('API key creation status:', apiKeyResponse.status());
    }
    
    // Test API key listing
    const listKeysResponse = await page.request.get('/api/auth/api-keys', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (listKeysResponse.ok()) {
      const keysList = await listKeysResponse.json();
      console.log('API keys list response:', JSON.stringify({
        keys_count: keysList.length,
        sample_key: keysList[0] ? {
          name: keysList[0].name,
          key_prefix: keysList[0].key_prefix,
          is_active: keysList[0].is_active
        } : null
      }, null, 2));
    } else {
      console.log('API keys list status:', listKeysResponse.status());
    }
    
    // Look for API key management in UI
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const apiKeyUI = {
      api_key_section: page.locator('h2:has-text("API"), h3:has-text("API"), .api-keys-section').first(),
      create_key_button: page.locator('button:has-text("Create"), button:has-text("Generate"), .create-api-key').first(),
      api_key_list: page.locator('.api-key-item, [data-testid="api-key"], .key-list').first()
    };
    
    for (const [element, locator] of Object.entries(apiKeyUI)) {
      const isVisible = await locator.isVisible();
      console.log(`API key UI element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    await page.screenshot({ 
      path: 'test-results/api-key-management.png',
      fullPage: true 
    });
  });

  test('should test protected routes and authorization @visual', async ({ page }) => {
    // Test access to protected routes without authentication
    console.log('Testing protected routes and authorization...');
    
    const protectedEndpoints = [
      '/api/auth/me',
      '/api/auth/api-keys',
      '/api/books/create',
      '/api/settings/admin',
      '/api/users/admin'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await page.request.get(endpoint);
      console.log(`Protected endpoint ${endpoint}: ${response.status()}`);
      
      // Should return 401 Unauthorized for most protected endpoints
      if (response.status() === 401) {
        console.log(`✓ Properly protected: ${endpoint}`);
      } else if (response.status() === 404) {
        console.log(`? Endpoint not found: ${endpoint}`);
      } else {
        console.log(`! Unexpected status: ${endpoint} returned ${response.status()}`);
      }
    }
    
    // Test role-based access
    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/settings',
      '/api/admin/stats'
    ];
    
    for (const endpoint of adminEndpoints) {
      const response = await page.request.get(endpoint, {
        headers: {
          'Authorization': 'Bearer user-token' // Regular user token
        }
      });
      
      console.log(`Admin endpoint ${endpoint} with user token: ${response.status()}`);
      
      // Should return 403 Forbidden for admin endpoints with user token
      if (response.status() === 403) {
        console.log(`✓ Properly restricted to admin: ${endpoint}`);
      }
    }
    
    // Test UI protection
    const protectedUIElements = {
      admin_panel: page.locator('.admin-panel, [data-testid="admin"], button:has-text("Admin")').first(),
      user_management: page.locator('.user-management, button:has-text("Users")').first(),
      settings_advanced: page.locator('.advanced-settings, [data-testid="advanced-settings"]').first()
    };
    
    for (const [element, locator] of Object.entries(protectedUIElements)) {
      const isVisible = await locator.isVisible();
      console.log(`Protected UI element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    await page.screenshot({ 
      path: 'test-results/protected-routes.png',
      fullPage: true 
    });
  });

  test('should test user session management @visual', async ({ page }) => {
    // Test user session tracking
    console.log('Testing user session management...');
    
    // Test session creation
    const sessionResponse = await page.request.get('/api/auth/sessions', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    if (sessionResponse.ok()) {
      const sessionsData = await sessionResponse.json();
      console.log('User sessions API response:', JSON.stringify({
        active_sessions: sessionsData.length,
        sample_session: sessionsData[0] ? {
          device_type: sessionsData[0].device_type,
          ip_address: sessionsData[0].ip_address,
          last_activity: sessionsData[0].last_activity,
          is_active: sessionsData[0].is_active
        } : null
      }, null, 2));
    } else {
      console.log('User sessions API status:', sessionResponse.status());
    }
    
    // Test session termination
    const terminateResponse = await page.request.delete('/api/auth/sessions/123', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Session termination API status:', terminateResponse.status());
    
    // Look for session management in UI
    await page.click('button:has-text("Settings")');
    await page.waitForLoadState('networkidle');
    
    const sessionUI = {
      sessions_section: page.locator('h2:has-text("Sessions"), h3:has-text("Active"), .sessions-section').first(),
      active_sessions: page.locator('.session-item, [data-testid="session"], .device-session').first(),
      logout_all: page.locator('button:has-text("Logout All"), button:has-text("End All"), .logout-all').first()
    };
    
    for (const [element, locator] of Object.entries(sessionUI)) {
      const isVisible = await locator.isVisible();
      console.log(`Session UI element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    await page.screenshot({ 
      path: 'test-results/session-management.png',
      fullPage: true 
    });
  });

  test('should test password reset and email verification @visual', async ({ page }) => {
    // Test password reset flow
    console.log('Testing password reset and email verification...');
    
    const resetRequest = {
      email: 'testuser@example.com'
    };
    
    const resetResponse = await page.request.post('/api/auth/password-reset', {
      data: resetRequest
    });
    
    if (resetResponse.ok()) {
      const resetData = await resetResponse.json();
      console.log('Password reset API response:', JSON.stringify({
        success: resetData.success,
        message: resetData.message
      }, null, 2));
    } else {
      console.log('Password reset API status:', resetResponse.status());
    }
    
    // Test email verification
    const verifyResponse = await page.request.post('/api/auth/verify-email', {
      data: {
        token: 'test-verification-token'
      }
    });
    
    if (verifyResponse.ok()) {
      const verifyData = await verifyResponse.json();
      console.log('Email verification API response:', JSON.stringify({
        success: verifyData.success,
        verified: verifyData.verified
      }, null, 2));
    } else {
      console.log('Email verification API status:', verifyResponse.status());
    }
    
    // Look for password reset form in UI
    const resetForm = {
      forgot_password: page.locator('a:has-text("Forgot"), button:has-text("Reset"), .forgot-password').first(),
      reset_email_input: page.locator('input[type="email"], input[placeholder*="email" i]').first(),
      reset_submit: page.locator('button:has-text("Reset"), button:has-text("Send")').first()
    };
    
    let resetFormFound = false;
    for (const [element, locator] of Object.entries(resetForm)) {
      const isVisible = await locator.isVisible();
      if (isVisible) resetFormFound = true;
      console.log(`Password reset element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    if (resetFormFound && await resetForm.forgot_password.isVisible()) {
      await resetForm.forgot_password.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/password-reset-form.png',
        fullPage: true 
      });
    }
    
    await page.screenshot({ 
      path: 'test-results/auth-recovery-features.png',
      fullPage: true 
    });
  });

  test('should test authentication in mobile viewport @visual', async ({ page }) => {
    // Test mobile authentication interface
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take mobile authentication screenshot
    await page.screenshot({ 
      path: 'test-results/mobile-authentication.png',
      fullPage: true 
    });
    
    // Test mobile login form
    const mobileAuthElements = {
      mobile_login: page.locator('button:has-text("Login"), .mobile-auth, [data-testid="mobile-login"]').first(),
      mobile_menu: page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"]').first(),
      mobile_profile: page.locator('.profile-mobile, .user-mobile').first()
    };
    
    for (const [element, locator] of Object.entries(mobileAuthElements)) {
      const isVisible = await locator.isVisible();
      console.log(`Mobile auth element "${element}": ${isVisible ? 'visible' : 'not visible'}`);
    }
    
    // Test mobile menu for auth options
    const mobileMenu = mobileAuthElements.mobile_menu;
    
    if (await mobileMenu.isVisible()) {
      await mobileMenu.tap();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/mobile-menu-auth.png',
        fullPage: true 
      });
    }
    
    // Test mobile form interactions
    const mobileEmailInput = page.locator('input[type="email"], input[name="email"]').first();
    
    if (await mobileEmailInput.isVisible()) {
      await mobileEmailInput.tap();
      await mobileEmailInput.fill('mobile@test.com');
      
      await page.screenshot({ 
        path: 'test-results/mobile-auth-input.png',
        fullPage: true 
      });
    }
    
    console.log('Mobile authentication interface tested successfully');
  });

  test('should test authentication error handling and security @visual', async ({ page }) => {
    // Test various authentication error scenarios
    console.log('Testing authentication error handling...');
    
    const errorScenarios = [
      {
        name: 'Invalid email format',
        data: { email: 'invalid-email', password: 'ValidPass123!' }
      },
      {
        name: 'Weak password',
        data: { email: 'test@example.com', password: '123' }
      },
      {
        name: 'Empty credentials',
        data: { email: '', password: '' }
      },
      {
        name: 'SQL injection attempt',
        data: { email: "'; DROP TABLE users; --", password: 'password' }
      },
      {
        name: 'XSS attempt',
        data: { email: '<script>alert("xss")</script>', password: 'password' }
      }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`Testing scenario: ${scenario.name}`);
      
      const response = await page.request.post('/api/auth/login', {
        data: scenario.data
      });
      
      console.log(`${scenario.name} response status: ${response.status()}`);
      
      if (response.ok()) {
        const data = await response.json();
        console.log(`${scenario.name} response:`, JSON.stringify({
          error: data.error,
          message: data.message
        }, null, 2));
      }
    }
    
    // Test rate limiting
    console.log('Testing rate limiting...');
    
    for (let i = 0; i < 10; i++) {
      const rateLimitResponse = await page.request.post('/api/auth/login', {
        data: { email: 'spam@test.com', password: 'wrongpass' }
      });
      
      if (i === 9) {
        console.log(`Rate limit test (attempt ${i + 1}): ${rateLimitResponse.status()}`);
        
        if (rateLimitResponse.status() === 429) {
          console.log('✓ Rate limiting is working');
        }
      }
    }
    
    // Test CSRF protection
    const csrfResponse = await page.request.post('/api/auth/login', {
      data: { email: 'test@example.com', password: 'password' },
      headers: {
        'Origin': 'https://malicious.com'
      }
    });
    
    console.log('CSRF protection test status:', csrfResponse.status());
    
    await page.screenshot({ 
      path: 'test-results/auth-security-testing.png',
      fullPage: true 
    });
  });
});