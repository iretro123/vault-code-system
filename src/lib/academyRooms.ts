import { Megaphone, Rocket, Coffee, BarChart3, HelpCircle, LucideIcon } from "lucide-react";

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
    slug: "start-here",
    name: "Start Here",
    description: "Introduce yourself and get oriented",
    icon: Rocket,
    readOnly: false,
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
  {
    slug: "ask-coach",
    name: "Ask a Coach",
    description: "Get guidance from experienced mentors",
    icon: HelpCircle,
    readOnly: false,
  },
];

export function getRoomBySlug(slug: string): AcademyRoom | undefined {
  return ACADEMY_ROOMS.find((r) => r.slug === slug);
}
