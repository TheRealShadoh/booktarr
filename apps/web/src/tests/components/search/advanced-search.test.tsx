import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedSearch } from '@/components/search/advanced-search';

describe('AdvancedSearch', () => {
  it('should render search input', () => {
    const onSearch = vi.fn();
    render(<AdvancedSearch onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText(/search books/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('should call onSearch when search button is clicked', () => {
    const onSearch = vi.fn();
    render(<AdvancedSearch onSearch={onSearch} />);

    const searchButton = screen.getByRole('button', { name: /^search$/i });
    fireEvent.click(searchButton);

    expect(onSearch).toHaveBeenCalled();
  });

  it('should display filter button with count when filters are active', () => {
    const onSearch = vi.fn();
    render(
      <AdvancedSearch
        onSearch={onSearch}
        initialFilters={{ author: 'Sanderson', status: 'owned' }}
      />
    );

    const filterButton = screen.getByRole('button', { name: /filters/i });
    expect(filterButton).toBeInTheDocument();
    expect(filterButton).toHaveTextContent('2');
  });

  it('should update query filter when typing in search input', () => {
    const onSearch = vi.fn();
    render(<AdvancedSearch onSearch={onSearch} />);

    const searchInput = screen.getByPlaceholderText(/search books/i);
    fireEvent.change(searchInput, { target: { value: 'Stormlight' } });

    expect(searchInput).toHaveValue('Stormlight');
  });

  it('should clear all filters when clear all button is clicked', () => {
    const onSearch = vi.fn();
    render(
      <AdvancedSearch
        onSearch={onSearch}
        initialFilters={{ author: 'Sanderson', status: 'owned' }}
      />
    );

    // Open filter popover
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);

    // Find and click clear all button
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);

    expect(onSearch).toHaveBeenCalledWith({});
  });
});
