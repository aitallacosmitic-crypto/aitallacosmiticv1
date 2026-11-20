import { assetUrl } from "./assets";
import { ArrowLeft, ArrowRight, Heart, Leaf, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "./store";
import { photo, type Product } from "./model";
export function Arrow({ size = 18 }: { size?: number }) {
  return useStore().lang === "ar" ? (
    <ArrowLeft size={size} />
  ) : (
    <ArrowRight size={size} />
  );
}
export function Mark() {
  const { settings } = useStore();
  return (
    <Link to="/" className="brand" aria-label="Ait Alla Cosmetic">
      {settings.logo_url ? (
        <img className="brandAsset" src={assetUrl(settings.logo_url)} alt="" />
      ) : (
        <span className="seal">
          AA
          <Leaf size={10} />
        </span>
      )}
      <span className="wordmark">
        Ait Alla<small>COSMETIC</small>
      </span>
    </Link>
  );
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <i />
      {children}
    </div>
  );
}
export function Page({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="page wrap">
      <Eyebrow>{kicker || "AIT ALLA COSMETIC"}</Eyebrow>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
export function Unavailable() {
  const { t, settings, refresh } = useStore();
  return (
    <div className="empty">
      <Leaf />
      <h3>
        {t(
          "المجموعة غير متاحة حالياً",
          "La collection est momentanément indisponible",
          "The collection is temporarily unavailable",
        )}
      </h3>
      <p>
        {t(
          "يمكنك التواصل معنا لمعرفة المنتجات المتوفرة.",
          "Contactez-nous pour connaître les produits disponibles.",
          "Contact us to check product availability.",
        )}
      </p>
      <button onClick={refresh}>
        {t("إعادة المحاولة", "Réessayer", "Try again")}
      </button>{" "}
      <a className="btn light" href={"https://wa.me/" + settings.whatsapp}>
        WhatsApp <Arrow />
      </a>
    </div>
  );
}
export function Card({ p }: { p: Product }) {
  const { lang, t, money, heart, wishlist } = useStore();
  return (
    <article className="pCard">
      <Link
        className="pImage"
        aria-label={p[`name_${lang}`]}
        to={"/products/" + p.sku}
      >
        {photo(p) && (
          <img src={photo(p)} loading="lazy" alt={p[`name_${lang}`]} />
        )}
      </Link>
      <button
        className="heart"
        aria-label={t("المفضلة", "Favoris", "Wishlist")}
        onClick={() => heart(p.id)}
      >
        <Heart
          size={18}
          fill={wishlist.includes(p.id) ? "currentColor" : "none"}
        />
      </button>
      {p.sale_price && (
        <span className="badge">
          −{Math.round((1 - p.sale_price / p.price) * 100)}%
        </span>
      )}
      <Link to={"/products/" + p.sku}>
        <h3>{p[`name_${lang}`]}</h3>
      </Link>
      <span>{money(p.sale_price ?? p.price)}</span>{" "}
      <small>
        {p.stock === 0 ? t("غير متوفر", "Épuisé", "Out of stock") : ""}
      </small>
    </article>
  );
}
export function EmptyBag() {
  const { t } = useStore();
  return (
    <div className="empty">
      <ShoppingBag />
      <h3>{t("سلتك فارغة", "Votre panier est vide", "Your bag is empty")}</h3>
      <Link className="btn" to="/catalog">
        {t("اكتشفي المتجر", "Découvrir la boutique", "Explore the shop")}{" "}
        <Arrow />
      </Link>
    </div>
  );
}
