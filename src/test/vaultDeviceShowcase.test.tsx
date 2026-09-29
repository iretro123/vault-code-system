import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VaultProductPreview } from "@/components/onboarding/VaultProductPreview";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Vault device showcase", () => {
  it("autoplays three screenshot scenes over eighteen seconds", () => {
    vi.useFakeTimers();
    render(<VaultProductPreview />);
    expect(screen.getByText("Your people. Your trading floor.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Share the moment. Learn the lesson.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Show up. Ask. Learn together.")).toBeInTheDocument();
    expect(screen.getByAltText("Vault iPhone preview: member-shared wins")).toHaveAttribute("src", expect.stringContaining("intro-wins"));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Your people. Your trading floor.")).toBeInTheDocument();
  });

  it("continues after scene selection but honors explicit pause", () => {
    vi.useFakeTimers();
    render(<VaultProductPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Show The wins" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause preview" }));
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByText("Share the moment. Learn the lesson.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play preview" }));
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText("Show up. Ask. Learn together.")).toBeInTheDocument();
  });

  it("cycles screenshots without motion when reduced motion is requested", () => {
    vi.useFakeTimers();
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ ...original(query), matches: true }));
    render(<VaultProductPreview />);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole("button", { name: "Pause preview" })).toBeInTheDocument();
    expect(screen.getByText("Share the moment. Learn the lesson.")).toBeInTheDocument();
    expect(document.querySelector('.vault-film')).toHaveAttribute('data-reduced-motion', 'true');
  });
});
