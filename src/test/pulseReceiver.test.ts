import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { createPulseReceiver, type PulseStore } from "../../supabase/functions/_shared/pulse/receiver";
import type { PulseSnapshot } from "../../supabase/functions/_shared/pulse/snapshots";
import type { PulsePost } from "@/lib/spxPulse";

const at = Date.parse("2026-09-24T15:00:01Z");
beforeAll(()=>vi.stubGlobal("crypto",webcrypto));
afterAll(()=>vi.unstubAllGlobals());
const token = "ab".repeat(32); // Test-only delivery capability.
const payload = (offset=0): PulseSnapshot => ({ kind:"snapshot",source:"indicator",symbol:"CAPITALCOM:SPX500",timeframe:5,at:at+offset,barAt:at-1000,confirmed:false,price:7660,zones:[{zoneId:"test:zone",side:"supply",lower:7658,upper:7664}],bars:[{t:at-301000,o:7658,h:7662,l:7657,c:7660},{t:at-1000,o:7660,h:7661,l:7659,c:7660}] });
function fixture() {
  let revision=0, lastAt=0, posts: PulsePost[]=[];
  const store: PulseStore = {
    authorized: async hash => {
      const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
      return hash===Buffer.from(digest).toString("hex");
    },
    read: async () => ({ revision,at:lastAt,posts:[...posts] }),
    commit: async (expected,snapshot,additions) => {
      if (snapshot.at<=lastAt) return {accepted:false,posts:0};
      if (expected!==revision) return {accepted:false,conflict:true};
      revision++;lastAt=snapshot.at;posts.push(...additions);
      return {accepted:true,posts:additions.length};
    },
  };
  return { store, read:()=>({revision,lastAt,posts}), handler:createPulseReceiver(store,()=>at+30000) };
}
const request = (data: unknown=payload(), key=token) => new Request(`https://example.invalid/functions/v1/pulse-receiver/${key}`,{method:"POST",body:JSON.stringify(data)});
describe("hosted Pulse receiver",()=>{
  it("requires the scoped delivery credential before processing data",async()=>{
    const f=fixture();
    expect((await f.handler(request(payload(),"bad"))).status).toBe(401);
    expect((await f.handler(request(payload(),"cd".repeat(32)))).status).toBe(401);
    expect(f.read().revision).toBe(0);
  });
  it("never exposes feed data through the public endpoint",async()=>{
    const f=fixture();expect((await f.handler(new Request(`https://example.invalid/${token}`))).status).toBe(405);
  });
  it("rejects unsupported, stale and excessive payloads without changing state",async()=>{
    const f=fixture();
    expect((await f.handler(request({...payload(),symbol:"SPY"}))).status).toBe(400);
    expect((await f.handler(request({...payload(),at:at-120000}))).status).toBe(400);
    expect((await f.handler(request({padding:"x".repeat(33000)}))).status).toBe(413);
    expect(f.read().revision).toBe(0);
  });
  it("persists a real-format snapshot and deduplicates delivery retries",async()=>{
    const f=fixture();
    expect(await (await f.handler(request())).json()).toEqual({accepted:true,posts:1});
    expect(await (await f.handler(request())).json()).toEqual({accepted:false,posts:0});
    expect(f.read().posts).toHaveLength(1);
  });
  it("retries concurrent commits without losing the newest snapshot or duplicating a zone",async()=>{
    const f=fixture();
    const results=await Promise.all([f.handler(request(payload())),f.handler(request(payload(20000)))]);
    expect(results.every(result=>result.status===202)).toBe(true);
    expect(f.read().lastAt).toBe(at+20000);
    expect(f.read().posts).toHaveLength(1);
  });
  it("returns a retryable error if storage is unavailable",async()=>{
    const f=fixture();f.store.read=async()=>{throw new Error("private database detail");};
    const response=await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database detail");
  });
});
