import { describe, expect, it, vi } from "vitest";
import { grantPaidRole } from "../../supabase/functions/_shared/vaultAccess";

function client(failAt) {
  const operations=[];
  return {operations, from:vi.fn((table)=>{
    let op="";
    const chain = {
      select:()=>{op="lookup";return chain;},
      eq:()=>chain,
      maybeSingle:async()=>({data:null,error:failAt === "lookup" ? new Error("lookup failed") : null}),
      insert:async()=>{operations.push("insert");return {error:failAt === "insert" ? new Error("insert failed") : null};},
      delete:()=>{op="delete";return chain;},
      in:async()=>{operations.push(op);return {error:failAt === "delete" ? new Error("delete failed") : null};},
      update:()=>{op="update";return chain;},
      not:async()=>{operations.push(table);return {error:failAt === "profiles" ? new Error("profile failed") : null};},
    };
    return chain;
  })};
}
describe("paid role provisioning",()=>{
  it("persists paid access before removing free access",async()=>{
    const db=client();
    expect(await grantPaidRole(db,"member")).toBe(true);
    expect(db.operations).toEqual(["insert","delete","profiles"]);
  });
  it.each(["lookup","insert","delete","profiles"])("surfaces %s failures for webhook retry",async failure=>{
    const db=client(failure);
    await expect(grantPaidRole(db,"member")).rejects.toThrow();
    if(failure === "insert") expect(db.operations).toEqual(["insert"]);
  });
});
