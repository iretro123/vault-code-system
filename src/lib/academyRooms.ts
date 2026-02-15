import { Megaphone, Coffee, BarChart3, LucideIcon } from "lucide-react";

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
    name: "Options Lounge",
    description: "Discuss options strategies and setups",
    icon: Coffee,
    readOnly: false,
  },
  {
    slug: "trade-recaps",
    name: "Trade Recaps",
    description: "Share and review your daily trades",
    icon: BarChart3,
    readOnly: false,
  },
];

export function getRoomBySlug(slug: string): AcademyRoom | undefined {
  return ACADEMY_ROOMS.find((r) => r.slug === slug);
}
