import { AssetUpload, Languages } from "./assets";
import { useState } from "react";
import { db } from "../db";
import { useStore } from "../store";
import type { Category, Product } from "../model";
import {
  check,
  Editor,
  Load,
  removeRow,
  textFields,
  useJob,
  useRows,
  type Field,
  type Row,
} from "./shared";
export function Products() {
  const { t, lang, money } = useStore(),
    job = useJob(),
    items = useRows<Product>("products", job.revision, "*,product_images(*)"),
    cats = useRows<Category>("categories"),
    [id, I] = useState(""),
    [search, S] = useState("");
  const p = items.rows.find((x) => x.id === id);
  const fields: Field[] = [
    ...textFields("sku", "name_ar", "name_fr", "name_en"),
    ...["desc_ar", "desc_fr", "desc_en"].map((k) => ({
      k,
      type: "textarea" as const,
      optional: true,
    })),
    {
      k: "category_id",
      options: cats.rows.map((c) => [c.id, c[`name_${lang}`]]),
    },
    { k: "price", type: "number", min: 0.01 },
    { k: "sale_price", type: "number", min: 0.01, optional: true },
    { k: "tier_two", type: "number", min: 0, max: 100, default: 10 },
    { k: "tier_three", type: "number", min: 0, max: 100, default: 15 },
    ...["active", "published", "featured"].map((k) => ({
      k,
      type: "checkbox" as const,
    })),
  ];
  return (
    <>
      <div className="filterBar">
        <input
          aria-label={t("بحث", "Rechercher", "Search")}
          placeholder={t("اسم المنتج أو الرمز", "Nom ou SKU", "Name or SKU")}
          value={search}
          onChange={(e) => S(e.target.value)}
        />
        <button onClick={() => I("new")}>
          {t("إضافة منتج", "Ajouter un produit", "Add product")}
        </button>
      </div>
      <Load {...items} />
      {id && (
        <>
          <button className="textLink" onClick={() => I("")}>
            {t("إغلاق", "Fermer", "Close")}
          </button>
          <Editor
            key={id}
            fields={fields}
            initial={p as unknown as Row}
            busy={job.busy}
            save={(r) =>
              job.run(async () => {
                const result = check(
                  await (
                    id === "new"
                      ? db!.from("products").insert([r])
                      : db!.from("products").update(r).eq("id", id)
                  )
                    .select("id")
                    .single(),
                );
                I(result!.id);
              })
            }
          />
          {p && (
            <div className="panel">
              <div className="thumbs">
                {p.product_images.map((img) => (
                  <button
                    key={img.id}
                    title={t("حذف الصورة", "Supprimer l’image", "Remove image")}
                    onClick={() =>
                      removeRow(
                        "product_images",
                        img.id,
                        t(
                          "حذف الصورة؟",
                          "Supprimer l’image ?",
                          "Remove this image?",
                        ),
                        job.run,
                      )
                    }
                  >
                    <img alt="×" src={img.url} />×
                  </button>
                ))}
              </div>
              <label>
                {t(
                  "أضيفي صوراً · 5 MB لكل صورة",
                  "Ajouter des images · 5 Mo chacune",
                  "Add images · 5 MB each",
                )}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={job.busy}
                  onChange={(e) => {
                    const files = [...(e.target.files || [])];
                    job.run(async () => {
                      for (const [i, file] of files.entries()) {
                        const ext = {
                          "image/jpeg": "jpg",
                          "image/png": "png",
                          "image/webp": "webp",
                        }[file.type];
                        if (file.size > 5242880 || !ext) throw Error();
                        const path =
                          p.id + "/" + crypto.randomUUID() + "." + ext;
                        const bucket = db!.storage.from("product-images");
                        check(await bucket.upload(path, file));
                        const result = await db!
                          .from("product_images")
                          .insert({
                            product_id: p.id,
                            url: bucket.getPublicUrl(path).data.publicUrl,
                            position: p.product_images.length + i,
                          });
                        if (result.error) {
                          await bucket.remove([path]);
                          throw result.error;
                        }
                      }
                    });
                  }}
                />
              </label>
            </div>
          )}
        </>
      )}
      <p role="status">{job.msg}</p>
      <div className="tableWrap">
        <table>
          <tbody>
            {items.rows
              .filter((x) =>
                [x.name_ar, x.name_fr, x.name_en, x.sku]
                  .join(" ")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((x) => (
                <tr key={x.id}>
                  <th>{x[`name_${lang}`]}</th>
                  <td>{x.sku}</td>
                  <td>{money(x.sale_price ?? x.price)}</td>
                  <td>{x.stock}</td>
                  <td>
                    <button className="light" onClick={() => I(x.id)}>
                      {t("تعديل", "Modifier", "Edit")}
                    </button>{" "}
                    <button
                      className="textLink"
                      onClick={() =>
                        removeRow(
                          "products",
                          x.id,
                          t(
                            "حذف المنتج؟",
                            "Supprimer le produit ?",
                            "Delete product?",
                          ),
                          job.run,
                        )
                      }
                    >
                      {t("حذف", "Supprimer", "Delete")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function Resources({
  type,
}: {
  type: "categories" | "promotions" | "site_settings";
}) {
  const { lang, t, refresh } = useStore(),
    job = useJob(),
    data = useRows<Row>(type, job.revision),
    [id, I] = useState("");
  const settings = type === "site_settings",
    row = settings ? data.rows[0] : data.rows.find((r) => r.id === id);
  const fields: Field[] =
    type === "categories"
      ? textFields("slug", "name_ar", "name_fr", "name_en")
      : type === "promotions"
        ? [
            { k: "code" },
            {
              k: "kind",
              options: [
                ["percent", t("نسبة مئوية", "Pourcentage", "Percentage")],
                ["fixed", t("مبلغ ثابت", "Montant fixe", "Fixed amount")],
              ],
            },
            { k: "amount", type: "number", min: 0.01 },
            { k: "minimum", type: "number", min: 0, default: 0 },
            { k: "usage_limit", type: "number", min: 1, optional: true },
            { k: "starts_at", type: "datetime-local", optional: true },
            { k: "ends_at", type: "datetime-local", optional: true },
            { k: "active", type: "checkbox" },
          ]
        : [
            ...textFields("brand", "phone", "whatsapp"),
            { k: "shipping_fee", type: "number", min: 0 },
            { k: "free_threshold", type: "number", min: 0, optional: true },
            { k: "cod", type: "checkbox" },
            { k: "wa_confirmation", type: "checkbox" },
            ...["hero_url", "instagram_url", "facebook_url"].map((k) => ({
              k,
              type: "url" as const,
              optional: true,
            })),
            ...[
              "announcement_ar",
              "announcement_fr",
              "announcement_en",
              "seo_ar",
              "seo_fr",
              "seo_en",
            ].map((k) => ({ k, optional: true })),
          ];
  return (
    <>
      <Load {...data} />
      {!settings && (
        <>
          <button onClick={() => I("new")}>
            {t("إضافة", "Ajouter", "Add")}
          </button>
          {data.rows.map((r) => (
            <div key={String(r.id)} className="listRow">
              <b>{r[`name_${lang}`] || r.code}</b>
              {r.amount && (
                <span>
                  {r.amount} {r.kind === "percent" ? "%" : "MAD"}
                </span>
              )}
              <button className="light" onClick={() => I(String(r.id))}>
                {t("تعديل", "Modifier", "Edit")}
              </button>
              <button
                className="textLink"
                onClick={() =>
                  removeRow(
                    type,
                    String(r.id),
                    t(
                      "تأكيد الحذف؟",
                      "Confirmer la suppression ?",
                      "Confirm deletion?",
                    ),
                    job.run,
                  )
                }
              >
                {t("حذف", "Supprimer", "Delete")}
              </button>
            </div>
          ))}
        </>
      )}
      {(id || (settings && row)) && (
        <Editor
          fields={fields}
          key={id + type + job.revision}
          initial={row}
          busy={job.busy}
          save={(r) =>
            job.run(async () => {
              if (type === "promotions") r.code = String(r.code).toUpperCase();
              check(
                await (
                  row
                    ? db!
                        .from(type)
                        .update(r)
                        .eq("id", row.id as string | boolean)
                    : db!.from(type).insert([r])
                )
                  .select("id")
                  .single(),
              );
              I("");
            })
          }
        />
      )}
      {settings && row && (
        <>
          <AssetUpload
            bucket="homepage-banners"
            save={async (url) => {
              check(
                await db!
                  .from(type)
                  .update({ hero_url: url })
                  .eq("id", true)
                  .select()
                  .single(),
              );
              await refresh();
            }}
          />
          <Languages />
        </>
      )}
      {type === "categories" && row && (
        <AssetUpload
          bucket="category-images"
          save={async (url) => {
            check(
              await db!
                .from(type)
                .update({ image_url: url })
                .eq("id", String(row.id))
                .select()
                .single(),
            );
            await refresh();
          }}
        />
      )}
      <p role="status">{job.msg}</p>
    </>
  );
}
export function Inventory() {
  const { t, lang } = useStore(),
    job = useJob(),
    p = useRows<Product>("products", job.revision),
    moves = useRows<{
      id: string;
      product_id: string;
      quantity: number;
      reason: string;
      created_at: string;
    }>("inventory_movements", job.revision, "*", "created_at");
  return (
    <>
      <Load {...p} />
      <form
        className="form panel"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          job.run(async () => {
            check(
              await db!.rpc("adjust_stock", {
                product: f.get("id"),
                delta: Number(f.get("delta")),
                reason: f.get("reason"),
              }),
            );
          });
        }}
      >
        <label>
          {t("المنتج والمخزون", "Produit et stock", "Product and stock")}
          <select required name="id">
            {p.rows.map((x) => (
              <option key={x.id} value={x.id}>
                {x[`name_${lang}`]} · {x.stock}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("تعديل الكمية (+/−)", "Ajustement (+/−)", "Adjustment (+/−)")}
          <input name="delta" type="number" step="1" required />
        </label>
        <label>
          {t("السبب", "Motif", "Reason")}
          <input name="reason" maxLength={300} required />
        </label>
        <button disabled={job.busy}>
          {t("تسجيل الحركة", "Ajuster le stock", "Adjust inventory")}
        </button>
      </form>
      <p role="status">{job.msg}</p>
      <Load {...moves} />
      {moves.rows.map((m) => (
        <div className="listRow" key={m.id}>
          <b>{p.rows.find((x) => x.id === m.product_id)?.[`name_${lang}`]}</b>
          <span>{m.quantity}</span>
          <span>{m.reason}</span>
          {new Date(m.created_at).toLocaleDateString(lang)}
        </div>
      ))}
    </>
  );
}
export function Moderation() {
  const { t } = useStore(),
    job = useJob(),
    data = useRows<{
      id: string;
      rating: number;
      body: string;
      approved: boolean;
    }>("reviews", job.revision);
  return (
    <>
      <Load {...data} />
      {data.rows.map((r) => (
        <div className="listRow" key={r.id}>
          <b>{r.rating}/5</b>
          <span>{r.body}</span>
          <button
            onClick={() =>
              job.run(async () => {
                check(
                  await db!
                    .from("reviews")
                    .update({ approved: !r.approved })
                    .eq("id", r.id)
                    .select()
                    .single(),
                );
              })
            }
          >
            {r.approved
              ? t("إخفاء", "Masquer", "Hide")
              : t("نشر", "Publier", "Publish")}
          </button>
        </div>
      ))}
      {!data.loading && !data.rows.length && (
        <p>{t("لا توجد تقييمات", "Aucun avis", "No reviews")}</p>
      )}
      <p role="status">{job.msg}</p>
    </>
  );
}
