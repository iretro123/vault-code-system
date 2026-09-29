import type { Plugin } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
export function bitcoinZonesDev(): Plugin {
  return {name:"bitcoin-zones-local",apply:"serve",configureServer(server) {
    server.middlewares.use("/api/bitcoin-zones",async(req,res)=>{
      res.setHeader("Cache-Control","no-store");
      // The browser gets no service credentials and cannot publish.
      if(req.method!=="GET" || !(req.url==="/" || req.url?.startsWith("/image/"))){res.statusCode=404;res.end();return;}
      try {
        const keys=JSON.parse(readFileSync(resolve(server.config.root,".vault-zones-state/credentials.json"),"utf8"));
        const endpoint=req.url==="/"?"/feed":req.url;
        const response=await fetch("http://127.0.0.1:4181"+endpoint,{headers:{Authorization:"Bearer "+keys.admin},signal:AbortSignal.timeout(5000)});
        res.statusCode=response.status;
        res.setHeader("Content-Type",response.headers.get("Content-Type")||"application/json");
        if (req.url === "/" && response.ok) {
          const data = await response.json();
          let monitor = {};
          try {
            const state = JSON.parse(readFileSync(resolve(server.config.root,".vault-zones-state/observer-state.json"),"utf8"));
            monitor = Object.fromEntries(["5", "15"].map(tf => {
              const check = state.timeframes?.[tf];
              return [tf, { lastCheckedAt: Number.isFinite(check?.lastCheckedAt) ? check.lastCheckedAt : null, blocked: Boolean(check?.postingBlocked) }];
            }));
          } catch { /* Missing observer evidence must never look live. */ }
          res.end(JSON.stringify({...(data as Record<string, unknown>), monitor}));
          return;
        }
        res.end(Buffer.from(await response.arrayBuffer()));
      }catch{
        res.statusCode=503;res.setHeader("Content-Type","application/json");res.end(JSON.stringify({error:"Test service offline"}));
      }
    });
  }};
}
