import React from 'react'
import BookCard from './BookCard'
import { Book, MetadataSource, ReadingStatus } from '../types'

describe('BookCard Component', () => {
  const mockBook: Book = {
    isbn: '9780553103540',
    title: 'A Game of Thrones',
    authors: ['George R. R. Martin'],
    series: 'A Song of Ice and Fire',
    series_position: 1,
    publisher: 'Bantam',
    published_date: '1996-08-01',
    page_count: 694,
    language: 'en',
    thumbnail_url: undefined,
    description: 'The first book in the landmark series that has redefined imaginative fiction.',
    categories: ['Fantasy', 'Fiction', 'Epic Fantasy'],
    pricing: [],
    metadata_source: MetadataSource.GOOGLE_BOOKS,
    added_date: '2025-07-10T23:56:01.913316',
    last_updated: '2025-07-10T23:56:01.913317',
    metadata_enhanced: false,
    metadata_enhanced_date: undefined,
    metadata_sources_used: [],
    isbn10: undefined,
    isbn13: undefined,
    reading_status: ReadingStatus.UNREAD,
    reading_progress_pages: undefined,
    reading_progress_percentage: undefined,
    date_started: undefined,
    date_finished: undefined,
    personal_rating: undefined,
    personal_notes: undefined,
    reading_goal_id: undefined,
    times_read: 0
  }

  beforeEach(() => {
    // Mount the component with required props
    cy.mount(
      <div className="bg-gray-900 p-4">
        <BookCard 
          book={mockBook}
          onClick={() => {}}
        />
      </div>
    )
  })

  it('should render book title', () => {
    cy.contains('A Game of Thrones').should('be.visible')
  })

  it('should render book author', () => {
    cy.contains('George R. R. Martin').should('be.visible')
  })

  it('should render series information', () => {
    cy.contains('A Song of Ice and Fire #1').should('be.visible')
  })

  it('should render page count', () => {
    cy.contains('694 pages').should('be.visible')
  })

  it('should render reading status badge', () => {
    cy.get('[data-testid="reading-status"]').should('contain', 'Unread')
  })

  it('should render publisher and year', () => {
    cy.contains('Bantam').should('be.visible')
    cy.contains('1996').should('be.visible')
  })

  it('should handle click events', () => {
    const onClick = cy.stub()
    
    cy.mount(
      <div className="bg-gray-900 p-4">
        <BookCard 
          book={mockBook}
          onClick={onClick}
        />
      </div>
    )

    cy.get('[data-testid="book-card"]').click()
    cy.then(() => {
      expect(onClick).to.have.been.calledWith(mockBook)
    })
  })

  it('should display different reading status correctly', () => {
    const readingBook = { ...mockBook, reading_status: ReadingStatus.READING }
    
    cy.mount(
      <div className="bg-gray-900 p-4">
        <BookCard 
          book={readingBook}
          onClick={() => {}}
        />
      </div>
    )

    cy.get('[data-testid="reading-status"]').should('contain', 'Reading')
  })

  it('should handle books without series', () => {
    const standaloneBook = { ...mockBook, series: undefined, series_position: undefined }
    
    cy.mount(
      <div className="bg-gray-900 p-4">
        <BookCard 
          book={standaloneBook}
          onClick={() => {}}
        />
      </div>
    )

    cy.contains('A Song of Ice and Fire').should('not.exist')
    cy.contains('A Game of Thrones').should('be.visible')
  })
})