import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('conversation-first phone layout', () => {
  const css = readFileSync('src/pages/academy/academy-community.css', 'utf8');
  const room = readFileSync('src/components/academy/RoomChat.tsx', 'utf8');
  const page = readFileSync('src/pages/academy/AcademyCommunity.tsx', 'utf8');
  it('keeps readable explicit message sizes independent of the root font', () => {
    expect(css).toContain('.community-message-body{font-size:17px;line-height:1.45');
    expect(css).toContain('.community-message-body{font-size:16px;line-height:1.5');
  });
  it('retains discoverable media tools and accessible inbox control', () => {
    expect(room).toContain('aria-expanded={composerToolsOpen}');
    expect(room).toContain('aria-label="Attachment options"');
    expect(room).toContain('<ExpressionPicker onEmoji={handleEmojiSelect}');
    expect(page).toContain('aria-label="Messages"');
    expect(page).toContain('aria-label="Community tools"');
  });
  it('uses a single-row phone composer with explicit touch targets', () => {
    expect(css).toContain('grid-template-columns:44px minmax(0,1fr) 44px 44px');
    expect(css).toContain('community-tools-open>.community-composer-tools{display:flex');
    expect(css).toContain('min-height:44px;max-height:120px');
  });
  it('reserves phone message actions for a deliberate hold', () => {
    expect(room).toContain('<ContextMenuTrigger asChild disabled={isMobile}>');
    expect(room).toContain('!isMobile && !msg.is_deleted && !isEditing');
    expect(room).toContain('onTouchMove:');
    expect(room).toContain('onTouchEnd: cancel');
    expect(room).toContain('onTouchCancel: cancel');
  });
});
