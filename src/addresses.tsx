import { useEffect, useState } from "react";
import { db } from "./db";
import { useStore } from "./store";
export default function Addresses() {
  const { user, t } = useStore(),
    [rows, R] = useState<{ id: string; city: string; address: string }[]>([]),
    [rev, V] = useState(0),
    [error, E] = useState(false);
  useEffect(() => {
    if (user)
      db?.from("addresses")
        .select("id,city,address")
        .eq("user_id", user.id)
        .then((r) => {
          R(r.data || []);
          E(!!r.error);
        });
  }, [user?.id, rev]);
  return (
    <section className="narrow">
      <h2>{t("عناويني", "Mes adresses", "Address book")}</h2>
      {rows.map((r) => (
        <div key={r.id} className="listRow">
          <span>
            {r.city} · {r.address}
          </span>
          <button
            className="textLink"
            onClick={async () => {
              if (
                !confirm(
                  t(
                    "حذف العنوان؟",
                    "Supprimer cette adresse ?",
                    "Remove this address?",
                  ),
                )
              )
                return;
              const result = await db!
                .from("addresses")
                .delete()
                .eq("id", r.id);
              E(!!result.error);
              if (!result.error) V((x) => x + 1);
            }}
          >
            {t("حذف", "Supprimer", "Remove")}
          </button>
        </div>
      ))}
      <form
        className="form panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            f = new FormData(form),
            r = await db!
              .from("addresses")
              .insert({
                user_id: user?.id,
                city: f.get("city"),
                address: f.get("address"),
              });
          E(!!r.error);
          if (!r.error) {
            form.reset();
            V((x) => x + 1);
          }
        }}
      >
        <label>
          {t("المدينة", "Ville", "City")}
          <input required name="city" maxLength={100} />
        </label>
        <label>
          {t("العنوان", "Adresse", "Address")}
          <input required name="address" maxLength={500} minLength={5} />
        </label>
        <button>
          {t("إضافة عنوان", "Ajouter une adresse", "Add address")}
        </button>
      </form>
      {error && (
        <p role="alert">
          {t(
            "تعذرت العملية",
            "Opération impossible",
            "Could not complete the operation",
          )}
        </p>
      )}
    </section>
  );
}
