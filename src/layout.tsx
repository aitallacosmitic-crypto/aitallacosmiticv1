import Metadata from "./meta";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChevronDown,
  Globe2,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
  Sparkle,
  Check,
  Phone,
} from "lucide-react";
import { useStore } from "./store";
import { Mark } from "./ui";
import type { Lang } from "./model";
export function WhatsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M21 11.5a9 9 0 0 1-13.4 8L3 21l1.4-4.5A9 9 0 1 1 21 11.5Z" />
      <path
        d="M8 7c.4-.3 1.1-.2 1.3.3l.9 2c.2.4-.2.8-.7 1.2.9 1.7 2 2.8 4 3.5.3-.4.6-1.2 1.1-1.1l2.2 1c.6.3.2 1.5-.3 2-1.2 1.2-4.2.1-6.7-2.3C7.4 11.6 6.4 8.3 8 7Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
export default function Layout() {
  const { t, lang, setLang, settings, cart, toast, user } = useStore();
  const [pop, P] = useState("");
  const loc = useLocation(),
    nav = useNavigate(),
    head = useRef<HTMLElement>(null);
  useEffect(() => {
    P("");
    window.scrollTo(0, 0);
  }, [loc.pathname, loc.search, lang, settings.brand]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") P("");
    };
    const outside = (e: MouseEvent) => {
      if (!head.current?.contains(e.target as Node)) P("");
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", outside);
    };
  }, []);
  const navs = [
    ["/", t("الرئيسية", "Accueil", "Home")],
    ["/catalog", t("المتجر", "Boutique", "Shop")],
    ["/about", t("قصتنا", "Notre histoire", "Our story")],
    ["/contact", t("تواصلي معنا", "Contact", "Contact")],
  ];
  const flip = (s: string) => P(pop === s ? "" : s);
  return (
    <>
      <Metadata />
      <a className="skip" href="#main">
        {t("تخطي إلى المحتوى", "Aller au contenu", "Skip to content")}
      </a>
      <div className="announcement">
        <Sparkle size={10} />
        <span>
          {settings[`announcement_${lang}`] ||
            (settings.shipping_fee === 0
              ? t(
                  "توصيل مجاني لجميع الطلبات داخل المغرب",
                  "Livraison offerte partout au Maroc",
                  "Free delivery on all orders across Morocco",
                )
              : t(
                  "مرحبا بكم في أيت علا كوسميتيك",
                  "Bienvenue chez Ait Alla Cosmetic",
                  "Welcome to Ait Alla Cosmetic",
                ))}
        </span>
        <Sparkle size={10} />
      </div>
      <header ref={head}>
        <div className="wrap headInner">
          <Mark />
          <nav className={"mainNav " + (pop === "menu" ? "open" : "")}>
            {navs.map(([to, s]) => (
              <NavLink end key={to} to={to}>
                {s}
              </NavLink>
            ))}
          </nav>
          <div className="tools">
            <div className="langbox">
              <button
                className="langBtn"
                onClick={() => flip("lang")}
                aria-expanded={pop === "lang"}
              >
                <Globe2 size={15} />
                {lang === "ar"
                  ? "العربية"
                  : lang === "fr"
                    ? "Français"
                    : "English"}
                <ChevronDown size={12} />
              </button>
              {pop === "lang" && (
                <div className="pop langs">
                  {(
                    settings.available_languages ||
                    (["ar", "fr", "en"] as Lang[])
                  ).map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLang(l);
                        P("");
                      }}
                    >
                      {{ ar: "العربية", fr: "Français", en: "English" }[l]}{" "}
                      {l === lang && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <i />
            <button
              className="ico"
              aria-label={t("بحث", "Rechercher", "Search")}
              onClick={() => flip("search")}
            >
              <Search />
            </button>
            <Link
              className="ico accountIcon"
              to="/account"
              aria-label={t("حسابي", "Mon compte", "My account")}
            >
              <UserRound fill={user ? "#ddd4bd" : "none"} />
            </Link>
            <Link
              className="ico bag"
              to="/cart"
              aria-label={t("سلة التسوق", "Panier", "Shopping bag")}
            >
              <ShoppingBag />
              <sup>{cart.reduce((a, x) => a + x.qty, 0)}</sup>
            </Link>
            <button
              className="ico mobileMenu"
              aria-label={t("القائمة", "Menu", "Menu")}
              onClick={() => flip("menu")}
            >
              {pop === "menu" ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {pop === "search" && (
          <form
            className="searchPanel"
            onSubmit={(e) => {
              e.preventDefault();
              nav(
                "/catalog?q=" +
                  encodeURIComponent(
                    String(new FormData(e.currentTarget).get("q") || ""),
                  ),
              );
              P("");
            }}
          >
            <Search size={19} />
            <input
              autoFocus
              aria-label={t(
                "ابحثي عن منتج",
                "Rechercher un produit",
                "Search products",
              )}
              name="q"
              placeholder={t(
                "ابحثي عن منتج…",
                "Rechercher un produit…",
                "Search products…",
              )}
            />
            <button>{t("بحث", "Rechercher", "Search")}</button>
          </form>
        )}
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="wrap foot">
          <div>
            <Mark />
            <p>
              {t(
                "طقوس العناية من وحي الطبيعة المغربية.",
                "Des rituels inspirés de la nature marocaine.",
                "Care rituals inspired by Moroccan nature.",
              )}
            </p>
            <a dir="ltr" href={"tel:" + settings.phone}>
              <Phone size={14} /> {settings.phone}
            </a>
            {settings.instagram_url && (
              <a href={settings.instagram_url}>Instagram</a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url}>Facebook</a>
            )}
          </div>
          <div>
            <b>{t("اكتشفي", "Découvrir", "Explore")}</b>
            {navs.slice(1).map(([url, n]) => (
              <Link to={url} key={url}>
                {n}
              </Link>
            ))}
            <Link to="/account">{t("حسابي", "Mon compte", "My account")}</Link>
          </div>
          <div>
            <b>{t("خدمة العملاء", "Assistance", "Customer care")}</b>
            {[
              ["faq", t("الأسئلة الشائعة", "Questions fréquentes", "FAQ")],
              [
                "shipping",
                t(
                  "التوصيل والإرجاع",
                  "Livraison et retours",
                  "Shipping and returns",
                ),
              ],
              ["privacy", t("الخصوصية", "Confidentialité", "Privacy")],
              ["terms", t("شروط الاستخدام", "Conditions", "Terms")],
            ].map(([k, n]) => (
              <Link key={k} to={"/" + k}>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div className="copyright">
          © 2026 AIT ALLA COSMETIC <span>✧</span> MOROCCO
        </div>
      </footer>
      <a
        className="waFloat"
        href={"https://wa.me/" + settings.whatsapp}
        aria-label="WhatsApp"
      >
        <WhatsIcon />
      </a>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </>
  );
}
