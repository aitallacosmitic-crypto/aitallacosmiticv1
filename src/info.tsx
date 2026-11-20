import { Link, useLocation } from "react-router-dom";
import { Page, Arrow } from "./ui";
import { useStore } from "./store";
import { WhatsIcon } from "./layout";
export default function Info() {
  const { t, money, settings } = useStore(),
    path = useLocation().pathname.slice(1);
  const contact = (
    <div className="actions">
      <a className="btn" href={"https://wa.me/" + settings.whatsapp}>
        <WhatsIcon /> WhatsApp
      </a>
      <a className="textLink" dir="ltr" href={"tel:" + settings.phone}>
        {settings.phone}
      </a>
    </div>
  );
  const shipping = settings.shipping_fee
    ? `${t("رسوم التوصيل", "Frais de livraison", "Delivery fee")}: ${money(settings.shipping_fee)}.`
    : t(
        "التوصيل مجاني داخل المغرب.",
        "La livraison est offerte au Maroc.",
        "Delivery within Morocco is free.",
      );
  const faq = [
    [
      t("كيف أطلب منتجاً؟", "Comment commander ?", "How can I order?"),
      t(
        "اختاري المنتج والكمية وأضيفيه إلى السلة، ثم سجّلي الدخول لتأكيد عنوانك والطلب. يمكنك أيضاً التواصل معنا عبر واتساب.",
        "Ajoutez vos articles au panier, connectez-vous puis confirmez votre adresse et votre commande. Vous pouvez aussi nous contacter sur WhatsApp.",
        "Add products to your bag, sign in and confirm your delivery address and order. You can also contact us via WhatsApp.",
      ),
    ],
    [
      t(
        "ما هي رسوم التوصيل؟",
        "Quels sont les frais de livraison ?",
        "What does delivery cost?",
      ),
      shipping,
    ],
    [
      t(
        "كيف أتابع طلبي؟",
        "Comment suivre ma commande ?",
        "How can I track my order?",
      ),
      t(
        "تظهر الحالة ورقم التتبع عند توفره في صفحة طلباتي.",
        "Le statut et le numéro de suivi disponible figurent dans Mes commandes.",
        "Find status updates and tracking information, when available, under My orders.",
      ),
    ],
  ];
  if (path === "about")
    return (
      <Page
        title={t("قصتنا", "Notre histoire", "Our story")}
        kicker="LA MAISON AIT ALLA"
      >
        <div className="detailGrid">
          <img className="storyImg" src="/art/ritual.webp" alt="" />
          <div>
            <h2>{settings.brand}</h2>
            <p>
              {t(
                "تجمع أيت علا كوسميتيك بين أصالة الطبيعة المغربية ولمسة عصرية راقية. نختار مجموعتنا بعناية لترافق طقوس الجمال اليومية، من العناية بالبشرة إلى العناية بالجسم.",
                "Ait Alla Cosmetic associe la nature marocaine à une approche contemporaine du soin. Notre sélection accompagne les rituels quotidiens du visage et du corps.",
                "Ait Alla Cosmetic brings Moroccan nature to contemporary daily care. Our collection accompanies your everyday skin and body rituals.",
              )}
            </p>
            <Link className="btn" to="/catalog">
              {t(
                "اكتشفي المجموعة",
                "Découvrir la collection",
                "Discover the collection",
              )}{" "}
              <Arrow />
            </Link>
          </div>
        </div>
      </Page>
    );
  if (path === "contact")
    return (
      <Page title={t("تواصلي معنا", "Contactez-nous", "Contact us")}>
        <div className="panel narrow">
          <p>
            {t(
              "للاستفسار عن منتج أو طلب، تواصلي معنا مباشرة.",
              "Une question sur un soin ou une commande ? Contactez-nous directement.",
              "Questions about a product or order? Contact us directly.",
            )}
          </p>
          {contact}
        </div>
      </Page>
    );
  if (path === "faq")
    return (
      <Page
        title={t(
          "الأسئلة الشائعة",
          "Questions fréquentes",
          "Frequently asked questions",
        )}
      >
        {faq.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </Page>
    );
  const policies: Record<string, [string, string]> = {
    privacy: [
      t("سياسة الخصوصية", "Confidentialité", "Privacy policy"),
      t(
        "نستخدم البريد الإلكتروني لتسجيل الدخول، والاسم ورقم الهاتف وعنوان التوصيل لمعالجة الطلبات. تُحفظ بيانات الحساب والطلب في Supabase. تُحفظ السلة وتفضيلات اللغة في متصفحك. لا يتم إرسال ملخص طلبك إلى واتساب إلا عند فتح الرابط. لطلب تصحيح بياناتك أو حذفها، تواصلي معنا.",
        "Votre e-mail sert à la connexion. Votre nom, votre téléphone et votre adresse permettent de traiter les commandes. Les données sont hébergées sur Supabase. Le panier et la langue sont conservés dans votre navigateur. WhatsApp reçoit le récapitulatif uniquement si vous ouvrez le lien. Contactez-nous pour demander la correction ou la suppression de vos données.",
        "We use your email for sign-in and your name, phone and address to fulfil orders. Supabase hosts account and order data. Your browser stores your cart and language preference. WhatsApp receives an order summary only if you follow its link. Contact us to request correction or deletion of personal data.",
      ),
    ],
    terms: [
      t("شروط الاستخدام", "Conditions de commande", "Order terms"),
      t(
        "تُعرض الأسعار بالدرهم المغربي. تحققي من الكمية والعنوان والسعر النهائي قبل التأكيد. يُحتسب التخفيض المؤهل ورسوم التوصيل عند مراجعة الطلب. إرسال الطلب لا يعني أنه شُحن؛ يمكنك متابعة حالته من حسابك.",
        "Les prix sont en dirhams marocains. Vérifiez les quantités, l’adresse et le total avant de confirmer. Les remises et la livraison sont calculées lors de la vérification. Une commande transmise n’est pas nécessairement expédiée ; consultez son statut dans votre compte.",
        "Prices are in Moroccan dirhams. Review quantities, delivery details and the verified total before confirming. Eligible discounts and shipping are calculated at review. Submission does not indicate dispatch; check order status in your account.",
      ),
    ],
    shipping: [
      t("التوصيل والإرجاع", "Livraison et retours", "Shipping and returns"),
      shipping +
        " " +
        (settings.free_threshold !== null
          ? t(
              "التوصيل مجاني ابتداءً من",
              "Livraison offerte à partir de",
              "Free delivery from",
            ) +
            " " +
            money(settings.free_threshold) +
            ". "
          : "") +
        t(
          "لمعرفة موعد التسليم أو طلب إرجاع منتج، اتصلي بنا مع ذكر مرجع الطلب قبل إرساله.",
          "Pour connaître le délai ou demander un retour, contactez-nous avec votre référence avant de renvoyer un article.",
          "For delivery estimates or to request a return, contact us with your order reference before sending an item back.",
        ),
    ],
  };
  if (policies[path])
    return (
      <Page title={policies[path][0]}>
        <div className="panel prose">
          <p>{policies[path][1]}</p>
          {contact}
        </div>
      </Page>
    );
  return (
    <Page title="404">
      <h2>{t("الصفحة غير موجودة", "Page introuvable", "Page not found")}</h2>
      <Link to="/" className="btn">
        {t("العودة للرئيسية", "Retour à l’accueil", "Back to home")} <Arrow />
      </Link>
    </Page>
  );
}
