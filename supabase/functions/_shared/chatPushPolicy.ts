export function isChatPush(type: string, linkPath?: string | null): boolean {
  return type === "chat_message" && /^\/academy\/room\/(?:trade-floor|wins-proof|questions|off-topic|daily-setups)(?:\?[^#]*)?$/.test(linkPath || "");
}

/** Paths are validated again by the server against the saved source event. */
export function isRealtimePush(type: string, path?: string | null): boolean {
  return isChatPush(type, path) || (type === 'pulse_zone' && path === '/academy/community?tab=pulse')
    || (type === 'live_now' && path === '/academy/live');
}
