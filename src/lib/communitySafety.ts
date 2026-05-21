export const COMMUNITY_TERMS_VERSION = "1.1";

const OBJECTIONABLE_TERMS = [
  "kill yourself",
  "kys",
  "nazi",
  "terrorist",
  "rape",
  "slur",
];

export function containsObjectionableContent(value: string) {
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
  return OBJECTIONABLE_TERMS.some((term) => normalized.includes(term));
}

export const COMMUNITY_TERMS_COPY = {
  title: "Vault OS Terms & Community Safety",
  version: COMMUNITY_TERMS_VERSION,
};
