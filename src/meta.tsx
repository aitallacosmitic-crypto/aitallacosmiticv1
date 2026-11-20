import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "./store";
import { photo } from "./model";
export default function Metadata() {
  const { lang, t, settings, products } = useStore(),
    { pathname } = useLocation();
  useEffect(() => {
    const route = pathname.split("/")[1],
      p =
        route === "products"
          ? products.find((x) => x.sku === pathname.split("/")[2])
          : undefined;
    const titles: Record<string, string> = {
      "": t(
        "طقوس الجمال المغربية",
        "Rituels de beauté marocains",
        "Moroccan beauty rituals",
      ),
      catalog: t("المتجر", "Boutique", "Shop"),
      about: t("قصتنا", "Notre histoire", "Our story"),
      contact: t("تواصلي معنا", "Contact", "Contact"),
      faq: t("الأسئلة الشائعة", "Questions fréquentes", "FAQ"),
      privacy: t("الخصوصية", "Confidentialité", "Privacy"),
      shipping: t(
        "التوصيل والإرجاع",
        "Livraison et retours",
        "Shipping and returns",
      ),
      terms: t("شروط الاستخدام", "Conditions", "Terms"),
      cart: t("سلة التسوق", "Panier", "Shopping bag"),
      checkout: t("إتمام الطلب", "Commande", "Checkout"),
      orders: t("طلباتي", "Mes commandes", "My orders"),
      account: t("حسابي", "Mon compte", "My account"),
      confirmation: t("تأكيد الطلب", "Confirmation", "Order confirmation"),
      products: t("المنتج", "Produit", "Product"),
    };
    const title =
        (p?.[`name_${lang}`] || titles[route] || "404") +
        " | " +
        settings.brand,
      desc =
        p?.[`desc_${lang}`] ||
        settings[`seo_${lang}`] ||
        t(
          "طقوس العناية من وحي الطبيعة المغربية.",
          "Des rituels inspirés de la nature marocaine.",
          "Care rituals inspired by Moroccan nature.",
        );
    const url = (import.meta.env.VITE_SITE_URL || location.origin) + pathname;
    document.title = title;
    const meta = (
      attribute: "name" | "property",
      name: string,
      value: string,
    ) => {
      let m = document.querySelector<HTMLMetaElement>(
        `meta[${attribute}="${name}"]`,
      );
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute(attribute, name);
        document.head.append(m);
      }
      m.content = value;
    };
    meta("name", "description", desc);
    meta("property", "og:title", title);
    meta("property", "og:description", desc);
    meta("property", "og:url", url);
    meta("property", "og:type", p ? "product" : "website");
    meta(
      "property",
      "og:image",
      (p && photo(p)) ||
        settings.hero_url ||
        (import.meta.env.VITE_SITE_URL || location.origin) + "/art/ritual.webp",
    );
    meta(
      "name",
      "robots",
      import.meta.env.VITE_SITE_URL &&
        route in titles &&
        !["account", "cart", "checkout", "orders", "confirmation"].includes(
          route,
        )
        ? "index,follow"
        : "noindex,nofollow",
    );
    let c = document.querySelector<HTMLLinkElement>("link[rel=canonical]");
    if (!c) {
      c = document.createElement("link");
      c.rel = "canonical";
      document.head.append(c);
    }
    c.href = url;
  }, [pathname, lang, products, settings]);
  return null;
}
