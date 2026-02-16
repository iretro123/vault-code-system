import { Megaphone, MessageCircle, BarChart3, LucideIcon } from "lucide-react";

export interface AcademyRoom {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  readOnly: boolean; // true = only admin can post
}

export const ACADEMY_ROOMS: AcademyRoom[] = [
  {
    slug: "announcements",
    name: "Announcements",
    description: "Official updates from the Vault Academy team",
    icon: Megaphone,
    readOnly: true,
  },
  {
    slug: "options-lounge",
    name: "Trading Chat",
    description: "Discuss trading strategies and setups",
    icon: MessageCircle,
    readOnly: false,
  },
  {
    slug: "trade-recaps",
    name: "Post a Trade",
    description: "Share your trades with the community",
    icon: BarChart3,
    readOnly: false,
  },
];

export function getRoomBySlug(slug: string): AcademyRoom | undefined {
  return ACADEMY_ROOMS.find((r) => r.slug === slug);
}
