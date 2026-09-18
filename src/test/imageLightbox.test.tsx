import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageLightbox } from '@/components/academy/community/ImageLightbox';

afterEach(cleanup);
describe('chart image viewer', () => {
  it('keeps the source image intact when switching between fit and actual size', () => {
    render(<ImageLightbox src="/chart.png" alt="Trading chart" onClose={() => {}} />);
    const image = screen.getByAltText('Trading chart');
    expect(image).toHaveClass('max-h-[calc(100dvh-180px)]');
    fireEvent.click(screen.getByRole('button', { name: 'Actual size' }));
    expect(image).toHaveClass('max-w-none', 'max-h-none');
    expect(image).toHaveAttribute('src', '/chart.png');
    fireEvent.click(screen.getByRole('button', { name: 'Fit to screen' }));
    expect(image).toHaveClass('max-h-[calc(100dvh-180px)]');
  });
  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<ImageLightbox src="/chart.png" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
