import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VaultProfileReview } from "@/components/onboarding/VaultProfileReview";
import { VAULT_AVATARS } from "@/lib/vaultAvatars";

const props = { displayName: "Alex", fullName: "Alex Rivera", experience: "Beginner", goal: "Build consistency", onEditAvatar: vi.fn() };
describe("profile review", () => {
  it("renders the selected character and updates when selection changes", () => {
    const { rerender } = render(<VaultProfileReview {...props} avatarUrl={`character:${VAULT_AVATARS[0].id}`}/>);
    expect(screen.getByAltText("Alex")).toHaveAttribute("src", VAULT_AVATARS[0].image);
    rerender(<VaultProfileReview {...props} avatarUrl={`character:${VAULT_AVATARS[1].id}`}/>);
    expect(screen.getByAltText("Alex")).toHaveAttribute("src", VAULT_AVATARS[1].image);
    fireEvent.click(screen.getByRole("button", {name:"Change your selected avatar"}));
    expect(props.onEditAvatar).toHaveBeenCalledOnce();
  });
  it("uses initials when no avatar is selected", () => {
    render(<VaultProfileReview {...props} avatarUrl={null}/>);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByLabelText("Vault member")).not.toBeInTheDocument();
  });
});
