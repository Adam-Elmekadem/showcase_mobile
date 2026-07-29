export type QuoteCategory = "funny" | "romantic" | "philosophical" | "sad" | "motivational" | "dark" | "iconic";

export const QUOTE_CATEGORIES: { key: QuoteCategory; ar: string; en: string; icon: string }[] = [
  { key: "funny", ar: "مضحك", en: "Funny", icon: "happy-outline" },
  { key: "romantic", ar: "رومانسي", en: "Romantic", icon: "heart-outline" },
  { key: "philosophical", ar: "فلسفي", en: "Philosophical", icon: "bulb-outline" },
  { key: "sad", ar: "حزين", en: "Sad", icon: "rainy-outline" },
  { key: "motivational", ar: "تحفيزي", en: "Motivational", icon: "flame-outline" },
  { key: "dark", ar: "قاتم", en: "Dark", icon: "moon-outline" },
  { key: "iconic", ar: "أيقوني", en: "Iconic", icon: "star-outline" },
];

export function quoteCategoryLabel(key: string | null | undefined, language: "ar" | "en"): string | null {
  const found = QUOTE_CATEGORIES.find((c) => c.key === key);
  if (!found) return null;
  return language === "ar" ? found.ar : found.en;
}
