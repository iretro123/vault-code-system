import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MarketWatch } from "@/components/academy/community/MarketWatch";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("does not substitute sample stocks when the source is unavailable", async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({status:'unavailable',snapshot:null}) }));
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  render(<QueryClientProvider client={client}><MarketWatch /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Stocks to watch" }));
  expect(await screen.findByText(/Waiting for the next successful/)).toBeTruthy();
  expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  expect(document.querySelector('iframe')).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  client.clear();
});
