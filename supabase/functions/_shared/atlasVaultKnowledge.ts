/** Curated public directory. Channel identity verified from RZ's YouTube profile.
 * These are selected resources, not a live feed or a transcript index. */
export const VAULT_PUBLIC_RESOURCES = {
  instagram:{label:'RZ on Instagram',url:'https://www.instagram.com/rubenzamora__/'},
  youtube:{label:'RZ on YouTube',url:'https://www.youtube.com/@rubenzamora__'},
  setup:{label:'TradingView setup · RZ',url:'https://www.youtube.com/watch?v=QqSeDPpJY0Q'},
  structure:{label:'Chart markup walkthrough · RZ',url:'https://www.youtube.com/watch?v=DAWv527aYqg'},
  demand:{label:'Supply & demand zones · RZ',url:'https://www.youtube.com/watch?v=-_nlVEipvJE'},
} as const;

export const VAULT_APP_KNOWLEDGE = `Vault OS / Vault Academy is RZ (Ruben Zamora)'s trading learning app.
Learn: chapters and individual video lessons. Open a chapter, then choose a lesson. Not every planned lesson has a video. Do not promise unavailable content.
Trading Setup: chart/platform setup guidance. Trade OS: risk-planning tools, not a broker or order execution system.
Vault Live: classroom schedule and joining information; check that page for current times rather than guessing.
Community: Chat, Signals and Wins. Signals are community content, not guaranteed results. Messages is the member DM area; access and delivery depend on account/backend availability.
Settings > My profile: profile, bio and social links. Support: human coaching / Schedule 1:1. Do not claim to book a call or change settings.
Public directory: RZ on Instagram @rubenzamora__; RZ on YouTube @rubenzamora__. Selected public videos cover TradingView setup, chart markup and supply/demand. The app renders verified resource links separately. Never invent a handle, video title, timestamp, endorsement, transcript, new upload or claim to have watched content not provided.
Answer the learner first. Mention at most one relevant resource when it helps or they ask. No repetitive follow/subscribe pitches, urgency or pressure after losses. This directory is not all Vault content and is not live browsing.`;

export function vaultResourceFor(question:string){
  if(/\b(instagram|insta|ig)\b/i.test(question))return VAULT_PUBLIC_RESOURCES.instagram;
  if(/\b(youtube|socials?|channel)\b/i.test(question))return VAULT_PUBLIC_RESOURCES.youtube;
  if(!/\b(video|watch|tutorial|walkthrough)\b/i.test(question))return undefined;
  if(/demand|supply|zone/i.test(question))return VAULT_PUBLIC_RESOURCES.demand;
  if(/structure|markup|mark up/i.test(question))return VAULT_PUBLIC_RESOURCES.structure;
  if(/tradingview|setup|set up/i.test(question))return VAULT_PUBLIC_RESOURCES.setup;
  return VAULT_PUBLIC_RESOURCES.youtube;
}
