import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loginErrorKind, loginErrorText } from "@/lib/authErrorMessage";
import { activationLinkFailed } from "@/pages/ActivateReturn";

const m = vi.hoisted(() => ({ user: null as null | { id: string; email: string }, loading: false, signUp: vi.fn(), resend: vi.fn(), signIn: vi.fn(), otp: vi.fn(), invoke: vi.fn(), toast: vi.fn(), platform: "web" }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: m.user, loading: m.loading, signIn: m.signIn, refetchProfile: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock("@/lib/guestMode", () => ({ disableGuestMode: vi.fn(), enableGuestMode: vi.fn() }));
vi.mock("@/lib/platform", () => ({ isNativeIOSApp: () => m.platform === "ios", isNativeAndroidApp: () => m.platform === "android", isNativeCapacitorApp: () => m.platform !== "web" }));
vi.mock("@/lib/ensureProfile", () => ({ ensureProfile: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { signUp: m.signUp, resend: m.resend, signInWithOtp: m.otp, signOut: vi.fn(), resetPasswordForEmail: vi.fn(), setSession: vi.fn() },
  functions: { invoke: m.invoke }, from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
} }));

import CreateAccount from "@/pages/CreateAccount";
import Auth from "@/pages/Auth";
import ActivateReturn from "@/pages/ActivateReturn";

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); m.user = null; m.platform = "web"; });

const fillSignup = () => {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: " Typo@Example.com " } });
  fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "example-test-only" } });
  fireEvent.click(screen.getByRole("checkbox"));
};

describe("login error recovery", () => {
  it("never distinguishes unknown email from wrong password", () => {
    const a = loginErrorText({ message: "Invalid login credentials" });
    expect(a).toMatch(/didn't match/);
    expect(a).not.toMatch(/no account|not found|doesn't exist/i);
    expect(loginErrorKind({ code: "email_not_confirmed" })).toBe("unconfirmed");
    expect(loginErrorText({ message: "" })).toMatch(/couldn't reach/);
  });
  it("shows inline recovery and cross-links on the login page", async () => {
    m.signIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/welcome?step=access");
    expect(screen.getByRole("link", { name: /Already paid through Stripe/ })).toHaveAttribute("href", "/activate-return");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "x@y.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/didn't match/);
    expect(screen.getByRole("button", { name: "Reset password" })).toBeInTheDocument();
  });
  it.each(["ios","android"])("shows neutral membership recovery with no sales wording on %s", (platform) => {
    m.platform = platform;
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Connect your existing membership" })).toHaveAttribute("href", "/activate-return");
    expect(screen.queryByText(/Already paid through Stripe/)).toBeNull();
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/\$\d|\/month|Get full access|Buy|Subscribe|checkout|Restore (Apple|Google)/i);
    expect(Array.from(document.querySelectorAll("a")).every(a => !/^https?:/.test(a.getAttribute("href") || "") || /mailto/.test(a.href))).toBe(true);
    m.platform = "web";
  });
});

describe("signup confirmation recovery", () => {
  it("ignores duplicate submits, normalizes email, and treats an existing-account response like any other", async () => {
    let resolve!: (v: unknown) => void;
    m.signUp.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<MemoryRouter initialEntries={["/create-account"]}><CreateAccount /></MemoryRouter>);
    fillSignup();
    const submit = screen.getByRole("button", { name: /Create free account/ });
    fireEvent.click(submit); fireEvent.click(submit);
    expect(m.signUp).toHaveBeenCalledTimes(1);
    expect(m.signUp.mock.calls[0][0].email).toBe("typo@example.com");
    // Obfuscated response for an existing account: user with no identities, no session.
    await act(async () => resolve({ data: { user: { id: "x", identities: [] }, session: null }, error: null }));
    expect(await screen.findByText("Check your email.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/link sent to|we sent/i);
    expect(screen.getByText(/already has a Vault account, log in or reset/)).toBeInTheDocument();
  });
  it("resend has a cooldown and change-email returns to the form with the email kept", async () => {
    m.signUp.mockResolvedValue({ data: { user: { id: "x" }, session: null }, error: null });
    m.resend.mockResolvedValue({ error: null });
    render(<MemoryRouter initialEntries={["/create-account"]}><CreateAccount /></MemoryRouter>);
    fillSignup();
    fireEvent.click(screen.getByRole("button", { name: /Create free account/ }));
    const resend = await screen.findByRole("button", { name: /Resend email in \d+s/ });
    expect(resend).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(screen.getByLabelText("Email")).toHaveValue("typo@example.com");
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue("");
    expect(m.resend).not.toHaveBeenCalled();
  });
  it("sends signed-in members away from creating another account; full flow goes to the membership check", () => {
    m.user = { id: "u", email: "paid@x.com" };
    render(<MemoryRouter initialEntries={["/create-account/full"]}><Routes><Route path="/create-account/full" element={<CreateAccount />} /><Route path="/membership" element={<p>membership check</p>} /></Routes></MemoryRouter>);
    expect(screen.getByText("membership check")).toBeInTheDocument();
    expect(m.signUp).not.toHaveBeenCalled();
  });
});

describe("paid activation recovery", () => {
  const renderActivate = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><ActivateReturn /></MemoryRouter></QueryClientProvider>);
  it("detects expired or already-used email links", () => {
    expect(activationLinkFailed("?error=access_denied&error_code=otp_expired", "")).toBe(true);
    expect(activationLinkFailed("", "#error_description=Email+link+is+invalid+or+has+expired")).toBe(true);
    expect(activationLinkFailed("", "#access_token=abc")).toBe(false);
  });
  it("signed-out visitors never trigger a payment check; sending a link shows waiting, resend cooldown and change email", async () => {
    m.otp.mockResolvedValue({ error: null });
    renderActivate();
    expect(m.invoke).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Your checkout email"), { target: { value: "Buyer@X.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Email my sign-in link/ }));
    expect(await screen.findByText(/We sent a sign-in link to/)).toBeInTheDocument();
    expect(m.otp.mock.calls[0][0].email).toBe("buyer@x.com");
    expect(screen.getByRole("button", { name: /Resend in \d+s/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Wrong email/ }));
    expect(screen.getByLabelText("Your checkout email")).toHaveValue("buyer@x.com");
    expect(m.invoke).not.toHaveBeenCalled();
  });
  it("a password-only session is signed out and asked for a fresh email link; payment status is not revealed", async () => {
    m.user = { id: "u", email: "a@b.com" };
    m.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: "fresh_email_link_required" })) } });
    renderActivate();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/confirm your email/));
    expect(screen.getByRole("status").textContent).not.toMatch(/found|paid|active/i);
  });
  it("success copy has no technical security jargon and offers app login setup", async () => {
    m.user = { id: "u", email: "a@b.com" };
    m.invoke.mockResolvedValue({ data: { success: true, secured: true }, error: null });
    renderActivate();
    await waitFor(() => expect(screen.getByRole("button", { name: "Set up app login" })).toBeInTheDocument());
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/password was cleared|secured|session (was|is) |signed out and any earlier/i);
  });
});

describe("reset=1 deep link", () => {
  it("opens forgot-password mode", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");
    const Auth = (await import("@/pages/Auth")).default;
    window.history.replaceState({}, "", "/auth?reset=1");
    render(<MemoryRouter initialEntries={["/auth?reset=1"]}><Auth/></MemoryRouter>);
    expect(await screen.findByText("Let's get you back in.")).toBeInTheDocument();
  });
});
