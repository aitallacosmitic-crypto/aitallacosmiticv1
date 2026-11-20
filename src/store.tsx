import { assetUrl } from "./assets";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { db } from "./db";
import {
  defaultSettings,
  type Lang,
  type Line,
  type Settings,
  type Product,
  type Category,
} from "./model";
type T = (ar: string, fr: string, en: string) => string;
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function useStateModel() {
  const [lang, setLang] = useState<Lang>(() => {
      const s = read("aa.lang", "ar");
      return ["ar", "en", "fr"].includes(s) ? (s as Lang) : "ar";
    }),
    [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(!db),
    [roles, setRoles] = useState<string[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [settings, setSettings] = useState<Settings>(defaultSettings),
    [loading, setLoading] = useState(!!db),
    [failed, setFailed] = useState(!db),
    [cart, setCart] = useState<Line[]>(() => {
      const arr = read<Line[]>("aa.cart", []);
      return Array.isArray(arr)
        ? arr.filter(
            (x) =>
              x &&
              typeof x.id === "string" &&
              Number.isInteger(x.qty) &&
              x.qty > 0 &&
              x.qty <= 99,
          )
        : [];
    }),
    [toast, notify] = useState(""),
    [wishlist, setWishlist] = useState<string[]>([]),
    [wid, setWid] = useState("");
  const t: T = (ar, fr, en) => ({ ar, fr, en })[lang];
  const money = (n: number) =>
    new Intl.NumberFormat(lang === "ar" ? "ar-MA" : lang, {
      style: "currency",
      currency: "MAD",
    }).format(n);
  const refresh = useCallback(async () => {
    if (!db) return;
    const [p, c, s] = await Promise.all([
      db
        .from("products")
        .select("*,product_images(id,url,position)")
        .eq("active", true)
        .eq("published", true)
        .order("created_at"),
      db.from("categories").select("*"),
      db.from("site_settings").select("*").single(),
    ]);
    setFailed(!!(p.error || c.error || s.error));
    if (p.data)
      setProducts(
        p.data.map((p) => ({
          ...p,
          product_images: p.product_images.map(
            (im: Product["product_images"][number]) => ({
              ...im,
              url: assetUrl(im.url),
            }),
          ),
        })),
      );
    if (c.data)
      setCategories(
        c.data.map((c) => ({
          ...c,
          image_url: c.image_url ? assetUrl(c.image_url) : null,
        })),
      );
    if (s.data)
      setSettings({
        ...s.data,
        hero_url: s.data.hero_url ? assetUrl(s.data.hero_url) : null,
      });
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!db) return;
    let debounce: ReturnType<typeof setTimeout>;
    let channel = db.channel("catalog-refresh");
    for (const table of [
      "products",
      "categories",
      "product_images",
      "site_settings",
    ])
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          clearTimeout(debounce);
          debounce = setTimeout(refresh, 250);
        },
      );
    channel.subscribe();
    return () => {
      clearTimeout(debounce);
      void db!.removeChannel(channel);
    };
  }, [refresh]);
  useEffect(() => {
    if (
      settings.available_languages &&
      !settings.available_languages.includes(lang)
    )
      setLang(settings.available_languages[0]);
  }, [settings, lang]);
  useEffect(() => {
    refresh();
    const focus = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", focus);
    const timer = setInterval(focus, 60000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  useEffect(() => {
    const sub = db?.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      setAuthReady(true);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setRoles([]);
    setWishlist([]);
    setWid("");
    if (!db || !user) return;
    let current = true;
    Promise.all([
      db.from("user_roles").select("role").eq("user_id", user.id),
      db
        .from("wishlists")
        .select("id,wishlist_items(product_id)")
        .eq("user_id", user.id)
        .single(),
    ]).then(([r, w]) => {
      if (!current) return;
      setRoles(r.data?.map((x) => x.role) || []);
      if (w.data) {
        setWid(w.data.id);
        setWishlist(w.data.wishlist_items.map((x) => x.product_id));
      }
    });
    return () => {
      current = false;
    };
  }, [user?.id]);
  useEffect(() => {
    localStorage.setItem("aa.lang", JSON.stringify(lang));
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    localStorage.setItem("aa.cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => notify(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const qty = (id: string, n: number) =>
    setCart((old) => [
      ...old.filter((x) => x.id !== id),
      ...(n > 0 ? [{ id, qty: Math.min(99, Math.floor(n)) }] : []),
    ]);
  const add = (p: Product, n = 1) => {
    qty(
      p.id,
      Math.min(p.stock, n + (cart.find((x) => x.id === p.id)?.qty ?? 0)),
    );
    notify(t("أُضيف إلى السلة", "Ajouté au panier", "Added to bag"));
  };
  const heart = async (id: string) => {
    if (!db || !user || !wid) {
      notify(
        t(
          "سجّل الدخول لحفظ المفضلة",
          "Connectez-vous pour enregistrer",
          "Sign in to save favorites",
        ),
      );
      return;
    }
    const has = wishlist.includes(id);
    const { error } = await (has
      ? db
          .from("wishlist_items")
          .delete()
          .eq("wishlist_id", wid)
          .eq("product_id", id)
      : db.from("wishlist_items").insert({ wishlist_id: wid, product_id: id }));
    if (!error)
      setWishlist((v) => (has ? v.filter((x) => x !== id) : [...v, id]));
    else notify(t("تعذر الحفظ", "Échec de l’enregistrement", "Could not save"));
  };
  return {
    lang,
    setLang,
    t,
    money,
    user,
    authReady,
    roles,
    products,
    categories,
    settings,
    loading,
    failed,
    refresh,
    cart,
    qty,
    add,
    setCart,
    toast,
    notify,
    wishlist,
    heart,
  };
}
const C = createContext<ReturnType<typeof useStateModel> | null>(null);
export function Store({ children }: { children: ReactNode }) {
  return <C.Provider value={useStateModel()}>{children}</C.Provider>;
}
export const useStore = () => useContext(C)!;
