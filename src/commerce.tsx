import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, Trash2, PackageCheck } from "lucide-react";
import { useStore } from "./store";
import { Auth } from "./account";
import { Arrow, EmptyBag, Page, Unavailable } from "./ui";
import { lineTotal, photo, type LocalName } from "./model";
import { db } from "./db";
export function Cart() {
  const { cart, products, lang, t, money, qty, settings, loading, failed } =
    useStore();
  const lines = cart.map((l) => ({
    ...l,
    p: products.find((p) => p.id === l.id),
  }));
  const subtotal = lines.reduce(
      (v, l) => v + (l.p ? lineTotal(l.p, l.qty) : 0),
      0,
    ),
    gross = lines.reduce((v, l) => v + (l.p?.price || 0) * l.qty, 0),
    fee =
      settings.free_threshold !== null && subtotal >= settings.free_threshold
        ? 0
        : settings.shipping_fee;
  return (
    <Page title={t("سلة التسوق", "Mon panier", "Shopping bag")}>
      {!cart.length ? (
        <EmptyBag />
      ) : loading ? (
        <div className="skeleton" />
      ) : failed ? (
        <Unavailable />
      ) : (
        <div className="split">
          <div>
            {lines.map(({ id, qty: n, p }) => (
              <div className="cartRow" key={id}>
                {p && <img src={photo(p)} alt="" />}
                <div>
                  <h3>
                    {p?.[`name_${lang}`] ||
                      t("منتج غير متاح", "Indisponible", "Unavailable product")}
                  </h3>
                  <b>{money(p ? lineTotal(p, n) : 0)}</b>
                  {(!p || p.stock < n) && (
                    <small>
                      {t(
                        "الكمية غير متوفرة",
                        "Quantité indisponible",
                        "Quantity unavailable",
                      )}
                    </small>
                  )}
                  <div className="actions">
                    <div className="stepper">
                      <button
                        aria-label="−"
                        disabled={n <= 1}
                        onClick={() => qty(id, n - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      {n}
                      <button
                        aria-label="+"
                        disabled={!p || n >= Math.min(p.stock, 99)}
                        onClick={() => qty(id, n + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      className="ico"
                      aria-label={t("حذف", "Supprimer", "Remove")}
                      onClick={() => qty(id, 0)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="panel">
            <Totals
              q={{
                subtotal: gross,
                discount: gross - subtotal,
                shipping: fee,
                total: subtotal + fee,
              }}
            />
            {settings.cod && lines.every((l) => l.p && l.p.stock >= l.qty) && (
              <Link className="btn" to="/checkout">
                {t("إتمام الطلب", "Commander", "Checkout")}
                <Arrow />
              </Link>
            )}
          </aside>
        </div>
      )}
    </Page>
  );
}
type Quote = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};
export function Totals({ q }: { q: Quote }) {
  const { t, money } = useStore();
  return (
    <dl className="totals">
      {[
        [t("المجموع الفرعي", "Sous-total", "Subtotal"), q.subtotal],
        [t("التخفيض", "Réduction", "Discount"), -q.discount],
        [t("التوصيل", "Livraison", "Shipping"), q.shipping],
        [t("المجموع النهائي", "Total", "Total"), q.total],
      ].map(([a, b]) => (
        <div key={a}>
          <dt>{a}</dt>
          <dd>{money(Number(b))}</dd>
        </div>
      ))}
    </dl>
  );
}
export function Checkout() {
  const { t, lang, cart, setCart, user, settings, refresh, authReady, money } =
    useStore();
  const [coupon, C] = useState(""),
    [q, Q] = useState<
      | (Quote & {
          lines: (LocalName & { id: string; qty: number; line: number })[];
        })
      | null
    >(null),
    [err, E] = useState(""),
    [busy, B] = useState(false);
  const nav = useNavigate();
  const hash = JSON.stringify(cart);
  useEffect(() => {
    if (!user || !db) return;
    let current = true;
    const key = "aa.pending." + user.id,
      token = sessionStorage.getItem(key);
    if (token)
      db.from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("idempotency_key", token)
        .maybeSingle()
        .then(({ data }) => {
          if (current && data) {
            sessionStorage.removeItem(key);
            setCart([]);
            nav("/confirmation/" + data.id, { replace: true });
          }
        });
    return () => {
      current = false;
    };
  }, [user?.id]);
  useEffect(() => {
    Q(null);
  }, [coupon, hash, user?.id]);
  if (!authReady) return <div className="skeleton" />;
  if (!user) return <Auth />;
  if (!cart.length)
    return (
      <Page title={t("إتمام الطلب", "Commande", "Checkout")}>
        <EmptyBag />
      </Page>
    );
  return (
    <Page title={t("إتمام الطلب", "Finaliser la commande", "Checkout")}>
      <div className="split">
        <form
          className="form panel"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !db) return;
            B(true);
            E("");
            try {
              if (!q) {
                const r = await db.rpc("quote_order", { cart, coupon });
                if (r.error) throw r.error;
                Q(r.data);
                return;
              }
              const delivery = Object.fromEntries(
                new FormData(e.currentTarget),
              );
              const key = "aa.pending." + user.id;
              const request_key =
                sessionStorage.getItem(key) || crypto.randomUUID();
              sessionStorage.setItem(key, request_key);
              const r = await db.rpc("place_order", {
                cart,
                coupon,
                delivery,
                request_key,
                expected_total: q.total,
              });
              if (r.error) throw r.error;
              sessionStorage.removeItem(key);
              setCart([]);
              refresh();
              nav("/confirmation/" + r.data, { replace: true });
            } catch {
              E(
                t(
                  "تعذر تأكيد الطلب. تحققي من الرصيد والرمز وسجل الطلبات قبل المحاولة مجدداً.",
                  "Impossible de confirmer. Vérifiez le stock, le code et vos commandes avant de réessayer.",
                  "Could not confirm. Check stock, coupon and order history before retrying.",
                ),
              );
              Q(null);
            } finally {
              B(false);
            }
          }}
        >
          {[
            ["name", t("الاسم الكامل", "Nom complet", "Full name"), 100],
            ["phone", t("رقم الهاتف", "Téléphone", "Phone"), 20],
            ["city", t("المدينة", "Ville", "City"), 100],
            [
              "address",
              t("عنوان التوصيل", "Adresse de livraison", "Delivery address"),
              500,
            ],
            [
              "instructions",
              t(
                "تعليمات إضافية",
                "Instructions facultatives",
                "Optional instructions",
              ),
              500,
            ],
          ].map(([k, label, max]) => (
            <label key={k}>
              {label}
              <input
                name={String(k)}
                minLength={k === "address" ? 5 : k === "name" ? 2 : 1}
                maxLength={Number(max)}
                type={k === "phone" ? "tel" : "text"}
                pattern={k === "phone" ? "[+]?[0-9 ]{8,20}" : undefined}
                required={k !== "instructions"}
              />
            </label>
          ))}
          <label>
            {t("رمز التخفيض", "Code promotionnel", "Discount code")}
            <input
              maxLength={40}
              value={coupon}
              onChange={(e) => C(e.target.value)}
            />
          </label>
          <p>
            {t(
              "الدفع عند الاستلام",
              "Paiement à la livraison",
              "Cash on delivery",
            )}
          </p>
          <button disabled={busy || !settings.cod}>
            {q
              ? t("تأكيد الطلب", "Confirmer la commande", "Place order")
              : t("مراجعة الطلب", "Vérifier la commande", "Review order")}
          </button>
          {err && (
            <p role="alert">
              {err}{" "}
              <Link to="/orders">
                {t("طلباتي", "Mes commandes", "My orders")}
              </Link>
            </p>
          )}
        </form>
        <aside className="panel">
          <h2>{t("ملخص الطلب", "Récapitulatif", "Order summary")}</h2>
          {q ? (
            <>
              {q.lines.map((l) => (
                <p key={l.id}>
                  {l[`name_${lang}`]} × {l.qty} · {money(l.line)}
                </p>
              ))}
              <Totals q={q} />
            </>
          ) : (
            <p>
              {t(
                "راجعي الطلب للحصول على المجموع المؤكد قبل إرساله.",
                "Vérifiez la commande pour obtenir le total avant confirmation.",
                "Review your order to see the verified total before placing it.",
              )}
            </p>
          )}
        </aside>
      </div>
    </Page>
  );
}
export const statusLabels: Record<string, [string, string, string]> = {
  pending: ["قيد الانتظار", "En attente", "Pending"],
  confirmed: ["مؤكد", "Confirmée", "Confirmed"],
  preparing: ["قيد التحضير", "En préparation", "Preparing"],
  shipped: ["تم الشحن", "Expédiée", "Shipped"],
  delivered: ["تم التسليم", "Livrée", "Delivered"],
  cancelled: ["ملغى", "Annulée", "Cancelled"],
  returned: ["مرتجع", "Retournée", "Returned"],
};
export type Order = Quote & {
  id: string;
  reference: string;
  status: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  instructions: string;
  tracking: string;
  user_id: string;
  created_at: string;
  order_items: (LocalName & {
    id: string;
    product_id: string;
    quantity: number;
    line_total: number;
  })[];
  order_status_history: { id: string; status: string; created_at: string }[];
};
export function Orders() {
  const confirmed = useLocation().pathname.startsWith("/confirmation/");
  const { id } = useParams(),
    { user, t, money, lang, settings } = useStore(),
    [list, L] = useState<Order[]>([]),
    [error, E] = useState(false),
    [busy, B] = useState(true);
  useEffect(() => {
    if (!user || !db) return;
    let live = true;
    B(true);
    let req = db
      .from("orders")
      .select("*,order_items(*),order_status_history(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (id) req = req.eq("id", id);
    req.then((r) => {
      if (live) {
        L(r.data || []);
        E(!!r.error);
        B(false);
      }
    });
    return () => {
      live = false;
    };
  }, [user?.id, id]);
  if (!user) return <Auth />;
  const o = list[0];
  return (
    <Page
      title={
        id && confirmed && o
          ? t(
              "تم استلام طلبك",
              "Votre commande est enregistrée",
              "Your order has been received",
            )
          : id
            ? t("تفاصيل الطلب", "Détails de la commande", "Order details")
            : t("طلباتي", "Mes commandes", "My orders")
      }
    >
      {busy ? (
        <div className="skeleton" />
      ) : error ? (
        <Unavailable />
      ) : !o ? (
        <p>{t("لا توجد طلبات", "Aucune commande", "No orders found")}</p>
      ) : id ? (
        <div className="panel narrow">
          <PackageCheck />
          <h2>{o.reference}</h2>
          <p>{t(...statusLabels[o.status])}</p>
          {o.order_items.map((l) => (
            <p key={l.id}>
              {l[`name_${lang}`]} × {l.quantity} · {money(l.line_total)}
            </p>
          ))}
          <Totals q={o} />
          <p>
            {o.name} · {o.city} · {o.address}
          </p>
          {o.tracking && (
            <p>
              {t("رقم التتبع", "Suivi", "Tracking")}: {o.tracking}
            </p>
          )}
          {o.order_status_history.map((h) => (
            <small key={h.id}>
              {new Date(h.created_at).toLocaleString(lang)} ·{" "}
              {t(...statusLabels[h.status])}
              <br />
            </small>
          ))}
          {settings.wa_confirmation && (
            <a
              className="btn"
              href={
                "https://wa.me/" +
                settings.whatsapp +
                "?text=" +
                encodeURIComponent(
                  [
                    o.reference,
                    ...o.order_items.map(
                      (x) => x[`name_${lang}`] + " × " + x.quantity,
                    ),
                    money(o.total),
                  ].join("\n"),
                )
              }
            >
              WhatsApp <Arrow />
            </a>
          )}
        </div>
      ) : (
        list.map((x) => (
          <Link className="listRow" key={x.id} to={"/orders/" + x.id}>
            <b>{x.reference}</b>
            {t(...statusLabels[x.status])}
            <span>{money(x.total)}</span>
            <Arrow />
          </Link>
        ))
      )}
    </Page>
  );
}
