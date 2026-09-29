import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VaultTourCarousel } from "@/components/onboarding/VaultTourCarousel";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("shows the matching screenshot and supports forward/backward navigation", () => {
  const complete = vi.fn();
  render(<VaultTourCarousel onComplete={complete}/>);
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('home.png'));
  fireEvent.click(screen.getByRole('button', {name:'Next tour feature'}));
  expect(screen.getByRole('heading', {name:'Build skill. One lesson at a time.'})).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('learn.png'));
  fireEvent.click(screen.getByRole('button', {name:'Previous tour feature'}));
  expect(screen.getByRole('heading', {name:'Start every day HERE.'})).toBeInTheDocument();
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Continue'}));
  expect(complete).toHaveBeenCalledTimes(1);
});

it("automatically tours all six screens without submitting the onboarding", () => {
  vi.useFakeTimers();
  const complete = vi.fn();
  render(<VaultTourCarousel onComplete={complete}/>);
  for (const file of ['learn','community','live','trade','coach','home']) {
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining(`${file}.png`));
  }
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Pause tour'}));
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('home.png'));
});
