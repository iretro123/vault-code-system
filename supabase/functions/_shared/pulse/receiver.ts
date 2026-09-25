import { validatePulseSnapshot, postsFromSnapshot, type PulseSnapshot } from "./snapshots.ts";
import { PULSE_SYMBOL, type PulseSymbol, type PulsePost } from "./domain.ts";

export interface PulseStore {
  authorized(hash: string): Promise<boolean>;
  read(timeframe: number): Promise<{ revision: number; at: number; posts: PulsePost[] }>;
  commit(revision: number, snapshot: PulseSnapshot, posts: PulsePost[]): Promise<{ accepted: boolean; conflict?: boolean; posts?: number }>;
}

const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

// Only snapshot delivery is public. There are no public read or administration routes.
export function createPulseReceiver(store: PulseStore, now = () => Date.now(), expectedSymbol: PulseSymbol = PULSE_SYMBOL) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return reply(405, { error: "Method not allowed" });
    const token = new URL(request.url).pathname.split("/").at(-1) || "";
    if (!/^[a-f0-9]{64}$/.test(token)) return reply(401, { error: "Unauthorized" });
    try {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
      const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
      if (!await store.authorized(hash)) return reply(401, { error: "Unauthorized" });
      if (Number(request.headers.get("content-length")) > 32768) return reply(413, { error: "Payload too large" });
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Missing body" });
      let size = 0;
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 32768) { await reader.cancel(); return reply(413, { error: "Payload too large" }); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let snapshot: PulseSnapshot;
      try {
        snapshot = validatePulseSnapshot(JSON.parse(new TextDecoder().decode(bytes)), now());
        if (snapshot.symbol !== expectedSymbol) throw new Error("Wrong chart");
      }
      catch (error) { return reply(400, { error: error instanceof Error ? error.message : "Invalid snapshot" }); }
      // Optimistic concurrency with a database row lock prevents parallel webhooks
      // from overwriting newer zone state or losing a closing update.
      for (let attempt = 0; attempt < 4; attempt++) {
        const previous = await store.read(snapshot.timeframe);
        if (snapshot.at <= previous.at) return reply(202, { accepted: false, posts: 0 });
        const next = postsFromSnapshot(previous.posts, snapshot, now());
        const additions = next.slice(previous.posts.length).map(post => ({ ...post, bars: post.bars?.slice(-18) }));
        const result = await store.commit(previous.revision, snapshot, additions);
        if (!result.conflict) return reply(202, result);
      }
      return reply(503, { error: "Delivery busy; retry" });
    } catch {
      // Never log the request URL (it carries the scoped delivery capability).
      console.error("Pulse delivery failed");
      return reply(503, { error: "Delivery temporarily unavailable" });
    }
  };
}
