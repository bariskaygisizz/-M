/** Invitation templates — cultural + celebration niches */

export const CATEGORIES = [
  "wedding",
  "engagement",
  "henna",
  "circumcision",
  "ballet",
  "graduation",
  "birthday",
  "baby",
  "opening",
];

export const TEMPLATES = [
  {
    id: "wedding-garden",
    category: "wedding",
    premium: false,
    palette: { bg: "#1c2a24", accent: "#c4a574", text: "#f4efe6", muted: "#b8c4bc" },
    layout: "classic",
  },
  {
    id: "wedding-ink",
    category: "wedding",
    premium: true,
    palette: { bg: "#14181f", accent: "#d4b896", text: "#f7f2ea", muted: "#9aa3b2" },
    layout: "editorial",
  },
  {
    id: "engagement-blush",
    category: "engagement",
    premium: false,
    palette: { bg: "#2a1f24", accent: "#e8a0b0", text: "#fff5f7", muted: "#c9b0b6" },
    layout: "classic",
  },
  {
    id: "henna-night",
    category: "henna",
    premium: false,
    palette: { bg: "#1a1210", accent: "#c45c26", text: "#f6e8d8", muted: "#b89a88" },
    layout: "ornate",
  },
  {
    id: "circumcision-festive",
    category: "circumcision",
    premium: false,
    palette: { bg: "#12202e", accent: "#5eb0d8", text: "#eef6fb", muted: "#9bb4c6" },
    layout: "festive",
  },
  {
    id: "circumcision-royal",
    category: "circumcision",
    premium: true,
    palette: { bg: "#101828", accent: "#d4af37", text: "#f8f1de", muted: "#a8b0c0" },
    layout: "ornate",
  },
  {
    id: "ballet-stage",
    category: "ballet",
    premium: false,
    palette: { bg: "#1e1528", accent: "#f0c4d8", text: "#faf6ff", muted: "#b9aec8" },
    layout: "stage",
  },
  {
    id: "graduation-cap",
    category: "graduation",
    premium: false,
    palette: { bg: "#132018", accent: "#7cb89a", text: "#eef7f1", muted: "#9db5a8" },
    layout: "classic",
  },
  {
    id: "birthday-spark",
    category: "birthday",
    premium: false,
    palette: { bg: "#221818", accent: "#f0a060", text: "#fff8f0", muted: "#c4a898" },
    layout: "festive",
  },
  {
    id: "baby-soft",
    category: "baby",
    premium: true,
    palette: { bg: "#1a2228", accent: "#8ec5d8", text: "#f0f7fa", muted: "#a8bac4" },
    layout: "soft",
  },
  {
    id: "opening-modern",
    category: "opening",
    premium: false,
    palette: { bg: "#161616", accent: "#e8d5b0", text: "#f5f5f0", muted: "#a0a098" },
    layout: "modern",
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];
}
