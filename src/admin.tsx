import { useState } from "react";
import { useStore } from "./store";
import { Mark, Page } from "./ui";
import { Auth } from "./account";
import { Products, Inventory, Resources, Moderation } from "./admin/products";
import { StaffOrders, Customers } from "./admin/orders";
import Overview from "./admin/overview";
import { db } from "./db";
import type { Lang } from "./model";
export default function Admin() {
  const { t, lang, setLang, authReady, user, roles } = useStore(),
    [tab, T] = useState("");
  const allowed = (role: string) =>
    roles.includes("super_admin") || roles.includes(role);
  const tabs: [string, string, boolean][] = [
    [
      "overview",
      t("نظرة عامة", "Vue d’ensemble", "Overview"),
      allowed("super_admin"),
    ],
    [
      "products",
      t("المنتجات", "Produits", "Products"),
      allowed("product_manager"),
    ],
    [
      "categories",
      t("الفئات", "Catégories", "Categories"),
      allowed("product_manager"),
    ],
    [
      "inventory",
      t("المخزون", "Inventaire", "Inventory"),
      allowed("product_manager"),
    ],
    [
      "promotions",
      t("العروض", "Promotions", "Promotions"),
      allowed("product_manager"),
    ],
    ["reviews", t("التقييمات", "Avis", "Reviews"), allowed("product_manager")],
    [
      "orders",
      t("الطلبات", "Commandes", "Orders"),
      allowed("order_manager") || allowed("customer_support"),
    ],
    [
      "customers",
      t("العملاء", "Clients", "Customers"),
      allowed("order_manager") || allowed("customer_support"),
    ],
    [
      "site_settings",
      t("إعدادات المتجر", "Réglages", "Store settings"),
      allowed("super_admin"),
    ],
  ];
  const visible = tabs.filter((x) => x[2]),
    active = visible.find((x) => x[0] === tab) || visible[0];
  return (
    <>
      <div className="adminHead">
        <Mark />
        <div className="actions">
          <select
            aria-label={t("اللغة", "Langue", "Language")}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
          {user && (
            <button className="light" onClick={() => db!.auth.signOut()}>
              {t("خروج", "Déconnexion", "Sign out")}
            </button>
          )}
        </div>
      </div>
      {!authReady ? (
        <div className="skeleton" />
      ) : !user ? (
        <Auth admin />
      ) : !active ? (
        <Page
          title={t(
            "منطقة مخصصة للإدارة",
            "Accès réservé",
            "Staff access required",
          )}
        >
          <p>
            {t(
              "لا يملك هذا الحساب صلاحية إدارة المتجر.",
              "Ce compte ne dispose pas de permissions administratives.",
              "This account has no store administration permissions.",
            )}
          </p>
        </Page>
      ) : (
        <Page title={active[1]} kicker="ATELIER · ADMINISTRATION">
          <div className="adminPage">
            <nav className="adminNav">
              {visible.map(([id, label]) => (
                <button
                  key={id}
                  className={active[0] === id ? "sel" : ""}
                  onClick={() => T(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {active[0] === "overview" ? (
              <Overview />
            ) : active[0] === "products" ? (
              <Products />
            ) : active[0] === "inventory" ? (
              <Inventory />
            ) : active[0] === "orders" ? (
              <StaffOrders />
            ) : active[0] === "customers" ? (
              <Customers />
            ) : active[0] === "reviews" ? (
              <Moderation />
            ) : (
              <Resources
                key={active[0]}
                type={
                  active[0] as "categories" | "promotions" | "site_settings"
                }
              />
            )}
          </div>
        </Page>
      )}
    </>
  );
}
