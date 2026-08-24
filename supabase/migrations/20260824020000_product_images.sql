-- ============================================================================
-- Somewhere to put product photographs
--
-- The catalogue can be edited from the admin now, but a new product still had
-- nowhere to keep a picture: the existing images are SVG files committed to
-- /public, which means adding one is a code change and a deploy.
-- ============================================================================

-- Public bucket. The images are on a shop window — there is nothing to protect
-- in them, and making them public means next/image can fetch them without a
-- signed URL on every render.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Anyone may look at a product photo.
drop policy if exists product_images_public_read on storage.objects;
create policy product_images_public_read on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Nobody may write one through the Data API. Uploads go through the service
-- role from a Server Action that has already checked the caller is staff, so
-- there is deliberately no insert or update policy here for anon or
-- authenticated — otherwise a signed-in customer could fill the bucket.
drop policy if exists product_images_no_public_write on storage.objects;
