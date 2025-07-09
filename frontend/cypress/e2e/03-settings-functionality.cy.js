describe('Settings Functionality', () => {
  beforeEach(() => {
    cy.waitForAPI()
    cy.resetSettings()
    cy.visit('/')
    cy.navigateTo('Settings')
  })

  it('should display settings page correctly', () => {
    cy.contains('Settings').should('be.visible')
    cy.contains('Skoolib Configuration').should('be.visible')
    cy.contains('API Configuration').should('be.visible')
    cy.contains('Application Settings').should('be.visible')
  })

  it('should display current settings values', () => {
    cy.get('[data-testid="skoolib-url-input"]').should('have.value', '')
    cy.get('[data-testid="google-api-key-input"]').should('have.value', '')
    cy.get('[data-testid="cache-ttl-input"]').should('have.value', '3600')
    cy.get('[data-testid="default-language-select"]').should('have.value', 'en')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').should('be.checked')
  })

  it('should update cache TTL setting', () => {
    cy.get('[data-testid="cache-ttl-input"]').clear().type('7200')
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.checkToast('Settings updated successfully!', 'success')
    cy.get('[data-testid="cache-ttl-input"]').should('have.value', '7200')
  })

  it('should update language setting', () => {
    cy.get('[data-testid="default-language-select"]').select('fr')
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.checkToast('Settings updated successfully!', 'success')
    cy.get('[data-testid="default-language-select"]').should('have.value', 'fr')
  })

  it('should toggle price lookup setting', () => {
    cy.get('[data-testid="enable-price-lookup-checkbox"]').uncheck()
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.checkToast('Settings updated successfully!', 'success')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').should('not.be.checked')
  })

  it('should validate Skoolib URL', () => {
    cy.get('[data-testid="skoolib-url-input"]').type('https://example.com')
    cy.get('[data-testid="validate-url-button"]').click()
    
    cy.contains('Validating...').should('be.visible')
    cy.checkToast('Found 0 books', 'success')
  })

  it('should handle invalid Skoolib URL', () => {
    cy.get('[data-testid="skoolib-url-input"]').type('invalid-url')
    cy.get('[data-testid="validate-url-button"]').click()
    
    cy.contains('Validating...').should('be.visible')
    cy.checkToast('URL must start with http', 'error')
  })

  it('should validate cache TTL limits', () => {
    cy.get('[data-testid="cache-ttl-input"]').clear().type('30')
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.contains('Cache TTL must be between 60 and 86400 seconds').should('be.visible')
  })

  it('should save Google Books API key', () => {
    cy.get('[data-testid="google-api-key-input"]').type('test-api-key')
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.checkToast('Settings updated successfully!', 'success')
    cy.get('[data-testid="google-api-key-input"]').should('have.value', 'test-api-key')
  })

  it('should save complete settings form', () => {
    cy.get('[data-testid="skoolib-url-input"]').type('https://example.com/share')
    cy.get('[data-testid="google-api-key-input"]').type('test-key')
    cy.get('[data-testid="cache-ttl-input"]').clear().type('7200')
    cy.get('[data-testid="default-language-select"]').select('fr')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').uncheck()
    
    cy.get('[data-testid="save-settings-button"]').click()
    
    cy.checkToast('Settings updated successfully!', 'success')
    
    // Verify all settings were saved
    cy.get('[data-testid="skoolib-url-input"]').should('have.value', 'https://example.com/share')
    cy.get('[data-testid="google-api-key-input"]').should('have.value', 'test-key')
    cy.get('[data-testid="cache-ttl-input"]').should('have.value', '7200')
    cy.get('[data-testid="default-language-select"]').should('have.value', 'fr')
    cy.get('[data-testid="enable-price-lookup-checkbox"]').should('not.be.checked')
  })
})