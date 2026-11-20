import { useEffect, useState } from "react";
import { useStore } from "../store";
import { db } from "../db";
export type Row = Record<string, string | number | boolean | null>;
export function useJob() {
  const { t, refresh } = useStore(),
    [busy, B] = useState(false),
    [msg, M] = useState(""),
    [revision, R] = useState(0);
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    B(true);
    M("");
    try {
      await fn();
      R((v) => v + 1);
      await refresh();
      M(t("تم الحفظ", "Enregistré", "Saved"));
    } catch {
      M(
        t(
          "تعذر الحفظ. تحققي من البيانات والصلاحيات.",
          "Échec. Vérifiez les données et les autorisations.",
          "Could not save. Check values and permissions.",
        ),
      );
    } finally {
      B(false);
    }
  };
  return { busy, msg, revision, run };
}
export function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}
export function useRows<T>(
  table: string,
  revision = 0,
  columns = "*",
  sort = "id",
) {
  const [rows, R] = useState<T[]>([]),
    [error, E] = useState(false),
    [loading, L] = useState(true);
  useEffect(() => {
    let live = true;
    L(true);
    E(false);
    (async () => {
      const all: T[] = [];
      for (let from = 0; ; from += 200) {
        const r = await db!
          .from(table)
          .select(columns)
          .order(sort, { ascending: false })
          .order("id")
          .range(from, from + 199);
        if (r.error) throw r.error;
        if (!live) return;
        all.push(...(r.data as unknown as T[]));
        if (r.data.length < 200) break;
      }
      if (live) R(all);
    })()
      .catch(() => {
        if (live) {
          R([]);
          E(true);
        }
      })
      .finally(() => {
        if (live) L(false);
      });
    return () => {
      live = false;
    };
  }, [table, columns, revision, sort]);
  return { rows, error, loading };
}
export function Load({ loading, error }: { loading: boolean; error: boolean }) {
  const { t } = useStore();
  return error ? (
    <p role="alert">
      {t(
        "تعذرت قراءة البيانات",
        "Lecture impossible",
        "Could not load records",
      )}
    </p>
  ) : loading ? (
    <div className="skeleton" />
  ) : null;
}
export function exportCSV(
  filename: string,
  rows: (string | number | null)[][],
) {
  const safe = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + rows.map((r) => r.map(safe).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const words: Record<string, [string, string, string]> = {
  sku: ["رمز المنتج", "SKU", "SKU"],
  name_ar: ["الاسم بالعربية", "Nom arabe", "Arabic name"],
  name_fr: ["الاسم بالفرنسية", "Nom français", "French name"],
  name_en: ["الاسم بالإنجليزية", "Nom anglais", "English name"],
  desc_ar: ["الوصف بالعربية", "Description arabe", "Arabic description"],
  desc_fr: ["الوصف بالفرنسية", "Description française", "French description"],
  desc_en: ["الوصف بالإنجليزية", "Description anglaise", "English description"],
  category_id: ["الفئة", "Catégorie", "Category"],
  price: ["السعر (MAD)", "Prix (MAD)", "Price (MAD)"],
  sale_price: ["سعر التخفيض", "Prix remisé", "Sale price"],
  active: ["مفعّل", "Actif", "Active"],
  published: ["منشور", "Publié", "Published"],
  featured: ["مختار", "En vedette", "Featured"],
  tier_two: ["خصم وحدتين %", "Remise 2 unités %", "2-unit discount %"],
  tier_three: ["خصم ثلاث وحدات %", "Remise 3 unités %", "3-unit discount %"],
  slug: ["المعرّف", "Identifiant", "URL slug"],
  code: ["رمز العرض", "Code promo", "Coupon code"],
  kind: ["نوع الخصم", "Type de remise", "Discount type"],
  amount: ["قيمة الخصم", "Valeur", "Amount"],
  minimum: ["الحد الأدنى للطلب", "Minimum d’achat", "Minimum spend"],
  usage_limit: ["حد الاستخدام", "Limite d’utilisation", "Usage limit"],
  starts_at: ["بداية العرض", "Début", "Starts at"],
  ends_at: ["نهاية العرض", "Fin", "Ends at"],
  brand: ["اسم العلامة", "Marque", "Brand"],
  phone: ["الهاتف", "Téléphone", "Phone"],
  whatsapp: ["رقم واتساب", "Numéro WhatsApp", "WhatsApp number"],
  shipping_fee: ["مصاريف التوصيل", "Frais de livraison", "Shipping fee"],
  free_threshold: [
    "عتبة التوصيل المجاني",
    "Seuil de gratuité",
    "Free-shipping threshold",
  ],
  cod: ["الدفع عند الاستلام", "Paiement à la livraison", "Cash on delivery"],
  wa_confirmation: [
    "التأكيد عبر واتساب",
    "Confirmation WhatsApp",
    "WhatsApp confirmation",
  ],
  hero_url: ["رابط صورة الغلاف", "Image de couverture", "Hero image URL"],
  announcement_ar: ["إعلان بالعربية", "Annonce arabe", "Arabic announcement"],
  announcement_fr: [
    "إعلان بالفرنسية",
    "Annonce française",
    "French announcement",
  ],
  announcement_en: [
    "إعلان بالإنجليزية",
    "Annonce anglaise",
    "English announcement",
  ],
  instagram_url: ["رابط إنستغرام", "Lien Instagram", "Instagram URL"],
  facebook_url: ["رابط فيسبوك", "Lien Facebook", "Facebook URL"],
  seo_ar: [
    "وصف البحث بالعربية",
    "Description SEO arabe",
    "Arabic SEO description",
  ],
  seo_fr: [
    "وصف البحث بالفرنسية",
    "Description SEO française",
    "French SEO description",
  ],
  seo_en: [
    "وصف البحث بالإنجليزية",
    "Description SEO anglaise",
    "English SEO description",
  ],
};
export type Field = {
  k: string;
  type?: "number" | "checkbox" | "datetime-local" | "url" | "textarea";
  optional?: boolean;
  min?: number;
  max?: number;
  options?: [string, string][];
  default?: string | number | boolean;
};
export function Editor({
  fields,
  initial,
  save,
  busy,
}: {
  fields: Field[];
  initial?: Row;
  save: (r: Row) => void;
  busy: boolean;
}) {
  const { t } = useStore();
  return (
    <form
      className="form panel"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget),
          r: Row = {};
        for (const field of fields) {
          const v = String(f.get(field.k) ?? "").trim();
          r[field.k] =
            field.type === "checkbox"
              ? f.has(field.k)
              : field.type === "number"
                ? v
                  ? Number(v)
                  : null
                : field.type === "datetime-local"
                  ? v
                    ? new Date(v).toISOString()
                    : null
                  : !v && field.optional && !field.k.startsWith("desc_")
                    ? null
                    : v;
        }
        save(r);
      }}
    >
      {fields.map((field) => {
        const { k, type } = field;
        let val = initial?.[k] ?? field.default ?? "";
        if (type === "datetime-local" && val) {
          const d = new Date(String(val));
          val = new Date(d.valueOf() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        }
        const props = {
          name: k,
          required: !field.optional,
          defaultValue: String(val),
        };
        return (
          <label key={k}>
            {t(...words[k])}
            {field.options ? (
              <select {...props}>
                {field.optional && <option value="">—</option>}
                {field.options.map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            ) : type === "checkbox" ? (
              <input type="checkbox" name={k} defaultChecked={!!val} />
            ) : type === "textarea" ? (
              <textarea {...props} maxLength={5000} />
            ) : (
              <input
                {...props}
                type={type || "text"}
                min={field.min}
                max={field.max}
                step={type === "number" ? "any" : undefined}
                maxLength={500}
              />
            )}
          </label>
        );
      })}
      <button disabled={busy}>
        {t("حفظ التغييرات", "Enregistrer", "Save changes")}
      </button>
    </form>
  );
}
export const textFields = (...keys: string[]): Field[] =>
  keys.map((k) => ({ k }));
export function removeRow(
  table: string,
  id: string,
  confirmText: string,
  run: ReturnType<typeof useJob>["run"],
) {
  if (window.confirm(confirmText))
    run(async () => {
      check(await db!.from(table).delete().eq("id", id).select("id").single());
    });
}
