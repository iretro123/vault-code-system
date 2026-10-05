import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateAccount from "@/pages/CreateAccount";
import { WebMembershipCheckout } from "@/components/academy/WebMembershipCheckout";
const mocks = vi.hoisted(()=>({platform:"web", signUp:vi.fn(), getUser:vi.fn(), invoke:vi.fn(), toast:vi.fn()}));
vi.mock("@/lib/platform",()=>({isNativeIOSApp:()=>mocks.platform === "ios",isNativeAndroidApp:()=>mocks.platform === "android",isNativeCapacitorApp:()=>mocks.platform !== "web"}));
vi.mock("@/hooks/use-toast",()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock("@/hooks/useAuth",()=>({useAuth:()=>({user:null,loading:false})}));
vi.mock("@/lib/guestMode",()=>({disableGuestMode:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{signUp:mocks.signUp,getUser:mocks.getUser},functions:{invoke:mocks.invoke}}}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe("signup and web billing handoff",()=>{
  it("disables all payment actions in the local preview",()=>{
    render(<MemoryRouter><WebMembershipCheckout email="you@example.com" preview/></MemoryRouter>);
    const button = screen.getByRole("button",{name:/Continue to Stripe/});
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Payments disabled");
  });
  it.each([['web','Stripe'],['ios','Apple'],['android','Google Play']])("names the correct payment provider on %s",(platform,provider)=>{
    mocks.platform=platform;
    render(<MemoryRouter initialEntries={["/create-account/full"]}><CreateAccount/></MemoryRouter>);
    expect(screen.getByText(new RegExp(`through ${provider} next`))).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete","username");
    expect(screen.getByLabelText("Password",{exact:true})).toHaveAttribute("autocomplete","new-password");
    fireEvent.click(screen.getByRole("button",{name:"Show password"}));
    expect(screen.getByLabelText("Password",{exact:true})).toHaveAttribute("type","text");
  });
  it("shows email verification instead of implying payment is complete",async()=>{
    mocks.platform="web";
    mocks.signUp.mockResolvedValue({data:{user:{id:"test"},session:null},error:null});
    render(<MemoryRouter initialEntries={["/create-account/full"]}><CreateAccount/></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"),{target:{value:"tester@example.com"}});
    fireEvent.change(screen.getByLabelText("Password",{exact:true}),{target:{value:"example-test-only"}});
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:/Create account & continue/}));
    expect(await screen.findByText("Check your email.")).toBeInTheDocument();
    expect(screen.getByText(/This step doesn’t charge you\. Already paid\? Connect your membership below\./)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/No purchase has been made/);
    expect(screen.getByRole("link",{name:/Already paid through Stripe/})).toHaveAttribute("href","/activate-return");
    expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toContain("/membership");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("blocks checkout when the displayed account does not match the session",async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{email:"someone-else@example.com"}},error:null});
    render(<MemoryRouter><WebMembershipCheckout email="tester@example.com"/></MemoryRouter>);
    fireEvent.click(screen.getByRole("button",{name:/Continue to Stripe/}));
    expect(await screen.findByRole("alert")).toHaveTextContent("log in again");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("uses the existing function and surfaces errors for retry",async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{email:"tester@example.com"}},error:null});
    mocks.invoke.mockResolvedValue({data:null,error:new Error("unavailable")});
    render(<MemoryRouter><WebMembershipCheckout email="tester@example.com"/></MemoryRouter>);
    fireEvent.click(screen.getByRole("button",{name:/Continue to Stripe/}));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledWith("create-checkout"));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be started");
    expect(screen.getByRole("button",{name:/Continue to Stripe/})).toBeEnabled();
  });
  it.each([["ios"],["android"]])("native signup email links go to the member site, not the app's local origin (%s)",async(platform)=>{
    mocks.platform=platform;
    mocks.signUp.mockResolvedValue({data:{user:{id:"t"},session:null},error:null});
    render(<MemoryRouter initialEntries={["/create-account/full"]}><CreateAccount/></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"),{target:{value:"t@example.com"}});
    fireEvent.change(screen.getByLabelText("Password",{exact:true}),{target:{value:"example-test-only"}});
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:/Create account & continue/}));
    await screen.findByText("Check your email.");
    expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toBe("https://member.vaulttradingacademy.com/membership");
    expect(screen.getByRole("link",{name:"Connect your existing membership"})).toHaveAttribute("href","/activate-return");
    mocks.platform="web";
  });
});
