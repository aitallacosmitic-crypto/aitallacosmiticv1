import { assetUrl } from "./assets";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Leaf,
  Truck,
  MessageCircle,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
  Flower2,
} from "lucide-react";
import { useStore } from "./store";
import { Arrow, Card, Eyebrow } from "./ui";
export function Benefits() {
  const { t, settings } = useStore();
  return (
    <div className="benefits">
      <div className="wrap benefitsGrid">
        {[
          [
            Truck,
            settings.shipping_fee === 0
              ? t("توصيل مجاني", "Livraison offerte", "Free delivery")
              : t("التوصيل", "Livraison", "Delivery"),
            t("إلى جميع أنحاء المغرب", "Partout au Maroc", "Across Morocco"),
          ],
          [
            PackageCheck,
            t(
              "الدفع عند الاستلام",
              "Paiement à la livraison",
              "Cash on delivery",
            ),
            t(
              "اطلبي بكل ثقة",
              "Commandez en confiance",
              "Order with confidence",
            ),
          ],
          [
            Leaf,
            t("عناية بطابع مغربي", "Rituels marocains", "Moroccan care"),
            t(
              "مستوحاة من الطبيعة",
              "Inspirés de la nature",
              "Inspired by nature",
            ),
          ],
          [
            MessageCircle,
            t("تواصل مباشر", "À votre écoute", "Personal assistance"),
            t("عبر الواتساب", "Sur WhatsApp", "Via WhatsApp"),
          ],
        ].map(([I, a, b], i) => {
          const Icon = I as typeof Truck;
          if (i === 1 && !settings.cod) return null;
          return (
            <div className="benefit" key={i}>
              <Icon size={29} strokeWidth={1.3} />
              <div>
                <b>{String(a)}</b>
                <small>{String(b)}</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default function Home() {
  const { t, lang, products, categories, settings } = useStore();
  const [slide, S] = useState(0);
  const cards = [
    {
      id: "skin",
      a: t("العناية بالبشرة", "Soins du visage", "Skin care"),
      b: "SOINS DU VISAGE",
    },
    {
      id: "body",
      a: t("العناية بالجسم", "Soins du corps", "Body care"),
      b: "SOINS DU CORPS",
    },
    {
      id: "wellness",
      a: t("المكملات الغذائية", "Compléments alimentaires", "Supplements"),
      b: "BIEN-ÊTRE",
    },
  ];
  const collections = categories.length
    ? categories.map((c, i) => ({
        id: c.slug,
        a: c[`name_${lang}`],
        b: c.name_fr.toUpperCase(),
        img:
          c.image_url ||
          "/art/" +
            (cards.find((x) => x.id === c.slug)?.id || cards[i % 3].id) +
            ".webp",
      }))
    : cards.map((c) => ({ ...c, img: "/art/" + c.id + ".webp" }));
  const titles = [
    [
      t("جمالكِ، من وحي", "Votre beauté,", "Your beauty,"),
      t("الطبيعة المغربية", "la nature marocaine", "Moroccan nature"),
    ],
    [
      t("لحظات من", "Un moment de", "A moment of"),
      t("العناية بالبشرة", "soin du visage", "skin care"),
    ],
    [
      t("اكتشفي طقوس", "Découvrez les", "Discover rituals of"),
      t("العناية بالجسم", "soins du corps", "body care"),
    ],
  ];
  return (
    <>
      <section
        className={"hero slide" + slide}
        style={{
          backgroundImage: `url("${[settings.hero_url || "/art/ritual.webp", "/art/skin.webp", "/art/body.webp"][slide]}")`,
        }}
      >
        <div className="wrap heroInner">
          <div className="heroCopy">
            <div className="herolabel">
              <span>✧</span>{" "}
              {t(
                "طقوس الجمال المغربية",
                "Rituels de beauté marocains",
                "Moroccan beauty rituals",
              )}
            </div>
            <h1>
              {titles[slide][0]}
              <br />
              <em>{titles[slide][1]}</em>
            </h1>
            <p>
              {t(
                "اكتشفي مجموعتنا المختارة للعناية بجمالكِ، حيث تلتقي أصالة الطبيعة المغربية بأناقة العناية اليومية.",
                "Découvrez nos soins choisis, où la nature marocaine rencontre l’élégance du rituel quotidien.",
                "Discover our collection of daily care rituals, where Moroccan nature meets everyday elegance.",
              )}
            </p>
            <div className="heroBtns">
              <Link
                className="btn"
                to={
                  slide
                    ? "/catalog?category=" + cards[slide - 1].id
                    : "/catalog"
                }
              >
                {t(
                  "تسوّقي المجموعة",
                  "Explorer la collection",
                  "Shop the collection",
                )}{" "}
                <Arrow size={17} />
              </Link>
              <Link className="textLink" to="/about">
                {t("اكتشفي قصتنا", "Notre histoire", "Our story")}
              </Link>
            </div>
          </div>
        </div>
        <div className="slideNav" dir="ltr">
          <button
            aria-label={t("السابق", "Précédent", "Previous slide")}
            onClick={() => S((slide + 2) % 3)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>0{slide + 1}</span>
          <i />
          <small>03</small>
          <button
            aria-label={t("التالي", "Suivant", "Next slide")}
            onClick={() => S((slide + 1) % 3)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </section>
      <Benefits />
      {settings.campaign_active &&
        settings[`campaign_${lang}`] &&
        (!settings.campaign_start ||
          Date.parse(settings.campaign_start) <= Date.now()) &&
        (!settings.campaign_end ||
          Date.parse(settings.campaign_end) > Date.now()) && (
          <aside className="wrap campaignStrip">
            {settings.campaign_url && (
              <img
                src={assetUrl(settings.campaign_url)}
                alt=""
                loading="lazy"
              />
            )}
            <p>{settings[`campaign_${lang}`]}</p>
            <Link className="textLink" to="/catalog">
              {t("اكتشفي العرض", "Découvrir l’offre", "Explore the offer")}{" "}
              <Arrow />
            </Link>
          </aside>
        )}
      <section className="categories wrap">
        <div className="sectionHead">
          <div>
            <Eyebrow>LES COLLECTIONS</Eyebrow>
            <h2>
              {t(
                "تسوّقي حسب الفئة",
                "Explorer par catégorie",
                "Shop by category",
              )}
            </h2>
          </div>
          <Link className="textLink" to="/catalog">
            {t("عرض كل المنتجات", "Tous les produits", "View all products")}{" "}
            <Arrow size={16} />
          </Link>
        </div>
        <div className="categoryGrid">
          {collections.map((c, i) => (
            <Link
              className="catTile"
              to={"/catalog?category=" + c.id}
              key={c.id}
            >
              <img loading="lazy" src={c.img} alt="" />
              <span className="tileNum">
                {String(i + 1).padStart(2, "0")} /{" "}
                {String(collections.length).padStart(2, "0")}
              </span>
              <div className="catText">
                <small>{c.b}</small>
                <h3>{c.a}</h3>
              </div>
              <span className="tileArrow">
                <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>
      {products.some((p) => p.featured) && (
        <section className="wrap categories">
          <Eyebrow>LA SÉLECTION</Eyebrow>
          <h2>
            {t("المجموعة المختارة", "Notre sélection", "Featured collection")}
          </h2>
          <div className="productGrid">
            {products
              .filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => (
                <Card p={p} key={p.id} />
              ))}
          </div>
        </section>
      )}
      <section className="storyBand">
        <Flower2 size={28} />
        <Eyebrow>LA MAISON AIT ALLA</Eyebrow>
        <h2>
          {t(
            "أصالة مغربية، عناية يومية",
            "Des racines marocaines, des soins quotidiens",
            "Moroccan roots, everyday care",
          )}
        </h2>
        <Link className="textLink" to="/about">
          {t("قصتنا", "Notre histoire", "Our story")} <Arrow />
        </Link>
      </section>
    </>
  );
}
