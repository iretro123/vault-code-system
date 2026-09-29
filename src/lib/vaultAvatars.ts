import pixelFinn from "@/assets/vault-avatars/pixel-finn.png";
import chartHop from "@/assets/vault-avatars/chart-hop.png";
import goldieBull from "@/assets/vault-avatars/goldie-bull.png";
import nightShift from "@/assets/vault-avatars/night-shift.png";
import sparkWolf from "@/assets/vault-avatars/spark-wolf.png";
import marketOwl from "@/assets/vault-avatars/market-owl.png";
import breakoutPanda from "@/assets/vault-avatars/breakout-panda.png";
import candleDrake from "@/assets/vault-avatars/candle-drake.png";
import orbitCat from "@/assets/vault-avatars/orbit-cat.png";
import blueChipGorilla from "@/assets/vault-avatars/blue-chip-gorilla.png";
import tickerBot from "@/assets/vault-avatars/ticker-bot.png";
import vaultRaven from "@/assets/vault-avatars/vault-raven.png";

export interface VaultAvatar { id: string; name: string; personality: string; image: string; }

export const VAULT_AVATARS: VaultAvatar[] = [
  { id: "pixel-finn", name: "Pixel Finn", personality: "Fast thinker", image: pixelFinn },
  { id: "chart-hop", name: "Chart Hop", personality: "Trend spotter", image: chartHop },
  { id: "goldie-bull", name: "Goldie", personality: "Bullish energy", image: goldieBull },
  { id: "night-shift", name: "Night Shift", personality: "Quiet focus", image: nightShift },
  { id: "spark-wolf", name: "Spark", personality: "Momentum mode", image: sparkWolf },
  { id: "market-owl", name: "Market Owl", personality: "Patient analyst", image: marketOwl },
  { id: "breakout-panda", name: "Breakout", personality: "Bold moves", image: breakoutPanda },
  { id: "candle-drake", name: "Candle Drake", personality: "Zone keeper", image: candleDrake },
  { id: "orbit-cat", name: "Orbit", personality: "Big-picture view", image: orbitCat },
  { id: "blue-chip-gorilla", name: "Blue Chip", personality: "Calm strength", image: blueChipGorilla },
  { id: "ticker-bot", name: "Ticker", personality: "Always online", image: tickerBot },
  { id: "vault-raven", name: "Vault Raven", personality: "Sharp observer", image: vaultRaven },
];
