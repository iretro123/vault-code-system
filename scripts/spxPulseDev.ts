import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { request } from "node:http";

export function spxPulseDev(): Plugin {
  return { name: "spx-pulse-private-preview", apply: "serve", configureServer(server) {
    server.middlewares.use("/api/spx-pulse", (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      const host = req.headers.host?.split(":")[0];
      if (!["127.0.0.1", "localhost"].includes(host || "") || req.method !== "GET" || !/^\/(feed|stream|image\/[a-zA-Z0-9:_-]{1,160})$/.test(req.url || "")) { res.statusCode = 404; res.end(); return; }
      try {
        const { admin } = JSON.parse(readFileSync(resolve(server.config.root, ".vault-zones-state/spx-pulse/credentials.json"), "utf8"));
        const upstream = request({ hostname: "127.0.0.1", port: 4191, path: req.url, headers: { Authorization: `Bearer ${admin}` } }, response => {
          res.statusCode = response.statusCode || 502;
          res.setHeader("Content-Type", response.headers["content-type"] || "application/json");
          response.pipe(res);
        });
        upstream.on("error", () => { if (!res.headersSent) res.statusCode = 503; res.end(); });
        upstream.setTimeout(req.url === "/stream" ? 45000 : 5000, () => upstream.destroy());
        res.on("close", () => upstream.destroy());
        upstream.end();
      } catch { res.statusCode = 503; res.end(); }
    });
  } };
}
