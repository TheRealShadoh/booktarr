import React from 'react'
import Toast from './Toast'

describe('Toast Component', () => {
  it('should render success toast', () => {
    cy.mount(
      <Toast 
        message="Operation successful!" 
        type="success" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('be.visible')
    cy.contains('Operation successful!').should('be.visible')
    cy.get('[data-testid="toast"]').should('have.class', 'toast-success')
  })

  it('should render error toast', () => {
    cy.mount(
      <Toast 
        message="Something went wrong!" 
        type="error" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('be.visible')
    cy.contains('Something went wrong!').should('be.visible')
    cy.get('[data-testid="toast"]').should('have.class', 'toast-error')
  })

  it('should render warning toast', () => {
    cy.mount(
      <Toast 
        message="This is a warning!" 
        type="warning" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('be.visible')
    cy.contains('This is a warning!').should('be.visible')
    cy.get('[data-testid="toast"]').should('have.class', 'toast-warning')
  })

  it('should render info toast', () => {
    cy.mount(
      <Toast 
        message="Here's some information" 
        type="info" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('be.visible')
    cy.contains('Here\'s some information').should('be.visible')
    cy.get('[data-testid="toast"]').should('have.class', 'toast-info')
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = cy.stub()
    
    cy.mount(
      <Toast 
        message="Test message" 
        type="success" 
        onClose={onClose} 
      />
    )
    
    cy.get('[data-testid="toast-close"]').click()
    cy.then(() => {
      expect(onClose).to.have.been.called
    })
  })

  it('should have proper icon for success toast', () => {
    cy.mount(
      <Toast 
        message="Success!" 
        type="success" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').within(() => {
      cy.get('svg').should('be.visible') // Check icon is present
    })
  })

  it('should have proper icon for error toast', () => {
    cy.mount(
      <Toast 
        message="Error!" 
        type="error" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').within(() => {
      cy.get('svg').should('be.visible') // Check icon is present
    })
  })

  it('should be positioned fixed in top-right', () => {
    cy.mount(
      <Toast 
        message="Test" 
        type="success" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('have.class', 'fixed')
    cy.get('[data-testid="toast"]').should('have.class', 'top-4')
    cy.get('[data-testid="toast"]').should('have.class', 'right-4')
  })

  it('should have high z-index for proper layering', () => {
    cy.mount(
      <Toast 
        message="Test" 
        type="success" 
        onClose={() => {}} 
      />
    )
    
    cy.get('[data-testid="toast"]').should('have.class', 'z-[60]')
  })
})