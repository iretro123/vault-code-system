/**
 * Derives three short "what you'll learn" bullets for a lesson.
 * Keyword-matched against the lesson/module title so every lesson gets clean,
 * relevant takeaways with no manual data entry and no AI cost.
 */

type Rule = { match: RegExp; bullets: [string, string, string] };

const RULES: Rule[] = [
  {
    match: /supply\s*(&|and)?\s*demand/i,
    bullets: [
      "Install and set up the Vault Supply & Demand indicator",
      "Read the zones price actually reacts to",
      "Know which zones to skip and why",
    ],
  },
  {
    match: /paper|replay|practice/i,
    bullets: [
      "Practice full trades without risking money",
      "Use replay mode to rehearse your entries",
      "Build reps before you go live",
    ],
  },
  {
    match: /alert/i,
    bullets: [
      "Set up your charts the clean way",
      "Build alerts so you stop staring at screens",
      "Get notified only on the levels that matter",
    ],
  },
  {
    match: /tradingview|setup|install/i,
    bullets: [
      "Get your charting platform set up correctly",
      "Keep only the tools that help you decide",
      "Save a layout you can reuse every day",
    ],
  },
  {
    match: /watchlist|pick stocks|scan/i,
    bullets: [
      "Build a short, focused daily watchlist",
      "Spot the names actually worth your attention",
      "Cut the noise and avoid random tickers",
    ],
  },
  {
    match: /indicator/i,
    bullets: [
      "Know which indicators are worth using",
      "Understand what each one is really telling you",
      "Clear the clutter off your charts",
    ],
  },
  {
    match: /option/i,
    bullets: [
      "Understand calls, puts, and expiration basics",
      "See how contracts gain and lose value",
      "Know the risks before you place one",
    ],
  },
  {
    match: /mark\s*up|markup|chart|level|support|resistance/i,
    bullets: [
      "Mark up a chart the simple, repeatable way",
      "Find the levels that matter before the open",
      "Turn your markup into an actual plan",
    ],
  },
  {
    match: /risk|position siz|stop/i,
    bullets: [
      "Size a trade so one loss can't hurt you",
      "Place stops with a reason, not a feeling",
      "Protect your account on your worst days",
    ],
  },
  {
    match: /psycholog|discipline|mindset|emotion|tilt/i,
    bullets: [
      "Spot the emotions that cost you money",
      "Build rules that hold under pressure",
      "Reset properly after a losing trade",
    ],
  },
  {
    match: /journal|review|log/i,
    bullets: [
      "Log a trade so it's actually useful later",
      "Find the patterns hiding in your results",
      "Turn every week into one fix",
    ],
  },
  {
    match: /entry|entries|execution|trigger/i,
    bullets: [
      "Recognize a clean entry trigger",
      "Wait for confirmation instead of guessing",
      "Skip the setups that aren't yours",
    ],
  },
];

const FALLBACK: [string, string, string] = [
  "The core idea, explained in plain English",
  "How to apply it on a real chart",
  "The common mistake to avoid",
];

export function getLessonTakeaways(lessonTitle: string, moduleTitle?: string): string[] {
  const haystack = `${lessonTitle} ${moduleTitle || ""}`;
  const hit = RULES.find((r) => r.match.test(haystack));
  return hit ? hit.bullets : FALLBACK;
}
