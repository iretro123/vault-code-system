import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccessBlockModal } from "@/components/academy/AccessBlockModal";

const mocks=vi.hoisted(()=>({invoke:vi.fn(),error:vi.fn(),ios:false,android:false}));
vi.mock("@/lib/platform",()=>({isNativeIOSApp:()=>mocks.ios,isNativeAndroidApp:()=>mocks.android}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{functions:{invoke:mocks.invoke},auth:{signOut:vi.fn()}}}));
vi.mock("sonner",()=>({toast:{error:mocks.error,info:vi.fn()}}));
afterEach(()=>{cleanup();vi.clearAllMocks();mocks.ios=false;mocks.android=false;});

describe("membership recovery",()=>{
  it("does not start a new checkout when the billing portal fails",async()=>{
    mocks.invoke.mockResolvedValueOnce({data:null,error:new Error("Network failure")});
    render(<AccessBlockModal status="past_due" refetch={vi.fn()}/>);
    fireEvent.click(screen.getByRole("button",{name:"Update Billing"}));
    await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith("create-billing-portal");
  });
  it("offers refresh rather than repurchase for an unconfirmed membership",async()=>{
    const refresh=vi.fn().mockResolvedValue(undefined);
    render(<AccessBlockModal status="none" refetch={refresh}/>);
    expect(screen.queryByText("Subscription canceled")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Reactivate Account"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Check access again"}));
    await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("disables refresh while waiting and recovers from a network error",async()=>{
    let reject:(reason:Error)=>void;
    const refresh=vi.fn(()=>new Promise<void>((_,fail)=>{reject=fail;}));
    render(<AccessBlockModal status="canceled" refetch={refresh}/>);
    fireEvent.click(screen.getByRole("button",{name:"Check access again"}));
    expect(screen.getByRole("button",{name:"Checking access..."})).toBeDisabled();
    reject!(new Error("offline"));
    await waitFor(()=>expect(mocks.error).toHaveBeenCalled());
    expect(screen.getByRole("button",{name:"Check access again"})).toBeEnabled();
  });
  it.each(["ios", "android"] as const)("keeps %s recovery separate from web checkout",async(platform)=>{
    mocks[platform]=true;
    const refresh=vi.fn().mockResolvedValue(undefined);
    render(<AccessBlockModal status="past_due" refetch={refresh}/>);
    fireEvent.click(screen.getByRole("button",{name:"Check access again"}));
    await waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
    expect(screen.queryByRole("button",{name:"Update Billing"})).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
