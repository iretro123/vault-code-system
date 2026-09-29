import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import MembershipConfirmation from "@/pages/MembershipConfirmation";

const mocks = vi.hoisted(() => ({
  auth: { user: {id:"member"} as {id:string} | null, loading:false, userRole:{role:"vault_access"}, refetchProfile:vi.fn().mockResolvedValue(undefined) },
  rpc:vi.fn(), roles:vi.fn(), invalidate:vi.fn().mockResolvedValue(undefined), navigate:vi.fn(),
}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>mocks.auth}));
vi.mock("@tanstack/react-query",()=>{
  const client = {invalidateQueries:mocks.invalidate};
  return {useQueryClient:()=>client};
});
vi.mock("@/integrations/supabase/client",()=>({supabase:{rpc:mocks.rpc,from:()=>({select:()=>({eq:mocks.roles})})}}));
vi.mock("react-router-dom",async original=>({...await original<typeof import("react-router-dom")>(),useNavigate:()=>mocks.navigate}));

afterEach(()=>{cleanup();vi.clearAllMocks();vi.useRealTimers();mocks.auth.user={id:"member"};mocks.auth.userRole={role:"vault_access"};});
function show() { return render(<MemoryRouter><MembershipConfirmation/></MemoryRouter>); }
describe("membership return confirmation",()=>{
  it("waits for both server access and role, refreshes caches, then enters onboarding route",async()=>{
    mocks.rpc.mockResolvedValue({data:[{has_access:true,status:"active"}],error:null});
    mocks.roles.mockResolvedValue({data:[{role:"vault_access"}],error:null});
    show();
    expect(await screen.findByText("Full Access activated.")).toBeInTheDocument();
    expect(mocks.auth.refetchProfile).toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Continue to your Vault"}));
    expect(mocks.navigate).toHaveBeenCalledWith("/academy/home",{replace:true});
  });
  it("does not trust a cached paid role when server access is missing",async()=>{
    mocks.rpc.mockResolvedValue({data:[{has_access:false,status:"none"}],error:null});
    mocks.roles.mockResolvedValue({data:[{role:"vault_access"}],error:null});
    show();
    await waitFor(()=>expect(mocks.roles).toHaveBeenCalled());
    expect(screen.queryByText("Full Access activated.")).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("keeps waiting if webhook access exists but the role write is delayed",async()=>{
    mocks.rpc.mockResolvedValue({data:[{has_access:true,status:"active"}],error:null});
    mocks.roles.mockResolvedValue({data:[{role:"basic_tier"}],error:null});
    show();
    await waitFor(()=>expect(mocks.roles).toHaveBeenCalled());
    expect(screen.queryByText("Full Access activated.")).not.toBeInTheDocument();
  });
  it("times out stalled requests safely and offers retry, not another purchase",async()=>{
    vi.useFakeTimers();
    mocks.rpc.mockImplementation(()=>new Promise(()=>{}));
    show();
    await act(async()=>{vi.advanceTimersByTime(60_000);});
    expect(screen.getByText("Still confirming access.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Check access again"}));
    expect(screen.getByText("Confirming your membership.")).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("preserves the confirmation destination when a session has expired",()=>{
    mocks.auth.user=null;
    show();
    expect(screen.getByRole("link",{name:"Log in to continue"})).toHaveAttribute("href","/auth?resume=membership");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("ignores a stalled request that finishes after the verification deadline",async()=>{
    vi.useFakeTimers();
    let finish:(value:unknown)=>void;
    mocks.rpc.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
    show();
    await act(async()=>{vi.advanceTimersByTime(60_000);});
    await act(async()=>{finish!({data:[{has_access:true,status:"active"}],error:null});});
    expect(mocks.roles).not.toHaveBeenCalled();
    expect(screen.getByText("Still confirming access.")).toBeInTheDocument();
  });
});
