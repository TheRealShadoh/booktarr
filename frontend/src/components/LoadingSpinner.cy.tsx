import React from 'react'
import LoadingSpinner from './LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    cy.mount(<LoadingSpinner />)
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
    cy.get('.animate-spin').should('be.visible')
    cy.contains('Loading...').should('be.visible')
  })

  it('should render with small size', () => {
    cy.mount(<LoadingSpinner size="small" />)
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
    cy.get('.h-4.w-4').should('exist')
  })

  it('should render with large size', () => {
    cy.mount(<LoadingSpinner size="large" />)
    cy.get('[data-testid="loading-spinner"]').should('be.visible')
    cy.get('.h-12.w-12').should('exist')
  })

  it('should display custom message', () => {
    const message = 'Loading books...'
    cy.mount(<LoadingSpinner message={message} />)
    cy.contains(message).should('be.visible')
  })

  it('should have spinning animation', () => {
    cy.mount(<LoadingSpinner />)
    cy.get('.animate-spin').should('have.class', 'animate-spin')
  })
})