import { useState } from "react";
import { db } from "../db";
import { useStore } from "../store";
import { statusLabels, Totals, type Order } from "../commerce";
import { check, exportCSV, Load, useJob, useRows } from "./shared";
const cols =
  "id,reference,user_id,status,name,phone,city,address,instructions,tracking,subtotal,discount,shipping,total,created_at,order_items(*),order_status_history(*)";
export function StaffOrders() {
  const { t, lang, money, roles } = useStore(),
    job = useJob(),
    data = useRows<Order>("orders", job.revision, cols, "created_at"),
    [id, I] = useState(""),
    [q, Q] = useState(""),
    [s, S] = useState("");
  const list = data.rows.filter(
      (o) =>
        (!s || o.status === s) &&
        [o.reference, o.name, o.phone, o.city]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
    ),
    o = data.rows.find((x) => x.id === id);
  const canEdit = roles.some((x) =>
    ["super_admin", "order_manager"].includes(x),
  );
  if (o)
    return (
      <>
        <button className="noPrint textLink" onClick={() => I("")}>
          {t("جميع الطلبات", "Toutes les commandes", "All orders")}
        </button>
        <article className="panel invoice">
          <h2>{o.reference}</h2>
          <p>
            {new Date(o.created_at).toLocaleString(lang)} ·{" "}
            {t(...statusLabels[o.status])}
          </p>
          <p>
            {o.name} · {o.phone}
            <br />
            {o.city} · {o.address}
            <br />
            {o.instructions}
          </p>
          {o.order_items.map((x) => (
            <div className="listRow" key={x.id}>
              {x[`name_${lang}`]} × {x.quantity}
              <b>{money(x.line_total)}</b>
            </div>
          ))}
          <Totals q={o} />
          {o.tracking && <p>{o.tracking}</p>}
        </article>
        <div className="actions">
          <button onClick={() => window.print()}>
            {t("طباعة الفاتورة", "Imprimer la facture", "Print invoice")}
          </button>
          <a
            className="btn light"
            href={
              "https://wa.me/" +
              o.phone.replace(/\D/g, "").replace(/^0/, "212") +
              "?text=" +
              encodeURIComponent(o.reference)
            }
          >
            WhatsApp
          </a>
        </div>
        <div className="noPrint">
          {canEdit && (
            <form
              className="form panel"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  !confirm(
                    t(
                      "تأكيد تحديث الطلب؟",
                      "Confirmer la modification ?",
                      "Confirm order update?",
                    ),
                  )
                )
                  return;
                job.run(async () => {
                  check(
                    await db!.rpc("update_order", {
                      oid: o.id,
                      next_status: f.get("status"),
                      tracking_number: f.get("tracking"),
                    }),
                  );
                });
              }}
            >
              <label>
                {t("الحالة", "Statut", "Status")}
                <select name="status" defaultValue={o.status}>
                  {[
                    o.status,
                    ...({
                      pending: ["confirmed", "cancelled"],
                      confirmed: ["preparing", "cancelled"],
                      preparing: ["shipped", "cancelled"],
                      shipped: ["delivered", "returned"],
                      delivered: ["returned"],
                    }[o.status] || []),
                  ].map((s) => (
                    <option key={s} value={s}>
                      {t(...statusLabels[s])}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("رقم التتبع", "N° de suivi", "Tracking number")}
                <input
                  name="tracking"
                  defaultValue={o.tracking}
                  maxLength={160}
                />
              </label>
              <button disabled={job.busy}>
                {t("تحديث", "Mettre à jour", "Update")}
              </button>
            </form>
          )}
          <Notes id={o.id} />
          <h3>{t("سجل الحالة", "Historique", "Status history")}</h3>
          {o.order_status_history.map((h) => (
            <p key={h.id}>
              {new Date(h.created_at).toLocaleString(lang)} ·{" "}
              {t(...statusLabels[h.status])}
            </p>
          ))}
          <p role="status">{job.msg}</p>
        </div>
      </>
    );
  return (
    <>
      <div className="filterBar">
        <input
          aria-label={t("بحث", "Recherche", "Search")}
          value={q}
          onChange={(e) => Q(e.target.value)}
          placeholder={t(
            "مرجع أو اسم أو هاتف",
            "Référence, nom, téléphone",
            "Reference, name or phone",
          )}
        />
        <select
          aria-label={t("الحالة", "Statut", "Status")}
          value={s}
          onChange={(e) => S(e.target.value)}
        >
          <option value="">
            {t("جميع الحالات", "Tous les statuts", "All statuses")}
          </option>
          {Object.keys(statusLabels).map((x) => (
            <option key={x} value={x}>
              {t(...statusLabels[x])}
            </option>
          ))}
        </select>
        <button
          disabled={!list.length}
          onClick={() =>
            exportCSV("orders", [
              ["Reference", "Date", "Status", "Total MAD"],
              ...list.map((x) => [
                x.reference,
                x.created_at,
                x.status,
                x.total,
              ]),
            ])
          }
        >
          CSV ↓
        </button>
      </div>
      <Load {...data} />
      {list.map((o) => (
        <div className="listRow" key={o.id}>
          <b>{o.reference}</b>
          {o.name}
          <span>{t(...statusLabels[o.status])}</span>
          {money(o.total)}
          <button onClick={() => I(o.id)}>
            {t("التفاصيل", "Détails", "Details")}
          </button>
        </div>
      ))}
      {!list.length && !data.loading && (
        <p>{t("لا توجد طلبات", "Aucune commande", "No orders found")}</p>
      )}
    </>
  );
}
function Notes({ id }: { id: string }) {
  const { t } = useStore(),
    job = useJob(),
    data = useRows<{ id: string; note: string; order_id: string }>(
      "order_notes",
      job.revision,
    );
  return (
    <>
      <h3>{t("ملاحظات داخلية", "Notes internes", "Internal notes")}</h3>
      <Load {...data} />
      {data.rows
        .filter((x) => x.order_id === id)
        .map((x) => (
          <p key={x.id}>{x.note}</p>
        ))}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = e.currentTarget,
            note = new FormData(f).get("note");
          job.run(async () => {
            check(await db!.from("order_notes").insert({ order_id: id, note }));
            f.reset();
          });
        }}
      >
        <label>
          {t("ملاحظة", "Note", "Note")}
          <input name="note" required maxLength={2000} />
        </label>
        <button disabled={job.busy}>{t("إضافة", "Ajouter", "Add")}</button>
      </form>
      <p>{job.msg}</p>
    </>
  );
}
export function Customers() {
  const { t, money, roles, lang } = useStore(),
    job = useJob(),
    users = useRows<{ id: string; active: boolean; created_at: string }>(
      "customers",
      job.revision,
    ),
    profiles = useRows<{ id: string; display_name: string }>("profiles"),
    orders = useRows<Order>(
      "orders",
      job.revision,
      "id,reference,user_id,name,phone,city,address,total,status,created_at",
      "created_at",
    ),
    [q, Q] = useState(""),
    [id, I] = useState("");
  return (
    <>
      <input
        placeholder={t("اسم أو هاتف", "Nom ou téléphone", "Name or phone")}
        aria-label={t("بحث", "Recherche", "Search")}
        value={q}
        onChange={(e) => Q(e.target.value)}
      />
      <Load {...users} />
      <Load {...profiles} />
      <Load {...orders} />
      {users.rows.map((u) => {
        const os = orders.rows.filter((x) => x.user_id === u.id),
          name =
            profiles.rows.find((p) => p.id === u.id)?.display_name ||
            os[0]?.name ||
            u.id;
        if (
          ![name, os[0]?.phone]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase())
        )
          return null;
        return (
          <section className="panel" key={u.id}>
            <div className="listRow">
              <b>{name}</b>
              <span>
                {money(
                  os
                    .filter((x) => x.status === "delivered")
                    .reduce((a, x) => a + x.total, 0),
                )}
              </span>
              <button onClick={() => I(id === u.id ? "" : u.id)}>
                {t("الملف الشخصي", "Profil", "Profile")}
              </button>
            </div>
            {id === u.id && (
              <>
                <p>
                  {os[0]?.phone} · {os[0]?.city} · {os[0]?.address}
                </p>
                <p>
                  {new Date(u.created_at).toLocaleDateString(lang)} ·{" "}
                  {u.active
                    ? t("نشط", "Actif", "Active")
                    : t("موقوف", "Suspendu", "Suspended")}
                </p>
                {roles.includes("super_admin") && (
                  <button
                    className="light"
                    disabled={job.busy}
                    onClick={() => {
                      if (
                        confirm(
                          t(
                            "تغيير حالة الشراء؟",
                            "Modifier le droit de commander ?",
                            "Change checkout eligibility?",
                          ),
                        )
                      )
                        job.run(async () => {
                          check(
                            await db!
                              .from("customers")
                              .update({ active: !u.active })
                              .eq("id", u.id)
                              .select()
                              .single(),
                          );
                        });
                    }}
                  >
                    {u.active
                      ? t(
                          "إيقاف الطلبات",
                          "Suspendre les commandes",
                          "Suspend ordering",
                        )
                      : t(
                          "تفعيل الطلبات",
                          "Autoriser les commandes",
                          "Enable ordering",
                        )}
                  </button>
                )}
                {os.map((o) => (
                  <p key={o.id}>
                    {o.reference} · {t(...statusLabels[o.status])} ·{" "}
                    {money(o.total)}
                  </p>
                ))}
              </>
            )}
          </section>
        );
      })}
      <p>{job.msg}</p>
    </>
  );
}
