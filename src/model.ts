export type Lang = "ar" | "fr" | "en";
export type LocalName = { name_ar: string; name_fr: string; name_en: string };
export type Category = LocalName & {
  id: string;
  slug: string;
  image_url?: string | null;
};
export type Product = LocalName & {
  id: string;
  sku: string;
  category_id: string;
  desc_ar: string;
  desc_fr: string;
  desc_en: string;
  price: number;
  sale_price: number | null;
  stock: number;
  sold: number;
  active: boolean;
  published: boolean;
  featured: boolean;
  tier_two: number;
  tier_three: number;
  product_images: { id: string; url: string; position: number }[];
};
export type Settings = {
  brand: string;
  logo_url?: string | null;
  campaign_url?: string | null;
  campaign_ar?: string | null;
  campaign_fr?: string | null;
  campaign_en?: string | null;
  campaign_active?: boolean;
  campaign_start?: string | null;
  campaign_end?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  available_languages?: Lang[];
  seo_ar?: string | null;
  seo_fr?: string | null;
  seo_en?: string | null;
  phone: string;
  whatsapp: string;
  shipping_fee: number;
  free_threshold: number | null;
  cod: boolean;
  wa_confirmation: boolean;
  hero_url: string | null;
  announcement_ar: string | null;
  announcement_fr: string | null;
  announcement_en: string | null;
};
export type Line = { id: string; qty: number };
export const defaultSettings: Settings = {
  brand: "Ait Alla Cosmetic",
  phone: "+212617139424",
  whatsapp: "212617139424",
  shipping_fee: 0,
  free_threshold: null,
  cod: true,
  wa_confirmation: true,
  hero_url: null,
  announcement_ar: null,
  announcement_fr: null,
  announcement_en: null,
};
export function lineTotal(p: Product, qty: number) {
  const best = Math.max(qty >= 2 ? p.tier_two : 0, qty >= 3 ? p.tier_three : 0);
  return Math.round((p.sale_price ?? p.price) * qty * (100 - best)) / 100;
}
export const photo = (p: Product) =>
  p.product_images.slice().sort((a, b) => a.position - b.position)[0]?.url;
