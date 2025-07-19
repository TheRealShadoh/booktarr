/**
 * Tests for SearchBar component
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} />);
    
    expect(screen.getByPlaceholderText(/Search books by title, author, or series/)).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    const form = input.closest('form');
    
    fireEvent.change(input, { target: { value: 'Harry Potter' } });
    fireEvent.submit(form!);
    
    expect(mockOnSearch).toHaveBeenCalledWith('Harry Potter');
  });

  it('calls onSearch when search button is clicked', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    const searchButton = screen.getByText('Search');
    
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('shows clear button when there is text', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    
    // No clear button initially
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    
    // Clear button appears when typing
    fireEvent.change(input, { target: { value: 'some text' } });
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    
    fireEvent.change(input, { target: { value: 'some text' } });
    const clearButton = screen.getByLabelText('Clear search');
    
    fireEvent.click(clearButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('');
    expect(input).toHaveValue('');
  });

  it('uses controlled value when provided', () => {
    const mockOnSearch = jest.fn();
    
    render(<SearchBar onSearch={mockOnSearch} value="controlled value" />);
    
    const input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    expect(input).toHaveValue('controlled value');
  });

  it('updates controlled value when prop changes', () => {
    const mockOnSearch = jest.fn();
    
    const { rerender } = render(<SearchBar onSearch={mockOnSearch} value="initial" />);
    
    let input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    expect(input).toHaveValue('initial');
    
    rerender(<SearchBar onSearch={mockOnSearch} value="updated" />);
    
    input = screen.getByPlaceholderText(/Search books by title, author, or series/);
    expect(input).toHaveValue('updated');
  });
});