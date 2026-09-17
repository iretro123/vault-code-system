import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const messages = readFileSync('src/pages/academy/academy-messages.css', 'utf8');
const modulePage = readFileSync('src/pages/academy/AcademyModule.tsx', 'utf8');
const globalCss = readFileSync('src/index.css', 'utf8');

describe('native Academy layout safeguards', () => {
  it('keeps member search above the header and inside the visible viewport', () => {
    expect(messages).toMatch(/\.vm-dialog-backdrop\{[^}]*position:fixed[^}]*height:var\(--academy-visible-height,100dvh\)[^}]*z-index:100/);
    expect(messages).toMatch(/\.vm-dialog\{[^}]*max-height:100%[^}]*display:flex[^}]*overflow:hidden/);
    expect(messages).toMatch(/\.vm-search-results\{[^}]*min-height:0[^}]*overflow-y:auto/);
  });

  it('gives lesson actions one native mobile-navigation clearance', () => {
    expect(modulePage).toContain('academy-lesson-player flex');
    expect(modulePage).toContain('data-lesson-actions className="academy-lesson-actions');
    expect(modulePage).not.toContain('h-[calc(100vh-3.5rem-4rem)]');
    expect(modulePage).not.toContain('mb-16 md:mb-0');
    expect(globalCss).toMatch(/\.academy-content-safe:has\(\.academy-lesson-player\)[^{]*\{\s*padding-bottom: 0;/);
    expect(globalCss).toMatch(/\.academy-lesson-actions\s*\{\s*padding-bottom: calc\(0\.75rem \+ var\(--academy-mobile-nav-offset\)\);/);
  });
});