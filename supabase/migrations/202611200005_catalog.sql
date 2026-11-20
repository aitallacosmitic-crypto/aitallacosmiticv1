INSERT INTO public.site_settings (legacy_hero)
  VALUES ('https://uploads.onecompiler.io/44bfz32hg/44bg9a8jp/1000256754.jpg');

INSERT INTO public.categories (slug, name_ar, name_fr, name_en)
  VALUES ('skin', 'العناية بالبشرة', 'Soins du visage', 'Skin care');

INSERT INTO public.categories (slug, name_ar, name_fr, name_en)
  VALUES ('body', 'العناية بالجسم', 'Soins du corps', 'Body care');

INSERT INTO public.categories (slug, name_ar, name_fr, name_en)
  VALUES ('wellness', 'المكملات الغذائية', 'Compléments alimentaires', 'Supplements');

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('new-product-1', 'كريم ألم المفاصل', 'Huile pour les douleurs articulaires', 'تركيبة طبيعية للمساج اليومي تساعد على الراحة بعد المجهود وتمنح إحساساً بالدفء.', 'Formule naturelle pour massage quotidien, idéale après l’effort.', 'Joint massage cream', 'Daily massage care for comfort after exertion.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'body'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bhyhwgw/%D8%A7%D9%84%D9%85%20%D9%85%D9%81%D8%A7%D8%B5%D9%84%20%D8%AA%D9%8A%D8%A8.jpg'
FROM
  public.products
WHERE
  sku = 'new-product-1';

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('joints', 'مكمل آلام المفاصل', 'Supplément pour les douleurs articulaires', 'مكمل غذائي لدعم المرونة والراحة اليومية ضمن روتين متوازن.', 'Complément alimentaire pour soutenir le confort et la mobilité au quotidien.', 'Joint comfort supplement', 'Daily support for comfort and mobility in a balanced routine.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'wellness'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bga6wyr/%D8%A7%D9%84%D9%85%20%D9%85%D9%81%D8%A7%D8%B5%D9%84.png'
FROM
  public.products
WHERE
  sku = 'joints';

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('stomach', 'مكمل لجرثومة المعدة', 'Supplément pour Helicobacter pylori', 'دعم يومي لراحة المعدة والهضم ضمن نمط حياة صحي.', 'Soutien du confort digestif au quotidien dans une routine équilibrée.', 'Stomach care supplement', 'Daily digestive comfort as part of a healthy routine.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'wellness'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bga6wyr/%D8%AC%D8%B1%D8%AB%D9%85%D8%A9%20%D9%85%D8%B9%D8%AF%D8%A9.png'
FROM
  public.products
WHERE
  sku = 'stomach';

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('night', 'كريم البهاق', 'Crème pour vitiligo', 'كريم للعناية اليومية بالبشرة: ترطيب ونعومة وراحة للاستخدام المنتظم.', 'Crème de soin quotidien: hydratation, douceur et confort.', 'Vitiligo care cream', 'Daily skin care for hydration, softness and comfort.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'skin'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bga6wyr/%D9%83%D8%B1%D9%8A%D9%85%20%D8%A8%D9%87%D8%A7%D9%82.png'
FROM
  public.products
WHERE
  sku = 'night';

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('face', 'كريم تفتيح الوجه', 'Crème blanchissante pour le visage', 'يساعد على توحيد مظهر البشرة وإشراقتها مع ترطيب لطيف.', 'Aide à unifier l’apparence du teint et à hydrater délicatement.', 'Brightening face cream', 'Gentle hydration for a more even-looking complexion.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'skin'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bga6wyr/%D9%83%D8%B1%D9%8A%D9%85%20%D8%AA%D9%81%D8%AA%D8%AD%20%D8%A7%D9%84%D9%88%D8%AC%D9%87.png'
FROM
  public.products
WHERE
  sku = 'face';

INSERT INTO public.products (sku, name_ar, name_fr, desc_ar, desc_fr, name_en, desc_en, category_id, price, active, published, featured)
  VALUES ('slow', 'زيت تباطؤ نمو الشعر', 'Huile Anti-Repousse', 'زيت للعناية بالبشرة بعد الإزالة: نعومة وترطيب وإحساس مريح.', 'Huile de soin après épilation: douceur, hydratation et confort.', 'After-hair-removal oil', 'Softening and moisturizing skin care after hair removal.', (
      SELECT
        id
      FROM
        public.categories
      WHERE
        slug = 'body'), 199, TRUE, TRUE, TRUE);

INSERT INTO public.product_images (product_id, url)
SELECT
  id,
  'https://uploads.onecompiler.io/44bfz32hg/44bga6wyr/%D8%AA%D8%A8%D8%A7%D8%B7%D8%A1.png'
FROM
  public.products
WHERE
  sku = 'slow';

