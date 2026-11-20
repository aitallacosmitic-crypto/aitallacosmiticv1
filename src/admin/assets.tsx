import { assetRef } from "../assets";
import { useState } from "react";
import { db } from "../db";
import { useStore } from "../store";
import { check } from "./shared";
import type { Lang } from "../model";
export function AssetUpload({
  bucket,
  save,
}: {
  bucket: "homepage-banners" | "category-images" | "brand-assets";
  save: (url: string) => Promise<void>;
}) {
  const { t } = useStore(),
    [msg, M] = useState(""),
    [busy, B] = useState(false);
  return (
    <div className="panel">
      <label>
        {t(
          "رفع صورة · PNG / JPEG / WebP",
          "Téléverser une image · PNG / JPEG / WebP",
          "Upload image · PNG / JPEG / WebP",
        )}{" "}
        <input
          type="file"
          accept="image/webp,image/jpeg,image/png"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            B(true);
            M("");
            try {
              const ext = {
                "image/jpeg": "jpg",
                "image/png": "png",
                "image/webp": "webp",
              }[file.type];
              if (!ext || file.size > 5242880) throw Error();
              const path = crypto.randomUUID() + "." + ext,
                b = db!.storage.from(bucket);
              check(await b.upload(path, file));
              try {
                await save(assetRef(b.getPublicUrl(path).data.publicUrl));
              } catch (error) {
                await b.remove([path]);
                throw error;
              }
              M(t("تم رفع الصورة", "Image enregistrée", "Image uploaded"));
            } catch {
              M(
                t(
                  "تعذر رفع الصورة (الحد 5 MB)",
                  "Échec du téléversement (5 Mo max.)",
                  "Upload failed (5 MB limit)",
                ),
              );
            } finally {
              B(false);
            }
          }}
        />
      </label>
      <p role="status">{msg}</p>
    </div>
  );
}
export function Languages() {
  const { t, settings, refresh } = useStore(),
    [msg, M] = useState("");
  return (
    <form
      className="panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const languages = new FormData(e.currentTarget).getAll("lang");
        if (!languages.length) {
          M(
            t(
              "اختاري لغة واحدة على الأقل",
              "Choisissez au moins une langue",
              "Select at least one language",
            ),
          );
          return;
        }
        const { error } = await db!
          .from("site_settings")
          .update({ available_languages: languages })
          .eq("id", true);
        M(
          error
            ? t("خطأ", "Erreur", "Error")
            : t("تم الحفظ", "Enregistré", "Saved"),
        );
        refresh();
      }}
    >
      <p>
        {t("لغات المتجر", "Langues de la boutique", "Store languages")} · MAD
      </p>
      {(["ar", "fr", "en"] as Lang[]).map((l) => (
        <label key={l}>
          <input
            type="checkbox"
            name="lang"
            value={l}
            defaultChecked={settings.available_languages?.includes(l) ?? true}
          />
          {{ ar: "العربية", en: "English", fr: "Français" }[l]}
        </label>
      ))}
      <button>{t("حفظ", "Enregistrer", "Save")}</button>
      <p role="status">{msg}</p>
    </form>
  );
}
