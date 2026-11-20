import Addresses from "./addresses";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { db } from "./db";
import { useStore } from "./store";
import { Card, Page } from "./ui";
export function Auth({ admin = false }: { admin?: boolean }) {
  const { t } = useStore();
  const [mode, M] = useState<"login" | "register" | "reset">("login"),
    [msg, E] = useState(""),
    [busy, B] = useState(false);
  const loc = useLocation();
  const title =
    mode === "reset"
      ? t(
          "استعادة كلمة المرور",
          "Réinitialiser le mot de passe",
          "Reset password",
        )
      : mode === "register"
        ? t("إنشاء حساب", "Créer un compte", "Create account")
        : t("تسجيل الدخول", "Connexion", "Sign in");
  return (
    <Page
      title={
        admin
          ? t("دخول الإدارة", "Accès administrateur", "Staff sign in")
          : title
      }
      kicker={admin ? "ADMINISTRATION" : "MON COMPTE"}
    >
      <form
        className="form narrow panel"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!db) {
            E(
              t(
                "خدمة تسجيل الدخول غير متاحة حالياً.",
                "La connexion est momentanément indisponible.",
                "Sign-in is currently unavailable.",
              ),
            );
            return;
          }
          B(true);
          E("");
          try {
            const f = new FormData(e.currentTarget),
              email = String(f.get("email")).trim(),
              password = String(f.get("password"));
            const r = await (mode === "register"
              ? db.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: location.origin + loc.pathname },
                })
              : mode === "reset"
                ? db.auth.resetPasswordForEmail(email, {
                    redirectTo: location.origin + "/account/reset",
                  })
                : db.auth.signInWithPassword({ email, password }));
            if (r.error) throw r.error;
            E(
              mode === "login"
                ? ""
                : t(
                    "راجعي بريدك الإلكتروني للمتابعة.",
                    "Consultez votre messagerie pour continuer.",
                    "Check your email to continue.",
                  ),
            );
          } catch {
            E(
              t(
                "تعذرت العملية. تحققي من البيانات وحاولي مجدداً.",
                "Vérifiez vos informations et réessayez.",
                "Check your details and try again.",
              ),
            );
          } finally {
            B(false);
          }
        }}
      >
        <label>
          {t("البريد الإلكتروني", "E-mail", "Email")}
          <input name="email" type="email" autoComplete="email" required />
        </label>
        {mode !== "reset" && (
          <label>
            {t("كلمة المرور", "Mot de passe", "Password")}
            <input
              minLength={mode === "register" ? 10 : 1}
              name="password"
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
            />
          </label>
        )}
        <button disabled={busy}>{title}</button>
        <p role="status">{msg}</p>
        <div className="actions">
          {mode !== "login" && (
            <button
              type="button"
              className="textLink"
              onClick={() => {
                M("login");
                E("");
              }}
            >
              {t("تسجيل الدخول", "Connexion", "Sign in")}
            </button>
          )}
          {mode === "login" && !admin && (
            <button
              type="button"
              className="textLink"
              onClick={() => M("register")}
            >
              {t("حساب جديد", "Créer un compte", "Create account")}
            </button>
          )}
          {mode === "login" && (
            <button
              type="button"
              className="textLink"
              onClick={() => M("reset")}
            >
              {t(
                "نسيت كلمة المرور؟",
                "Mot de passe oublié ?",
                "Forgot password?",
              )}
            </button>
          )}
        </div>
      </form>
    </Page>
  );
}
export function Reset() {
  const { user, t, notify } = useStore();
  if (!user) return <Auth />;
  return (
    <Page title={t("كلمة مرور جديدة", "Nouveau mot de passe", "New password")}>
      <form
        className="form narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await db!.auth.updateUser({
            password: String(new FormData(e.currentTarget).get("password")),
          });
          notify(
            error
              ? t("تعذر التحديث", "Échec", "Update failed")
              : t("تم التحديث", "Mis à jour", "Password updated"),
          );
        }}
      >
        <label>
          {t("كلمة المرور", "Mot de passe", "Password")}
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button>{t("حفظ", "Enregistrer", "Save")}</button>
      </form>
    </Page>
  );
}
export function Account() {
  const { user, authReady, t, products, wishlist, roles, notify } = useStore(),
    [name, N] = useState("");
  useEffect(() => {
    if (user)
      db?.from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => N(data?.display_name || ""));
  }, [user?.id]);
  if (!authReady) return <div className="skeleton" />;
  if (!user) return <Auth />;
  return (
    <Page title={t("حسابي", "Mon compte", "My account")}>
      <div className="panel narrow">
        <p dir="ltr">{user.email}</p>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await db!
              .from("profiles")
              .update({ display_name: name })
              .eq("id", user.id);
            notify(
              r.error
                ? t("خطأ", "Erreur", "Error")
                : t("تم الحفظ", "Enregistré", "Saved"),
            );
          }}
        >
          <label>
            {t("الاسم", "Nom", "Name")}
            <input
              value={name}
              maxLength={100}
              onChange={(e) => N(e.target.value)}
            />
          </label>
          <button>{t("حفظ", "Enregistrer", "Save")}</button>
        </form>
        <div className="actions">
          <Link className="textLink" to="/orders">
            {t("طلباتي", "Mes commandes", "My orders")}
          </Link>
          {!!roles.length && (
            <Link to="/admin">{t("الإدارة", "Administration", "Admin")}</Link>
          )}
          <button className="textLink" onClick={() => db!.auth.signOut()}>
            {t("تسجيل الخروج", "Déconnexion", "Sign out")}
          </button>
        </div>
      </div>
      <Addresses />
      <h2>{t("المفضلة", "Mes favoris", "Wishlist")}</h2>
      {!wishlist.length && (
        <p>
          {t("لا توجد منتجات محفوظة", "Aucun favori", "No saved products yet")}
        </p>
      )}
      <div className="productGrid">
        {products
          .filter((p) => wishlist.includes(p.id))
          .map((p) => (
            <Card key={p.id} p={p} />
          ))}
      </div>
    </Page>
  );
}
