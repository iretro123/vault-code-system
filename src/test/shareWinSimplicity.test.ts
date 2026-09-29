import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
it("keeps sharing preview-first with no mandatory form or screenshot exposure", () => {
  const source = readFileSync(resolve(process.cwd(), "src/components/academy/community/ShareWinModal.tsx"), "utf8");
  expect(source).not.toContain("<textarea");
  expect(source).not.toContain("setReviewed");
  expect(source).not.toContain("win.imageUrl");
  expect(source).not.toContain("Hide my name and avatar");
  expect(source).not.toContain("Screenshots stay private. Nothing posts automatically.");
  expect(source).toContain("parseAvatarUrl(avatarUrl)");
  expect(source).toContain('disabled={!preview || busy || !!details.error}');
});
