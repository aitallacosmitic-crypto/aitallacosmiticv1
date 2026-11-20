import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Heart,
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Star,
  Minus,
  Plus,
} from "lucide-react";
import { useStore } from "./store";
import { Arrow, Card, Page, Unavailable } from "./ui";
import { lineTotal, photo } from "./model";
import { db } from "./db";
export function Catalog() {
  const { lang, t, products, categories, failed, loading } = useStore();
  const [params, SP] = useSearchParams(),
    [filters, F] = useState(false);
  const get = (k: string) => params.get(k) || "",
    set = (k: string, v: string) => {
      const p = new URLSearchParams(params);
      if (v) p.set(k, v);
      else p.delete(k);
      SP(p, { replace: true });
    };
  const list = products
    .filter(
      (p) =>
        (!get("category") ||
          categories.find((c) => c.id === p.category_id)?.slug ===
            get("category")) &&
        (!get("stock") || p.stock > 0) &&
        (!get("max") || (p.sale_price ?? p.price) <= Number(get("max"))) &&
        [p.name_ar, p.name_fr, p.name_en, p.sku]
          .join(" ")
          .toLowerCase()
          .includes(get("q").trim().toLowerCase()),
    )
    .sort((a, b) =>
      get("sort") === "low"
        ? (a.sale_price ?? a.price) - (b.sale_price ?? b.price)
        : get("sort") === "high"
          ? (b.sale_price ?? b.price) - (a.sale_price ?? a.price)
          : b.sold - a.sold,
    );
  return (
    <Page
      title={t("المتجر", "La boutique", "The boutique")}
      kicker="LA COLLECTION"
    >
      <div className="filterBar">
        <label className="searchField">
          <Search size={17} />
          <input
            aria-label={t("بحث", "Rechercher", "Search")}
            value={get("q")}
            placeholder={t(
              "ابحثي عن منتج",
              "Rechercher un produit",
              "Search products",
            )}
            onChange={(e) => set("q", e.target.value)}
          />
        </label>
        <select
          aria-label={t("الفئة", "Catégorie", "Category")}
          value={get("category")}
          onChange={(e) => set("category", e.target.value)}
        >
          <option value="">
            {t("كل الفئات", "Toutes les catégories", "All categories")}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c[`name_${lang}`]}
            </option>
          ))}
        </select>
        <button onClick={() => F(!filters)}>
          <SlidersHorizontal size={16} />
          {t("تصفية", "Filtrer", "Filters")}
        </button>
      </div>
      {filters && (
        <div className="filterBar">
          <label>
            {t("أقصى سعر", "Prix maximum", "Maximum price")}
            <input
              type="number"
              min="0"
              value={get("max")}
              onChange={(e) => set("max", e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!get("stock")}
              onChange={(e) => set("stock", e.target.checked ? "1" : "")}
            />
            {t("متوفر", "En stock", "In stock")}
          </label>
          <select
            aria-label={t("ترتيب", "Tri", "Sort")}
            value={get("sort")}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="">
              {t("الأكثر مبيعاً", "Popularité", "Popularity")}
            </option>
            <option value="low">
              {t("السعر التصاعدي", "Prix croissant", "Price: low to high")}
            </option>
            <option value="high">
              {t("السعر التنازلي", "Prix décroissant", "Price: high to low")}
            </option>
          </select>
          <button onClick={() => SP({})}>{t("مسح", "Effacer", "Reset")}</button>
        </div>
      )}
      {loading ? (
        <div className="skeleton" aria-busy="true" />
      ) : failed ? (
        <Unavailable />
      ) : list.length ? (
        <div className="productGrid">
          {list.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <p className="empty">
          {t("لا توجد منتجات مطابقة", "Aucun résultat", "No matching products")}
        </p>
      )}
    </Page>
  );
}
export function Detail() {
  const { sku } = useParams(),
    {
      products,
      t,
      lang,
      failed,
      loading,
      money,
      add,
      settings,
      heart,
      wishlist,
      user,
      notify,
    } = useStore(),
    p = products.find((x) => x.sku === sku);
  const [n, N] = useState(1),
    [idx, I] = useState(0),
    [reviews, R] = useState<{ id: string; rating: number; body: string }[]>([]);
  useEffect(() => {
    N(1);
    I(0);
    R([]);
    if (p && db) {
      db.from("reviews")
        .select("id,rating,body")
        .eq("product_id", p.id)
        .eq("approved", true)
        .then(({ data }) => R(data || []));
      document.title = p[`name_${lang}`] + " | Ait Alla Cosmetic";
    }
  }, [p?.id, lang]);
  if (loading) return <div className="skeleton" />;
  if (failed) return <Unavailable />;
  if (!p)
    return (
      <Page
        title={t(
          "المنتج غير موجود",
          "Produit introuvable",
          "Product not found",
        )}
      >
        <Link to="/catalog">{t("المتجر", "Boutique", "Shop")}</Link>
      </Page>
    );
  const imgs = p.product_images.slice().sort((a, b) => a.position - b.position);
  const name = p[`name_${lang}`];
  return (
    <section className="wrap page">
      <Link className="crumb" to="/catalog">
        {t("المتجر", "Boutique", "Shop")} / {name}
      </Link>
      <div className="detailGrid">
        <div>
          {imgs[idx] && (
            <img className="detailImg" src={imgs[idx].url} alt={name} />
          )}
          <div className="thumbs">
            {imgs.map((img, i) => (
              <button key={img.id} onClick={() => I(i)}>
                <img src={img.url} alt={name + " " + (i + 1)} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <small className="eyebrow">AIT ALLA · {p.sku}</small>
          <h1>{name}</h1>
          <p>{p[`desc_${lang}`]}</p>
          <h2>{money(lineTotal(p, n))}</h2>
          {p.sale_price && <del>{money(p.price * n)}</del>}
          <p>
            {t("عروض الكمية", "Offres quantité", "Quantity offers")}: 2 / −
            {p.tier_two}% · 3 / −{p.tier_three}%
          </p>
          <p>
            {p.stock
              ? t("متوفر", "En stock", "In stock")
              : t("غير متوفر حالياً", "Épuisé", "Out of stock")}
          </p>
          <div className="actions">
            <div className="stepper">
              <button aria-label="−" disabled={n <= 1} onClick={() => N(n - 1)}>
                <Minus size={14} />
              </button>
              {n}
              <button
                aria-label="+"
                disabled={n >= 99}
                onClick={() => N(n + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
            <button disabled={n > p.stock} onClick={() => add(p, n)}>
              <ShoppingBag size={16} />
              {t("أضيفي إلى السلة", "Ajouter au panier", "Add to bag")}
            </button>
            <button
              className="light"
              aria-label={t("المفضلة", "Favoris", "Wishlist")}
              onClick={() => heart(p.id)}
            >
              <Heart
                size={18}
                fill={wishlist.includes(p.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          <a
            className="textLink"
            href={
              "https://wa.me/" +
              settings.whatsapp +
              "?text=" +
              encodeURIComponent(
                [name, "× " + n, money(lineTotal(p, n))].join("\n"),
              )
            }
          >
            {t(
              "استفسري عبر واتساب",
              "Commander sur WhatsApp",
              "Enquire on WhatsApp",
            )}{" "}
            <Arrow />
          </a>
        </div>
      </div>
      <h2>{t("تقييمات العملاء", "Avis clients", "Customer reviews")}</h2>
      {reviews.length ? (
        reviews.map((r) => (
          <blockquote key={r.id}>
            <Star size={14} /> {r.rating}/5 · {r.body}
          </blockquote>
        ))
      ) : (
        <p>
          {t(
            "لا توجد تقييمات منشورة",
            "Aucun avis publié",
            "No published reviews yet",
          )}
        </p>
      )}
      {user && (
        <form
          className="form narrow"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const r = await db!
              .from("reviews")
              .insert({
                user_id: user.id,
                product_id: p.id,
                rating: Number(f.get("rating")),
                body: f.get("body"),
              });
            notify(
              r.error
                ? t(
                    "التقييم متاح بعد استلام الطلب",
                    "Avis réservé aux achats livrés",
                    "Reviews require a delivered purchase",
                  )
                : t(
                    "أُرسل للمراجعة",
                    "Avis en modération",
                    "Submitted for moderation",
                  ),
            );
          }}
        >
          <label>
            {t("التقييم", "Note", "Rating")}
            <select name="rating">
              {[5, 4, 3, 2, 1].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            {t("رأيك", "Votre avis", "Your review")}
            <textarea required maxLength={1500} name="body" />
          </label>
          <button>{t("إرسال", "Envoyer", "Submit")}</button>
        </form>
      )}
      <h2>{t("منتجات ذات صلة", "Produits associés", "Related products")}</h2>
      <div className="productGrid">
        {products
          .filter((x) => x.id !== p.id && x.category_id === p.category_id)
          .map((x) => (
            <Card p={x} key={x.id} />
          ))}
      </div>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          description: p[`desc_${lang}`],
          image: photo(p),
          sku: p.sku,
          offers: {
            "@type": "Offer",
            price: p.sale_price ?? p.price,
            priceCurrency: "MAD",
            availability:
              "https://schema.org/" + (p.stock ? "InStock" : "OutOfStock"),
          },
        }).replaceAll("<", "\\u003c")}
      </script>
    </section>
  );
}
