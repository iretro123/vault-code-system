import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const messages = readFileSync('src/pages/academy/academy-messages.css', 'utf8');
const messagesPage = readFileSync('src/pages/academy/AcademyMessages.tsx', 'utf8');
const modulePage = readFileSync('src/pages/academy/AcademyModule.tsx', 'utf8');
const globalCss = readFileSync('src/index.css', 'utf8');
const campusCss = readFileSync('src/design-studio/trading-campus.css', 'utf8');
const liveCss = readFileSync('src/components/academy/live/vault-live-preview.css', 'utf8');
const learnCss = readFileSync('src/pages/academy/academy-learn.css', 'utf8');
const communityCss = readFileSync('src/pages/academy/academy-community.css', 'utf8');
const settingsCss = readFileSync('src/pages/academy/settings-simple.css', 'utf8');
const supportCss = readFileSync('src/components/academy/schedule-training-preview.css', 'utf8');
const coach = readFileSync('src/components/academy/CoachDrawer.tsx', 'utf8');

describe('native Academy layout safeguards', () => {
  it('keeps member search above the header and inside the visible viewport', () => {
    expect(messages).toMatch(/\.vm-dialog-backdrop\{[^}]*position:fixed[^}]*height:var\(--academy-visible-height,100dvh\)[^}]*z-index:100/);
    expect(messages).toMatch(/\.vm-dialog\{[^}]*max-height:100%[^}]*display:flex[^}]*overflow:hidden/);
    expect(messages).toMatch(/\.vm-search-results\{[^}]*min-height:0[^}]*overflow-y:auto/);
    expect(messages).toMatch(/\.vm-dialog-close\{[^}]*z-index:3[^}]*min-width:44px[^}]*min-height:44px[^}]*touch-action:manipulation/);
    expect(messagesPage).toContain('onPointerDown={event=>{event.preventDefault();setCreating(false);}}');
  });

  it('gives lesson actions one native mobile-navigation clearance', () => {
    expect(modulePage).toContain('academy-lesson-player flex');
    expect(modulePage).toContain('data-lesson-actions className="academy-lesson-actions');
    expect(modulePage).not.toContain('h-[calc(100vh-3.5rem-4rem)]');
    expect(modulePage).not.toContain('mb-16 md:mb-0');
    expect(globalCss).toMatch(/\.academy-content-safe:has\(\.academy-lesson-player\)[^{]*\{\s*padding-bottom: 0;/);
    expect(globalCss).toMatch(/\.academy-lesson-actions\s*\{\s*padding-bottom: calc\(0\.75rem \+ var\(--academy-mobile-nav-offset\)\);/);
  });

  it('keeps phone dashboards dense without shrinking readable body copy', () => {
    expect(campusCss).toMatch(/@media\(max-width:720px\)[\s\S]*?\.tc-feature\{padding:18px 16px[^}]*border-radius:14px/);
    expect(campusCss).toMatch(/\.tc-feature-copy>p\{font-size:16px;line-height:1\.5/);
    expect(campusCss).toMatch(/@media\(max-width:360px\)[\s\S]*?\.tc-feature h2\{font-size:26px/);
  });

  it('brings the live action forward while preserving readable mobile text', () => {
    expect(liveCss).toMatch(/@media\(max-width:650px\)[^{]*\{[^}]*\.vault-live-preview\{padding:16px 16px 100px/);
    expect(liveCss).toMatch(/\.vl-focused-class\{padding:16px;min-height:0/);
    expect(liveCss).toMatch(/\.vl-class-bullets\{margin-top:12px;gap:5px;font-size:16px;line-height:1\.5/);
    expect(liveCss).toMatch(/\.vl-class-tabs button\{font-size:16px;flex:1;white-space:normal;min-height:44px/);
  });

  it('keeps core mobile reading and controls at accessible sizes', () => {
    expect(learnCss).toMatch(/\.learn-heading \.learn-intro \{ font-size: 16px; line-height: 1\.5; \}/);
    expect(communityCss).toMatch(/\.community-room-tabs button\{flex:1;padding:8px 6px;min-height:44px\}/);
    expect(messages).toMatch(/\.vm-message p\{font-size:16px;line-height:1\.55\}/);
    expect(messages).toMatch(/\.vm-thread-heading \.vm-block\{font-size:12px;padding:8px;min-height:44px\}/);
    expect(settingsCss).toMatch(/button\[aria-pressed\] span:last-child\{font-size:14px;line-height:1\.45;max-width:100%/);
    expect(supportCss).toMatch(/\.st-header h1\{font-size:1\.75rem;line-height:1\.18/);
    expect(coach).toContain('resize-none text-base');
    expect(coach).toContain('min-w-11 min-h-11');
  });
});