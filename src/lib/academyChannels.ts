import { Hash, TrendingUp, BookOpen, Trophy, HelpCircle, Coffee, LucideIcon } from "lucide-react";

export interface Channel {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  readOnly: boolean;
  /** If true, channel is hidden under "More" by default */
  collapsed?: boolean;
  /** Require structured fields before sending */
  guardrails?: "setup" | "win";
}

export const CHANNELS: Channel[] = [
  {
    slug: "trade-floor",
    name: "trade-floor",
    description: "General trading discussion & market talk",
    icon: Hash,
    readOnly: false,
  },
  {
    slug: "setups",
    name: "setups",
    description: "Share structured trade setups: Ticker · Risk · Thesis",
    icon: TrendingUp,
    readOnly: false,
    guardrails: "setup",
  },
  {
    slug: "journals",
    name: "journals",
    description: "Daily journals & end-of-day reflections",
    icon: BookOpen,
    readOnly: false,
  },
  {
    slug: "wins-proof",
    name: "wins-proof",
    description: "Post proof of wins with screenshots",
    icon: Trophy,
    readOnly: false,
    guardrails: "win",
  },
  {
    slug: "questions",
    name: "questions",
    description: "Ask the community anything about trading",
    icon: HelpCircle,
    readOnly: false,
  },
  {
    slug: "daily-setups",
    name: "daily-setups",
    description: "Daily market setups shared by coaches — read-only for members",
    icon: TrendingUp,
    readOnly: true,
  },
  {
    slug: "off-topic",
    name: "off-topic",
    description: "Non-trading chat — keep it friendly",
    icon: Coffee,
    readOnly: false,
    collapsed: true,
  },
];

export function getChannelBySlug(slug: string): Channel | undefined {
  return CHANNELS.find((c) => c.slug === slug);
}
