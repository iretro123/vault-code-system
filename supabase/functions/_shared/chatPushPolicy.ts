export function isChatPush(type: string, linkPath?: string | null): boolean {
  return type === "chat_message" && /^\/academy\/room\/trade-floor(?:\?[^#]*)?$/.test(linkPath || "");
}
