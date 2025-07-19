import React from 'react'
import ErrorMessage from './ErrorMessage'

describe('ErrorMessage Component', () => {
  it('should render error message', () => {
    cy.mount(<ErrorMessage error="Something went wrong!" />)
    
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.contains('Something went wrong!').should('be.visible')
  })

  it('should display error icon', () => {
    cy.mount(<ErrorMessage error="Error occurred" />)
    
    cy.get('[data-testid="error-message"]').within(() => {
      cy.get('svg').should('be.visible') // Error icon
    })
  })

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = cy.stub()
    
    cy.mount(
      <ErrorMessage 
        error="Network error" 
        onRetry={onRetry}
      />
    )
    
    cy.contains('Retry').click()
    cy.then(() => {
      expect(onRetry).to.have.been.called
    })
  })

  it('should not show retry button when onRetry is not provided', () => {
    cy.mount(<ErrorMessage error="Error occurred" />)
    
    cy.contains('Retry').should('not.exist')
  })

  it('should show retry button when onRetry is provided', () => {
    cy.mount(
      <ErrorMessage 
        error="Network error" 
        onRetry={() => {}}
      />
    )
    
    cy.contains('Retry').should('be.visible')
  })

  it('should handle APIError objects', () => {
    const apiError = {
      message: 'API Error',
      status: 500,
      detail: 'Internal server error'
    }
    
    cy.mount(<ErrorMessage error={apiError} />)
    
    cy.contains('API Error').should('be.visible')
    cy.contains('Internal server error').should('be.visible')
  })

  it('should handle long error messages', () => {
    const longMessage = 'This is a very long error message that should still be displayed properly and not break the layout of the component or the page it is on.'
    
    cy.mount(<ErrorMessage error={longMessage} />)
    
    cy.contains(longMessage).should('be.visible')
    cy.get('[data-testid="error-message"]').should('be.visible')
  })
})