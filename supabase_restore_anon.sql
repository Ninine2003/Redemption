-- Restauration complete des droits anon - House of Redemption
-- Copie dans Supabase SQL Editor et clique Run

-- 1. Restaurer les grants complets
grant usage on schema public to anon;
grant select, insert, update, delete on public.orders to anon;
grant select, insert, update, delete on public.contact_messages to anon;
grant select, insert, update, delete on public.newsletter_subscribers to anon;
grant select, insert, update, delete on public.products to anon;
grant select, insert, update, delete on public.collections to anon;
grant select, insert, update, delete on public.site_videos to anon;
grant select, insert, update, delete on public.incoming_products to anon;
grant select, insert, update, delete on storage.objects to anon;
grant select on storage.buckets to anon;

-- 2. Restaurer les policies dashboard supprimees
drop policy if exists "Dashboard can read orders" on public.orders;
create policy "Dashboard can read orders"
on public.orders for select to anon using (true);

drop policy if exists "Dashboard can update order status" on public.orders;
create policy "Dashboard can update order status"
on public.orders for update to anon
using (true)
with check (status in ('cancelled', 'shipping', 'delivered'));

drop policy if exists "Dashboard can read contact messages" on public.contact_messages;
create policy "Dashboard can read contact messages"
on public.contact_messages for select to anon using (true);

drop policy if exists "Dashboard can delete contact messages" on public.contact_messages;
create policy "Dashboard can delete contact messages"
on public.contact_messages for delete to anon using (true);

drop policy if exists "Dashboard can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can read newsletter subscribers"
on public.newsletter_subscribers for select to anon using (true);

drop policy if exists "Dashboard can delete newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can delete newsletter subscribers"
on public.newsletter_subscribers for delete to anon using (true);

drop policy if exists "Dashboard can create products" on public.products;
create policy "Dashboard can create products"
on public.products for insert to anon with check (true);

drop policy if exists "Dashboard can update products" on public.products;
create policy "Dashboard can update products"
on public.products for update to anon using (true) with check (true);

drop policy if exists "Dashboard can delete products" on public.products;
create policy "Dashboard can delete products"
on public.products for delete to anon using (true);

drop policy if exists "Dashboard can create incoming products" on public.incoming_products;
create policy "Dashboard can create incoming products"
on public.incoming_products for insert to anon with check (true);

drop policy if exists "Dashboard can update incoming products" on public.incoming_products;
create policy "Dashboard can update incoming products"
on public.incoming_products for update to anon using (true) with check (true);

drop policy if exists "Dashboard can delete incoming products" on public.incoming_products;
create policy "Dashboard can delete incoming products"
on public.incoming_products for delete to anon using (true);

drop policy if exists "Dashboard can create collections" on public.collections;
create policy "Dashboard can create collections"
on public.collections for insert to anon with check (true);

drop policy if exists "Dashboard can update collections" on public.collections;
create policy "Dashboard can update collections"
on public.collections for update to anon using (true) with check (true);

drop policy if exists "Dashboard can delete collections" on public.collections;
create policy "Dashboard can delete collections"
on public.collections for delete to anon using (true);

drop policy if exists "Dashboard can create videos" on public.site_videos;
create policy "Dashboard can create videos"
on public.site_videos for insert to anon
with check (status = 'active');

drop policy if exists "Dashboard can update videos" on public.site_videos;
create policy "Dashboard can update videos"
on public.site_videos for update to anon
using (true) with check (status in ('active', 'inactive'));

drop policy if exists "Dashboard can delete videos" on public.site_videos;
create policy "Dashboard can delete videos"
on public.site_videos for delete to anon using (true);

drop policy if exists "Dashboard can upload site image files" on storage.objects;
create policy "Dashboard can upload site image files"
on storage.objects for insert to anon
with check (bucket_id = 'site-images');

drop policy if exists "Dashboard can update site image files" on storage.objects;
create policy "Dashboard can update site image files"
on storage.objects for update to anon
using (bucket_id = 'site-images')
with check (bucket_id = 'site-images');

drop policy if exists "Dashboard can delete site image files" on storage.objects;
create policy "Dashboard can delete site image files"
on storage.objects for delete to anon
using (bucket_id = 'site-images');

drop policy if exists "Dashboard can upload site video files" on storage.objects;
create policy "Dashboard can upload site video files"
on storage.objects for insert to anon
with check (bucket_id = 'site-videos');

drop policy if exists "Dashboard can update site video files" on storage.objects;
create policy "Dashboard can update site video files"
on storage.objects for update to anon
using (bucket_id = 'site-videos')
with check (bucket_id = 'site-videos');

drop policy if exists "Dashboard can delete site video files" on storage.objects;
create policy "Dashboard can delete site video files"
on storage.objects for delete to anon
using (bucket_id = 'site-videos');
