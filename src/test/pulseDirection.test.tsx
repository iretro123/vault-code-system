import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PulseDirection } from '@/components/academy/chat/PulseDirection';
afterEach(cleanup);
it.each(['supply', 'demand'] as const)('renders the %s direction without relying on native emoji fonts', side => {
 const {container}=render(<PulseDirection side={side}/>);
 expect(screen.getByRole('img',{name:side==='supply'?'Bearish supply · Watch for rejection':'Bullish demand · Watch for a bounce'})).toBeTruthy();
 const icon=container.querySelector('svg.pulse-direction-animal');
 expect(icon).toHaveAttribute('viewBox','0 0 32 32');
 expect(icon).toHaveAttribute('aria-hidden','true');
 expect(icon?.querySelectorAll('path').length).toBeGreaterThan(0);
 expect(container.textContent).toBe('');
 expect(container.querySelector(side==='supply'?'.lucide-arrow-down-right':'.lucide-arrow-up-right')).toBeTruthy();
});
