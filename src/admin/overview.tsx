import { useState } from "react";
import { useStore } from "../store";
import { statusLabels, type Order } from "../commerce";
import type { Product } from "../model";
import { exportCSV, Load, useRows } from "./shared";
export default function Overview() {
  const { t, lang, money } = useStore(),
    orders = useRows<Order>(
      "orders",
      0,
      "id,reference,status,total,created_at,order_items(product_id,quantity,name_ar,name_en,name_fr)",
      "created_at",
    ),
    custom = useRows<{ id: string }>("customers", 0, "id"),
    ps = useRows<Product>("products", 0, "id,name_ar,name_fr,name_en,stock"),
    [from, F] = useState(""),
    [to, T] = useState(""),
    [period, P] = useState("month");
  if ([orders, custom, ps].some((d) => d.loading || d.error))
    return (
      <Load
        loading={[orders, custom, ps].some((d) => d.loading)}
        error={[orders, custom, ps].some((d) => d.error)}
      />
    );
  const os = orders.rows.filter(
      (x) =>
        (!from || x.created_at.slice(0, 10) >= from) &&
        (!to || x.created_at.slice(0, 10) <= to),
    ),
    del = os.filter((x) => x.status === "delivered"),
    low = ps.rows.filter((x) => x.stock <= 5);
  const metrics: [string, string | number][] = [
    [
      t("إيرادات الطلبات المسلّمة", "Revenu livré", "Delivered revenue"),
      money(del.reduce((a, x) => a + x.total, 0)),
    ],
    [t("الطلبات", "Commandes", "Orders"), os.length],
    [t("العملاء", "Clients", "Customers"), custom.rows.length],
    [t("المنتجات", "Produits", "Products"), ps.rows.length],
    [t("مخزون منخفض (≤5)", "Stock faible (≤5)", "Low stock (≤5)"), low.length],
    ...Object.keys(statusLabels).map(
      (s) =>
        [t(...statusLabels[s]), os.filter((x) => x.status === s).length] as [
          string,
          number,
        ],
    ),
  ];
  const chart: Record<string, number> = {},
    best: Record<string, { name: string; n: number }> = {};
  for (const o of del) {
    const d = new Date(o.created_at);
    if (period === "week")
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const key = d.toISOString().slice(0, period === "week" ? 10 : 7);
    chart[key] = (chart[key] || 0) + o.total;
    for (const x of o.order_items) {
      best[x.product_id] ??= { name: x[`name_${lang}`], n: 0 };
      best[x.product_id].n += x.quantity;
    }
  }
  return (
    <>
      <div className="filterBar">
        <label>
          {t("من", "Du", "From")}{" "}
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => F(e.target.value)}
          />
        </label>
        <label>
          {t("إلى", "Au", "To")}{" "}
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => T(e.target.value)}
          />
        </label>
        <button onClick={() => exportCSV("performance", metrics)}>CSV ↓</button>
      </div>
      <div className="metrics">
        {metrics.map(([k, v]) => (
          <div key={k} className="metric">
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <h2>{t("تحليل الإيرادات", "Évolution du revenu", "Revenue trends")}</h2>
      <select
        aria-label={t("الفترة", "Période", "Period")}
        value={period}
        onChange={(e) => P(e.target.value)}
      >
        <option value="month">{t("شهري", "Mensuel", "Monthly")}</option>
        <option value="week">{t("أسبوعي", "Hebdomadaire", "Weekly")}</option>
      </select>
      {Object.entries(chart)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([d, n]) => (
          <div className="chartRow" key={d}>
            <span>{d}</span>
            <i
              style={{
                width: (60 * n) / Math.max(1, ...Object.values(chart)) + "%",
              }}
            />
            {money(n)}
          </div>
        ))}
      {!del.length && (
        <p>
          {t(
            "لا توجد مبيعات مسلّمة في هذه الفترة",
            "Aucune vente livrée sur cette période",
            "No delivered sales in this period",
          )}
        </p>
      )}
      <h2>{t("الأكثر مبيعاً", "Meilleures ventes", "Best sellers")}</h2>
      {Object.values(best)
        .sort((a, b) => b.n - a.n)
        .slice(0, 10)
        .map((x) => (
          <p key={x.name}>
            {x.name} · {x.n}
          </p>
        ))}
      <h2>{t("تنبيهات المخزون", "Alertes de stock", "Stock alerts")}</h2>
      {low.map((x) => (
        <p key={x.id}>
          {x[`name_${lang}`]} · {x.stock}
        </p>
      ))}
      <h2>{t("أحدث الطلبات", "Commandes récentes", "Recent orders")}</h2>
      {os.slice(0, 8).map((x) => (
        <p key={x.id}>
          {x.reference} · {t(...statusLabels[x.status])} · {money(x.total)}
        </p>
      ))}
    </>
  );
}
