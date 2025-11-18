import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RatingStars } from '@/components/reading/rating-stars';

describe('RatingStars', () => {
  it('should render correct number of stars', () => {
    const { container } = render(<RatingStars rating={3} maxRating={5} />);

    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('should fill stars up to rating value', () => {
    const { container } = render(<RatingStars rating={3} maxRating={5} />);

    const stars = container.querySelectorAll('svg');

    // First 3 stars should be filled (yellow)
    expect(stars[0]).toHaveClass('fill-yellow-400');
    expect(stars[1]).toHaveClass('fill-yellow-400');
    expect(stars[2]).toHaveClass('fill-yellow-400');

    // Last 2 stars should not be filled (gray)
    expect(stars[3]).toHaveClass('text-gray-300');
    expect(stars[4]).toHaveClass('text-gray-300');
  });

  it('should call onChange when star is clicked in interactive mode', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RatingStars rating={2} interactive onChange={onChange} />
    );

    const stars = container.querySelectorAll('button');
    fireEvent.click(stars[3]); // Click 4th star

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('should not call onChange when not interactive', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RatingStars rating={2} interactive={false} onChange={onChange} />
    );

    const stars = container.querySelectorAll('button');
    fireEvent.click(stars[3]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render different sizes correctly', () => {
    const { container: small } = render(<RatingStars rating={3} size="sm" />);
    const { container: medium } = render(<RatingStars rating={3} size="md" />);
    const { container: large } = render(<RatingStars rating={3} size="lg" />);

    expect(small.querySelector('svg')).toHaveClass('h-3', 'w-3');
    expect(medium.querySelector('svg')).toHaveClass('h-4', 'w-4');
    expect(large.querySelector('svg')).toHaveClass('h-5', 'w-5');
  });
});
