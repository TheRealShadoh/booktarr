import React from 'react'
import SearchBar from './SearchBar'

describe('SearchBar Component', () => {
  it('should render search input and button', () => {
    cy.mount(
      <SearchBar 
        onSearch={() => {}}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-input"]').should('be.visible')
    cy.get('[data-testid="search-button"]').should('be.visible')
  })

  it('should display placeholder text', () => {
    cy.mount(
      <SearchBar 
        onSearch={() => {}}
        placeholder="Search for your favorite books"
      />
    )
    
    cy.get('[data-testid="search-input"]')
      .should('have.attr', 'placeholder', 'Search for your favorite books')
  })

  it('should display controlled value in input', () => {
    cy.mount(
      <SearchBar 
        value="Harry Potter"
        onSearch={() => {}}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-input"]').should('have.value', 'Harry Potter')
  })

  it('should call onSearch when search button is clicked', () => {
    const onSearch = cy.stub()
    
    cy.mount(
      <SearchBar 
        onSearch={onSearch}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-input"]').type('Harry Potter')
    cy.get('[data-testid="search-button"]').click()
    cy.then(() => {
      expect(onSearch).to.have.been.calledWith('Harry Potter')
    })
  })

  it('should call onSearch when Enter key is pressed', () => {
    const onSearch = cy.stub()
    
    cy.mount(
      <SearchBar 
        onSearch={onSearch}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-input"]').type('Harry Potter{enter}')
    cy.then(() => {
      expect(onSearch).to.have.been.calledWith('Harry Potter')
    })
  })

  it('should handle empty search', () => {
    const onSearch = cy.stub()
    
    cy.mount(
      <SearchBar 
        onSearch={onSearch}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-button"]').click()
    cy.then(() => {
      expect(onSearch).to.have.been.calledWith('')
    })
  })

  it('should have search icon in button', () => {
    cy.mount(
      <SearchBar 
        onSearch={() => {}}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-button"]').within(() => {
      cy.get('svg').should('be.visible')
    })
  })

  it('should update internal state when typing', () => {
    cy.mount(
      <SearchBar 
        onSearch={() => {}}
        placeholder="Search books..."
      />
    )
    
    cy.get('[data-testid="search-input"]').type('Game of Thrones')
    cy.get('[data-testid="search-input"]').should('have.value', 'Game of Thrones')
  })
})