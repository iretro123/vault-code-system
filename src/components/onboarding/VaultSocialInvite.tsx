import { useId } from "react";
import { ArrowUpRight } from "lucide-react";
import "./vault-social-invite.css";

const channels = [
  { brand: "youtube", name: "YouTube", description: "Go deeper with RZ.", action: "Explore channel", href: "https://www.youtube.com/@rubenzamora__" },
  { brand: "instagram", name: "Instagram", description: "Stay close to the journey.", action: "View profile", href: "https://www.instagram.com/rubenzamora__/" },
  { brand: "facebook", name: "Facebook group", description: "Vault Trading Academy Group", action: "Explore group", href: "https://www.facebook.com/groups/4746879002265101" },
];

function BrandMark({ brand }: { brand: string }) {
  const gradient = useId();
  if (brand === "youtube") return <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="9" width="44" height="30" rx="9" fill="#FF0033"/><path d="M20 16.5 32 24 20 31.5Z" fill="white"/></svg>;
  if (brand === "facebook") return <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#0866FF"/><path d="M27 48V29h6.4l1-7.5H27v-4.8c0-2.2.6-3.7 3.8-3.7H35V6.3c-.7-.1-3.2-.3-6.1-.3-6 0-10.1 3.6-10.1 10.3v5.2H12V29h6.8v19Z" fill="white"/></svg>;
  return <svg viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id={gradient} cx=".25" cy="1" r="1.2"><stop stopColor="#FFD776"/><stop offset=".28" stopColor="#F56040"/><stop offset=".58" stopColor="#E1306C"/><stop offset=".8" stopColor="#C13584"/><stop offset="1" stopColor="#5851DB"/></radialGradient></defs><rect width="48" height="48" rx="13" fill={`url(#${gradient})`}/><rect x="10" y="10" width="28" height="28" rx="9" fill="none" stroke="white" strokeWidth="3"/><circle cx="24" cy="24" r="7" fill="none" stroke="white" strokeWidth="3"/><circle cx="33" cy="15" r="2" fill="white"/></svg>;
}

export function VaultSocialInvite() {
  return (
    <details className="vault-social-invite" open>
      <summary>
        <span><strong>Your circle. Expanded.</strong><small>A little more learning. A lot more connection.</small></span>
        <span className="vault-social-optional">Optional <span aria-hidden="true">+</span></span>
      </summary>
      <div className="vault-social-links">
        {channels.map(({ brand, name, description, action, href }) => (
          <a className={`vault-social-card vault-social-card--${brand}`} key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${name} (opens in a new tab)`}>
            <span className="vault-social-icon"><BrandMark brand={brand}/></span>
            <span className="vault-social-copy"><strong>{name}</strong><small>{description}</small>{brand === "facebook" && <span className="vault-social-private">PRIVATE COMMUNITY</span>}</span>
            <span className="vault-social-link-action">{action}<ArrowUpRight size={16} aria-hidden="true" /></span>
          </a>
        ))}
        <p>Explore if you like. Following is always your choice.</p>
      </div>
    </details>
  );
}
