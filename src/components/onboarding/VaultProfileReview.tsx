import { Pencil } from "lucide-react";
import { ChatAvatar } from "@/lib/chatAvatars";
import "./vault-profile-review.css";

export function VaultProfileReview({ avatarUrl, displayName, fullName, experience, goal, onEditAvatar }: {
  avatarUrl: string | null; displayName: string; fullName: string;
  experience: string; goal: string; onEditAvatar: () => void;
}) {
  return <section className="vault-profile-review" aria-label="Your profile preview">
    <div className="vault-review-heading"><span>YOUR NEXT CHAPTER</span><h2>Make yourself at home.</h2><p>Your people. Your progress. Your Vault.</p></div>
    <div className="vault-review-identity">
      <button type="button" className="vault-review-avatar" onClick={onEditAvatar} aria-label="Change your selected avatar">
        <ChatAvatar avatarUrl={avatarUrl || "initials:hsl(217, 91%, 60%)"} userName={displayName || "Trader"} size="h-24 w-24"/>
        <span className="vault-review-edit"><Pencil size={13}/></span>
      </button>
      <div className="vault-review-name"><span>YOUR VAULT PROFILE</span><strong>{displayName || "Trader"}</strong><small>{fullName}</small></div>
    </div>
    <div className="vault-review-details"><div><span>STARTING POINT</span><strong>{experience}</strong></div><div><span>YOUR FOCUS</span><strong>{goal}</strong></div></div>
  </section>;
}
