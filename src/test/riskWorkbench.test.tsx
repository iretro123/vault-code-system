import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MarketPlanner } from "@/components/trade-os/RiskWorkbench";
import { examplePlan } from "@/lib/tradeRisk";

const key = "vault-risk-v1:qa-user:options";
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe("daily local risk plans", () => {
  it("requires verification before saving and invalidates it after an edit", () => {
    render(<MarketPlanner market="options" accountKey="qa-user"/>);
    fireEvent.click(screen.getByRole("button", {name:"Try an example"}));
    const save = screen.getByRole("button",{name:"Save today’s plan"});
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(save).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText("My daily loss budget · USD"), {target:{value:"80"}});
    expect(save).toBeDisabled();
  });
  it("saves only in the user/market local namespace and reloads unverified", () => {
    const view=render(<MarketPlanner market="options" accountKey="qa-user"/>);
    fireEvent.click(screen.getByRole("button", {name:"Try an example"}));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button",{name:"Save today’s plan"}));
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({balance:"10000",example:false});
    expect(localStorage.getItem("vault-risk-v1:another-user:options")).toBeNull();
    expect(localStorage.getItem("vault-risk-v1:qa-user:forex")).toBeNull();
    view.unmount(); render(<MarketPlanner market="options" accountKey="qa-user"/>);
    expect(screen.getByLabelText("Morning account balance · USD")).toHaveValue(10000);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("blocks old-date plan reuse until the session date is updated", () => {
    localStorage.setItem(key,JSON.stringify({...examplePlan("options"),date:"2000-01-01"}));
    render(<MarketPlanner market="options" accountKey="qa-user"/>);
    expect(screen.getByText(/This plan is dated/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button",{name:"Save today’s plan"})).toBeDisabled();
    expect(screen.getByText("Complete your inputs to see a size.")).toBeInTheDocument();
  });
  it("recovers from corrupt saved data", () => {
    localStorage.setItem(key,"not-json");
    render(<MarketPlanner market="options" accountKey="qa-user"/>);
    expect(screen.getByLabelText("Morning account balance · USD")).toHaveValue(null);
  });
});
