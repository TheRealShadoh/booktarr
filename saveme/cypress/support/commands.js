// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to navigate to a page
Cypress.Commands.add('navigateTo', (page) => {
  cy.get('nav').within(() => {
    cy.contains(page).click()
  })
  cy.url().should('include', page.toLowerCase())
})

// Custom command to wait for loading to complete
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist')
})

// Custom command to check for toast messages
Cypress.Commands.add('checkToast', (message, type = 'success') => {
  cy.get('[data-testid="toast"]', { timeout: 5000 })
    .should('be.visible')
    .and('contain.text', message)
    .and('have.class', `toast-${type}`)
})

// Custom command to search for books
Cypress.Commands.add('searchBooks', (query) => {
  cy.get('[data-testid="search-input"]').clear().type(query)
  cy.get('[data-testid="search-button"]').click()
})

// Custom command to wait for API to be ready
Cypress.Commands.add('waitForAPI', () => {
  cy.request({
    url: 'http://localhost:8000/health',
    retryOnStatusCodeFailure: true,
    timeout: 30000
  }).then((response) => {
    expect(response.status).to.eq(200)
  })
})

// Custom command to reset settings to default state
Cypress.Commands.add('resetSettings', () => {
  cy.request('POST', 'http://localhost:8000/api/settings/reset')
    .then((response) => {
      expect(response.status).to.eq(200)
    })
})

// Custom command to check API response
Cypress.Commands.add('checkAPIResponse', (url, expectedStatus = 200) => {
  cy.request({
    url: `http://localhost:8000${url}`,
    failOnStatusCode: false
  }).then((response) => {
    expect(response.status).to.eq(expectedStatus)
  })
})

// Custom command to intercept and mock API calls
Cypress.Commands.add('mockAPICall', (method, url, response, statusCode = 200) => {
  cy.intercept(method, url, {
    statusCode: statusCode,
    body: response
  })
})

// Custom command to wait for elements to be visible
Cypress.Commands.add('waitForVisible', (selector, timeout = 10000) => {
  cy.get(selector, { timeout }).should('be.visible')
})

// Custom command to check for error messages
Cypress.Commands.add('checkError', (message) => {
  cy.get('[data-testid="error-message"]', { timeout: 5000 })
    .should('be.visible')
    .and('contain.text', message)
})

// Custom command to take screenshots with context
Cypress.Commands.add('takeScreenshot', (name, description) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}_${timestamp}`;
  cy.screenshot(filename, { 
    capture: 'fullPage',
    onAfterScreenshot: (el, props) => {
      // Log screenshot taken
      cy.log(`Screenshot taken: ${filename}${description ? ` - ${description}` : ''}`);
    }
  });
})

// Custom command to take screenshot after each click
Cypress.Commands.add('clickAndScreenshot', (selector, screenshotName) => {
  cy.get(selector).click();
  cy.wait(500); // Wait for any animations
  cy.takeScreenshot(screenshotName, `After clicking ${selector}`);
})

// Custom command to navigate and screenshot
Cypress.Commands.add('navigateAndScreenshot', (page, screenshotName) => {
  cy.navigateTo(page);
  cy.wait(2000); // Wait for page to load
  cy.takeScreenshot(screenshotName || `page_${page.toLowerCase()}`, `${page} page loaded`);
})

// Custom command to test all sidebar navigation with screenshots
Cypress.Commands.add('testSidebarNavigation', () => {
  const sidebarItems = [
    'Library', 'Series', 'Authors', 'Enhancement', 'Wanted', 'Import', 
    'Amazon Sync', 'Collections', 'Advanced Search', 'Recommendations', 
    'Challenges', 'Share & Export', 'Reading Timeline', 'Settings', 
    'Statistics', 'Analytics', 'Bulk Edit', 'Backup', 'System'
  ];
  
  sidebarItems.forEach(item => {
    cy.log(`Testing navigation to ${item}`);
    cy.navigateAndScreenshot(item, `sidebar_${item.toLowerCase().replace(/\s+/g, '_')}`);
  });
})

// Custom command to test all clickable elements on a page
Cypress.Commands.add('testClickableElements', (pageName) => {
  cy.get('button, a, [role="button"], [tabindex="0"]').each(($el, index) => {
    const text = $el.text().trim() || $el.attr('title') || $el.attr('aria-label') || `element_${index}`;
    const screenshotName = `${pageName}_clickable_${text.toLowerCase().replace(/\s+/g, '_')}_${index}`;
    
    // Only click if element is visible and enabled
    if ($el.is(':visible') && !$el.is(':disabled')) {
      cy.wrap($el).click({ force: true });
      cy.wait(300);
      cy.takeScreenshot(screenshotName, `Clicked ${text} on ${pageName}`);
    }
  });
})

// Custom command to wait for page to be fully loaded
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('body').should('be.visible');
  cy.get('[data-testid="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  cy.wait(1000); // Additional wait for any animations
})