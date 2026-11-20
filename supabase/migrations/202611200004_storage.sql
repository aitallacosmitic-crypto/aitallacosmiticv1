INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT
  name,
  name,
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
FROM
  unnest(ARRAY['product-images', 'brand-assets', 'homepage-banners', 'category-images'])
  name;

CREATE POLICY store_asset_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (((bucket_id IN ('product-images', 'category-images')
  AND private.staff ('product_manager'))
  OR (bucket_id IN ('brand-assets', 'homepage-banners')
  AND private.staff ('super_admin')))
  AND lower(storage.extension (name)) IN ('jpg', 'jpeg', 'webp', 'png'));

CREATE POLICY store_asset_remove ON storage.objects
  FOR DELETE TO authenticated
  USING ((bucket_id IN ('product-images', 'category-images')
    AND private.staff ('product_manager'))
    OR (bucket_id IN ('brand-assets', 'homepage-banners')
    AND private.staff ('super_admin')));

CREATE POLICY store_asset_manage_read ON storage.objects
  FOR SELECT TO authenticated
  USING ((bucket_id IN ('product-images', 'category-images')
    AND private.staff ('product_manager'))
    OR (bucket_id IN ('brand-assets', 'homepage-banners')
    AND private.staff ('super_admin')));

