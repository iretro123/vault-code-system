import { useState } from "react";

export function useCommunityDraft(userId: string | undefined, room: string) {
  const key = `vault-chat-draft:${userId ?? "guest"}:${room}`;
  const read = () => {
    try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
  };
  const [state, setState] = useState(() => ({ key, text: read() }));
  const text = state.key === key ? state.text : read();
  const setText = (value: string) => {
    setState({ key, text: value });
    try {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch { /* A draft still works when browser storage is unavailable. */ }
  };
  return [text, setText] as const;
}
