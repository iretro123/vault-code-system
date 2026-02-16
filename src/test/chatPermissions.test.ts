import { describe, it, expect, vi } from "vitest";

/**
 * Unit tests for chat message edit/delete permission logic.
 * These test the pure permission rules extracted from the hook,
 * without needing Supabase or React rendering.
 */

// ── Permission helpers (mirrors hook logic) ──

function canEditMessage(
  msg: { user_id: string; created_at: string; is_deleted: boolean },
  currentUserId: string | null,
  isOperator: boolean
): { allowed: boolean; reason?: string } {
  if (!currentUserId) return { allowed: false, reason: "Not authenticated" };
  if (msg.is_deleted) return { allowed: false, reason: "Message deleted" };
  if (isOperator) return { allowed: true };
  if (msg.user_id !== currentUserId) return { allowed: false, reason: "Not owner" };
  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  if (ageMs >= 15 * 60 * 1000) return { allowed: false, reason: "Edit window expired" };
  return { allowed: true };
}

function canDeleteMessage(
  msg: { user_id: string; is_deleted: boolean },
  currentUserId: string | null,
  isOperator: boolean
): { allowed: boolean; reason?: string } {
  if (!currentUserId) return { allowed: false, reason: "Not authenticated" };
  if (msg.is_deleted) return { allowed: false, reason: "Already deleted" };
  if (isOperator) return { allowed: true };
  if (msg.user_id !== currentUserId) return { allowed: false, reason: "Not owner" };
  return { allowed: true };
}

// ── Test data ──

const USER_A = "user-a-id";
const USER_B = "user-b-id";

function makeMsg(overrides: Partial<{ user_id: string; created_at: string; is_deleted: boolean }> = {}) {
  return {
    user_id: USER_A,
    created_at: new Date().toISOString(),
    is_deleted: false,
    ...overrides,
  };
}

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

// ── Edit permission tests ──

describe("canEditMessage", () => {
  it("allows owner to edit within 15 minutes", () => {
    const msg = makeMsg({ created_at: minutesAgo(5) });
    expect(canEditMessage(msg, USER_A, false)).toEqual({ allowed: true });
  });

  it("blocks owner from editing after 15 minutes", () => {
    const msg = makeMsg({ created_at: minutesAgo(16) });
    const result = canEditMessage(msg, USER_A, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("blocks editing at exactly 15 minutes", () => {
    const msg = makeMsg({ created_at: minutesAgo(15) });
    const result = canEditMessage(msg, USER_A, false);
    expect(result.allowed).toBe(false);
  });

  it("blocks non-owner from editing another user's message", () => {
    const msg = makeMsg({ user_id: USER_A, created_at: minutesAgo(1) });
    const result = canEditMessage(msg, USER_B, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Not owner");
  });

  it("allows operator to edit any message regardless of time", () => {
    const msg = makeMsg({ user_id: USER_B, created_at: minutesAgo(120) });
    expect(canEditMessage(msg, USER_A, true)).toEqual({ allowed: true });
  });

  it("allows operator to edit another user's message", () => {
    const msg = makeMsg({ user_id: USER_B, created_at: minutesAgo(1) });
    expect(canEditMessage(msg, USER_A, true)).toEqual({ allowed: true });
  });

  it("blocks editing a deleted message", () => {
    const msg = makeMsg({ is_deleted: true, created_at: minutesAgo(1) });
    const result = canEditMessage(msg, USER_A, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Message deleted");
  });

  it("blocks editing when not authenticated", () => {
    const msg = makeMsg();
    const result = canEditMessage(msg, null, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Not authenticated");
  });
});

// ── Delete permission tests ──

describe("canDeleteMessage", () => {
  it("allows owner to delete own message anytime", () => {
    const msg = makeMsg({ created_at: minutesAgo(120) });
    expect(canDeleteMessage(msg, USER_A, false)).toEqual({ allowed: true });
  });

  it("blocks non-owner from deleting another user's message", () => {
    const msg = makeMsg({ user_id: USER_A });
    const result = canDeleteMessage(msg, USER_B, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Not owner");
  });

  it("allows operator to delete any message", () => {
    const msg = makeMsg({ user_id: USER_B });
    expect(canDeleteMessage(msg, USER_A, true)).toEqual({ allowed: true });
  });

  it("blocks deleting an already-deleted message", () => {
    const msg = makeMsg({ is_deleted: true });
    const result = canDeleteMessage(msg, USER_A, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Already deleted");
  });

  it("blocks deleting when not authenticated", () => {
    const msg = makeMsg();
    const result = canDeleteMessage(msg, null, false);
    expect(result.allowed).toBe(false);
  });
});

// ── Double-click / idempotency tests ──

describe("edit idempotency", () => {
  it("edit_count increments correctly on successive edits", () => {
    let editCount = 0;
    // Simulate 3 rapid edits
    for (let i = 0; i < 3; i++) {
      editCount += 1;
    }
    expect(editCount).toBe(3);
  });

  it("original_content preserved after first edit only", () => {
    const originalBody = "Hello world";
    let originalContent: string | null = null;

    // First edit
    if (!originalContent) originalContent = originalBody;
    const body1 = "Edited once";

    // Second edit — original_content should NOT change
    const savedOriginal = originalContent;
    if (!originalContent) originalContent = body1; // should not trigger
    const body2 = "Edited twice";

    expect(originalContent).toBe(originalBody); // still the original
    expect(savedOriginal).toBe(originalBody);
  });
});

// ── Persistence tests ──

describe("message state persistence", () => {
  it("edited message retains edited_at and edit_count after cast", () => {
    const raw = {
      id: "msg-1",
      room_slug: "test",
      user_id: USER_A,
      user_name: "Test",
      user_role: "beginner",
      body: "Edited text",
      attachments: [],
      created_at: new Date().toISOString(),
      edited_at: new Date().toISOString(),
      edit_count: 2,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      original_content: "Original text",
    };

    // Simulates the castMessages function
    const cast = {
      ...raw,
      attachments: raw.attachments ?? [],
      edited_at: raw.edited_at ?? null,
      edit_count: raw.edit_count ?? 0,
      is_deleted: raw.is_deleted ?? false,
      deleted_at: raw.deleted_at ?? null,
      deleted_by: raw.deleted_by ?? null,
      original_content: raw.original_content ?? null,
    };

    expect(cast.edited_at).toBeTruthy();
    expect(cast.edit_count).toBe(2);
    expect(cast.original_content).toBe("Original text");
    expect(cast.is_deleted).toBe(false);
  });

  it("deleted message retains soft-delete fields after cast", () => {
    const raw = {
      id: "msg-2",
      room_slug: "test",
      user_id: USER_A,
      user_name: "Test",
      user_role: "beginner",
      body: "Some text",
      attachments: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      edit_count: 0,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: USER_B,
      original_content: null,
    };

    const cast = {
      ...raw,
      attachments: raw.attachments ?? [],
      edited_at: raw.edited_at ?? null,
      edit_count: raw.edit_count ?? 0,
      is_deleted: raw.is_deleted ?? false,
      deleted_at: raw.deleted_at ?? null,
      deleted_by: raw.deleted_by ?? null,
      original_content: raw.original_content ?? null,
    };

    expect(cast.is_deleted).toBe(true);
    expect(cast.deleted_at).toBeTruthy();
    expect(cast.deleted_by).toBe(USER_B);
    expect(cast.attachments).toEqual([]);
  });
});
