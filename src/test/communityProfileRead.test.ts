import {afterEach,expect,it,vi} from "vitest";
import {localPreviewFetch} from "@/integrations/supabase/localPreviewFetch";
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it("allows only GET for the audited profile RPC while continuing to block writes",async()=>{
 vi.stubEnv("DEV",true);
 vi.stubGlobal("window",{location:{hostname:"127.0.0.1"}});
 const request=vi.fn().mockResolvedValue(new Response("[]"));
 vi.stubGlobal("fetch",request);
 const base="https://example.supabase.co";
 await localPreviewFetch(base+"/rest/v1/rpc/get_community_profiles",{method:"GET"});
 expect(request).toHaveBeenCalledTimes(1);
 for(const [path,method] of [["/rest/v1/rpc/get_community_profiles","POST"],["/rest/v1/rpc/create_mention_notifications","GET"],["/rest/v1/academy_messages","POST"],["/rest/v1/profiles","PATCH"]]){
  expect((await localPreviewFetch(base+path,{method})).status).toBe(403);
 }
 expect(request).toHaveBeenCalledTimes(1);
});
