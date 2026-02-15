import { Shield, Target, Brain, BookOpen, TrendingUp, Flame, LucideIcon } from "lucide-react";

export interface ModuleLesson {
  title: string;
  duration: string;
}

export interface AcademyModule {
  slug: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  lessons: ModuleLesson[];
  badge?: string;
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    slug: "discipline-foundations",
    title: "Discipline Foundations",
    subtitle: "Build the mental framework for consistent execution",
    icon: Shield,
    badge: "Start Here",
    lessons: [
      { title: "Why Discipline Beats Strategy", duration: "8 min" },
      { title: "The Cost of One Bad Trade", duration: "6 min" },
      { title: "Building Your Pre-Trade Routine", duration: "10 min" },
      { title: "The 3-Strike Rule", duration: "7 min" },
    ],
  },
  {
    slug: "risk-management",
    title: "Risk Management Mastery",
    subtitle: "Position sizing, stop placement, and capital protection",
    icon: Target,
    lessons: [
      { title: "Risk Per Trade: The 1% Rule", duration: "9 min" },
      { title: "Stop Loss Placement That Works", duration: "11 min" },
      { title: "Scaling In vs. All-In", duration: "8 min" },
      { title: "When to Sit Out", duration: "6 min" },
      { title: "Daily Loss Limits in Practice", duration: "7 min" },
    ],
  },
  {
    slug: "trading-psychology",
    title: "Trading Psychology",
    subtitle: "Control emotions and eliminate revenge trading",
    icon: Brain,
    lessons: [
      { title: "The Revenge Trade Trap", duration: "8 min" },
      { title: "FOMO and How to Beat It", duration: "7 min" },
      { title: "Handling Loss Streaks", duration: "9 min" },
      { title: "Confidence Without Ego", duration: "6 min" },
    ],
  },
  {
    slug: "rulebook-workshop",
    title: "Build Your Rulebook",
    subtitle: "Define, test, and refine your personal trading rules",
    icon: BookOpen,
    lessons: [
      { title: "What Makes a Good Rule", duration: "7 min" },
      { title: "Writing Your First 5 Rules", duration: "12 min" },
      { title: "Testing Rules on Paper", duration: "10 min" },
    ],
  },
  {
    slug: "performance-tracking",
    title: "Performance Tracking",
    subtitle: "Measure what matters and review with purpose",
    icon: TrendingUp,
    lessons: [
      { title: "Metrics That Actually Matter", duration: "8 min" },
      { title: "Weekly Review Framework", duration: "10 min" },
      { title: "Using Data to Find Leaks", duration: "9 min" },
    ],
  },
  {
    slug: "advanced-discipline",
    title: "Advanced Discipline",
    subtitle: "Elite-level consistency and process optimization",
    icon: Flame,
    badge: "Advanced",
    lessons: [
      { title: "Scaling Without Losing Discipline", duration: "11 min" },
      { title: "Multi-Session Management", duration: "9 min" },
      { title: "The 90-Day Discipline Sprint", duration: "13 min" },
    ],
  },
];

export function getModuleBySlug(slug: string): AcademyModule | undefined {
  return ACADEMY_MODULES.find((m) => m.slug === slug);
}
