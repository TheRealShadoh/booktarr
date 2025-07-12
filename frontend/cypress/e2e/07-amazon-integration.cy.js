describe('Amazon Integration Tests', () => {
  beforeEach(() => {
    // Visit the Amazon Sync page
    cy.visit('http://localhost:3000');
    cy.wait(3000);
    
    // Navigate to Amazon Sync page via sidebar
    cy.get('nav', { timeout: 10000 }).should('be.visible');
    cy.contains('Amazon Sync', { timeout: 10000 }).should('be.visible').click({ force: true });
    cy.wait(2000);
  });

  it('should display Amazon Sync page with all sections', () => {
    // Check page title
    cy.contains('Amazon Integration').should('be.visible');
    cy.contains('Sync your Audible and Kindle libraries with Booktarr').should('be.visible');

    // Check Audible section
    cy.contains('Audible').should('be.visible');
    cy.contains('Not Connected').should('be.visible');
    cy.contains('Connect Audible Account').should('be.visible');

    // Check Kindle section
    cy.contains('Kindle').should('be.visible');
    cy.contains('Import Method').should('be.visible');
    cy.contains('CSV File').should('be.visible');
    cy.contains('JSON File').should('be.visible');
    cy.contains('Device Scan').should('be.visible');

    // Check Sync History section
    cy.contains('Sync History').should('be.visible');
  });

  it('should display Audible authentication form when connect button is clicked', () => {
    // Click connect Audible account
    cy.contains('Connect Audible Account').click();
    cy.wait(1000);

    // Check authentication form is displayed
    cy.contains('Username/Email').should('be.visible');
    cy.contains('Password').should('be.visible');
    cy.contains('Marketplace').should('be.visible');
    
    // Check marketplace options
    cy.get('select').should('contain.text', 'United States');
    cy.get('select').should('contain.text', 'United Kingdom');
    cy.get('select').should('contain.text', 'Germany');

    // Check form buttons
    cy.contains('Authenticate').should('be.visible');
    cy.contains('Cancel').should('be.visible');

    // Test cancel functionality
    cy.contains('Cancel').click();
    cy.contains('Connect Audible Account').should('be.visible');
  });

  it('should handle Kindle CSV file selection and display correct form', () => {
    // Make sure CSV is selected by default
    cy.get('input[value="csv"]').should('be.checked');
    
    // Check CSV form elements
    cy.contains('Select CSV File').should('be.visible');
    cy.get('input[type="file"][accept=".csv"]').should('exist');
    cy.contains('Import Kindle Library').should('be.visible');
  });

  it('should switch between Kindle import methods correctly', () => {
    // Test CSV method (default)
    cy.get('input[value="csv"]').should('be.checked');
    cy.contains('Select CSV File').should('be.visible');
    cy.get('input[type="file"][accept=".csv"]').should('exist');

    // Switch to JSON method
    cy.get('input[value="json"]').check();
    cy.contains('Select JSON File').should('be.visible');
    cy.get('input[type="file"][accept=".json"]').should('exist');

    // Switch to Device Scan method
    cy.get('input[value="device"]').check();
    cy.contains('Kindle Device Path').should('be.visible');
    cy.get('input[type="text"]').should('have.value', '/media/kindle');
  });

  it('should load and display authentication status', () => {
    // Wait for status to load
    cy.wait(3000);
    
    // Check that status indicators are displayed
    cy.get('.booktarr-card').should('have.length.at.least', 2);
    
    // Audible and Kindle sections should show connection status
    cy.contains('Not Connected').should('be.visible');
  });

  it('should load and display sync jobs if any exist', () => {
    // Wait for sync jobs to load
    cy.wait(3000);
    
    // Check sync history table structure
    cy.contains('Sync History').should('be.visible');
    cy.contains('Service').should('be.visible');
    cy.contains('Type').should('be.visible');
    cy.contains('Status').should('be.visible');
    cy.contains('Books').should('be.visible');
    cy.contains('Duration').should('be.visible');
    cy.contains('Started').should('be.visible');
  });

  it('should test Audible authentication form validation', () => {
    // Open authentication form
    cy.contains('Connect Audible Account').click();
    cy.wait(1000);

    // Try to submit empty form
    cy.contains('Authenticate').click();
    
    // Form should not submit (HTML5 validation will prevent it)
    cy.contains('Username/Email').should('be.visible');

    // Fill in partial information
    cy.get('input[type="text"]').first().type('test@example.com');
    cy.contains('Authenticate').click();
    
    // Password should still be required
    cy.contains('Password').should('be.visible');
  });

  it('should test Kindle file upload validation', () => {
    // Make sure CSV method is selected
    cy.get('input[value="csv"]').check();
    
    // Try to submit without file
    cy.contains('Import Kindle Library').click();
    
    // File input should be required (HTML5 validation)
    cy.get('input[type="file"]').should('have.attr', 'required');
  });

  it('should test marketplace selection for Audible', () => {
    // Open authentication form
    cy.contains('Connect Audible Account').click();
    cy.wait(1000);

    // Test marketplace dropdown
    cy.get('select').select('uk');
    cy.get('select').should('have.value', 'uk');
    
    cy.get('select').select('de');
    cy.get('select').should('have.value', 'de');
    
    cy.get('select').select('us');
    cy.get('select').should('have.value', 'us');
  });

  it('should handle loading states appropriately', () => {
    // The page should show loading initially then content
    cy.get('.booktarr-card').should('be.visible');
    
    // All sections should be rendered without loading spinners
    cy.get('.animate-spin').should('not.exist');
  });

  it('should test responsive design elements', () => {
    // Test on different viewport sizes
    cy.viewport(1200, 800);
    cy.get('.grid-cols-1.lg\\:grid-cols-2').should('be.visible');
    
    cy.viewport(768, 600);
    cy.get('.booktarr-card').should('be.visible');
    
    cy.viewport(375, 667);
    cy.get('.booktarr-card').should('be.visible');
  });

  it('should have proper accessibility elements', () => {
    // Check for proper labels
    cy.get('label').should('exist');
    
    // Check for proper form structure
    cy.get('form').should('exist');
    
    // Check for proper heading hierarchy
    cy.get('h1').should('contain', 'Amazon Integration');
    cy.get('h2').should('contain', 'Audible');
    cy.get('h2').should('contain', 'Kindle');
  });

  // Test API integration (if backend is available)
  it('should test API endpoints integration', () => {
    // Test status endpoint
    cy.request('GET', 'http://localhost:8000/api/amazon/status').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('audible_authenticated');
      expect(response.body).to.have.property('kindle_authenticated');
    });

    // Test sync jobs endpoint
    cy.request('GET', 'http://localhost:8000/api/amazon/sync-jobs?limit=5').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.be.an('array');
    });
  });

  // Simulate CSV file upload (with mock file)
  it('should simulate Kindle CSV import workflow', () => {
    // Select CSV import method
    cy.get('input[value="csv"]').check();
    
    // Create a mock CSV file content
    const csvContent = 'Title,Author,ASIN,Description\\nTest Book,Test Author,B0TEST123,Test Description';
    
    // Simulate file selection (using fixture or creating blob)
    cy.get('input[type="file"]').then(input => {
      const file = new File([csvContent], 'test_library.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input[0].files = dataTransfer.files;
      
      // Trigger change event
      cy.wrap(input).trigger('change', { force: true });
    });

    // The import button should be available
    cy.contains('Import Kindle Library').should('be.visible');
  });
});