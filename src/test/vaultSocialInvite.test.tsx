import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VaultSocialInvite } from "@/components/onboarding/VaultSocialInvite";

describe("optional onboarding social invitation", () => {
  it("shows the social links immediately and never requires a follow", () => {
    const { container } = render(<VaultSocialInvite />);
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByText(/Following is always your choice/)).toBeInTheDocument();
    expect(container.querySelector("input")).toBeNull();
  });

  it("uses configured channels without claiming account connections or follow verification", () => {
    const { container } = render(<VaultSocialInvite />);
    const links = [...container.querySelectorAll("a")];
    expect(links.map(link => link.href)).toEqual([
      "https://www.youtube.com/@rubenzamora__",
      "https://www.instagram.com/rubenzamora__/",
      "https://www.facebook.com/groups/4746879002265101",
    ]);
    for (const link of links) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
