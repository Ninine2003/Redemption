-- Redemption Supabase schema
-- Copie tout ce fichier dans Supabase > SQL Editor, puis clique sur Run.

create extension if not exists pgcrypto;

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    first_name text not null,
    last_name text not null,
    email text not null,
    phone text not null,
    address text not null,
    latitude double precision,
    longitude double precision,
    location_accuracy double precision,
    location_captured_at timestamptz,
    payment_method text not null,
    payment_status text not null default 'pending',
    wave_reference text not null default '',
    wave_payment_url text not null default '',
    items jsonb not null default '[]'::jsonb,
    total integer not null default 0,
    status text not null default 'shipping' check (status in ('cancelled', 'shipping', 'delivered')),
    created_at timestamptz not null default now()
);

create table if not exists public.wave_payments (
    id uuid primary key default gen_random_uuid(),
    reference text not null unique,
    customer_first_name text not null default '',
    customer_last_name text not null default '',
    customer_email text not null default '',
    customer_phone text not null default '',
    customer_address text not null default '',
    amount integer not null default 0,
    currency text not null default 'XOF',
    status text not null default 'pending',
    payment_url text not null default '',
    items jsonb not null default '[]'::jsonb,
    customer_confirmed_at timestamptz,
    validated_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.abandoned_checkouts (
    id text primary key,
    first_name text not null default '',
    last_name text not null default '',
    email text not null default '',
    phone text not null default '',
    address text not null default '',
    items jsonb not null default '[]'::jsonb,
    total integer not null default 0,
    status text not null default 'open',
    source text not null default 'checkout',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    first_name text not null,
    last_name text not null,
    email text not null,
    whatsapp text not null default '',
    subject text not null,
    message text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    first_name text not null,
    email text not null unique,
    whatsapp text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null check (category in ('tshirt', 'hoodie', 'longsleeve', 'cap')),
    category_label text not null,
    collection_id uuid,
    collection_name text not null default '',
    subcollection_name text not null default '',
    color text not null default '',
    description text not null,
    image_url text not null,
    video_url text not null default '',
    sizes jsonb not null default '[]'::jsonb,
    price integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    category text not null check (category in ('tshirt', 'hoodie', 'longsleeve', 'cap')),
    name text not null,
    short_name text not null default '',
    subcollections jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

drop table if exists public.videos cascade;

create table if not exists public.site_videos (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    category text not null default 'House of Redemption',
    description text not null default '',
    url text not null,
    status text not null default 'active' check (status in ('active', 'inactive')),
    created_at timestamptz not null default now()
);

create table if not exists public.incoming_products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null check (category in ('tshirt', 'hoodie', 'longsleeve', 'cap')),
    category_label text not null,
    description text not null default '',
    image_url text not null,
    color text not null default '',
    sizes jsonb not null default '[]'::jsonb,
    price integer not null default 0,
    release_date date,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'site-videos',
    'site-videos',
    true,
    104857600,
    array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
on conflict (id) do update
set
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'site-images',
    'site-images',
    true,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

create index if not exists orders_created_at_idx
    on public.orders (created_at desc);

create index if not exists contact_messages_created_at_idx
    on public.contact_messages (created_at desc);

create index if not exists newsletter_subscribers_created_at_idx
    on public.newsletter_subscribers (created_at desc);

create index if not exists products_created_at_idx
    on public.products (created_at desc);

create index if not exists products_active_idx
    on public.products (is_active);

create index if not exists incoming_products_created_at_idx
    on public.incoming_products (created_at desc);

create index if not exists incoming_products_active_idx
    on public.incoming_products (is_active);

create index if not exists collections_category_idx
    on public.collections (category);

create index if not exists collections_active_idx
    on public.collections (is_active);

create index if not exists site_videos_created_at_idx
    on public.site_videos (created_at desc);

create index if not exists site_videos_status_idx
    on public.site_videos (status);

create index if not exists wave_payments_created_at_idx
    on public.wave_payments (created_at desc);

create index if not exists wave_payments_reference_idx
    on public.wave_payments (reference);

create index if not exists wave_payments_status_idx
    on public.wave_payments (status);

create index if not exists abandoned_checkouts_updated_at_idx
    on public.abandoned_checkouts (updated_at desc);

create index if not exists abandoned_checkouts_status_idx
    on public.abandoned_checkouts (status);

alter table public.contact_messages
    add column if not exists whatsapp text not null default '';

alter table public.newsletter_subscribers
    add column if not exists whatsapp text not null default '';

alter table public.orders
    add column if not exists status text not null default 'shipping';

alter table public.orders
    add column if not exists payment_status text not null default 'pending';

alter table public.orders
    add column if not exists wave_reference text not null default '';

alter table public.orders
    add column if not exists wave_payment_url text not null default '';

alter table public.orders
    add column if not exists latitude double precision;

alter table public.orders
    add column if not exists longitude double precision;

alter table public.orders
    add column if not exists location_accuracy double precision;

alter table public.orders
    add column if not exists location_captured_at timestamptz;

alter table public.products
    add column if not exists color text not null default '';

alter table public.products
    add column if not exists collection_id uuid;

alter table public.products
    add column if not exists collection_name text not null default '';

alter table public.products
    add column if not exists subcollection_name text not null default '';

alter table public.products
    add column if not exists video_url text not null default '';

alter table public.products
    add column if not exists image_urls jsonb not null default '[]'::jsonb;

alter table public.products
    add column if not exists sizes jsonb not null default '[]'::jsonb;

alter table public.incoming_products
    add column if not exists color text not null default '';

alter table public.incoming_products
    add column if not exists sizes jsonb not null default '[]'::jsonb;

alter table public.collections
    add column if not exists short_name text not null default '';

alter table public.collections
    add column if not exists subcollections jsonb not null default '[]'::jsonb;

alter table public.collections
    add column if not exists is_active boolean not null default true;

do $$
begin
    alter table public.products drop constraint if exists products_category_check;
    alter table public.products
        add constraint products_category_check
        check (category in ('tshirt', 'hoodie', 'longsleeve', 'cap'));

    alter table public.collections drop constraint if exists collections_category_check;
    alter table public.collections
        add constraint collections_category_check
        check (category in ('tshirt', 'hoodie', 'longsleeve', 'cap'));
end $$;

alter table public.site_videos
    add column if not exists category text not null default 'House of Redemption';

alter table public.site_videos
    add column if not exists status text not null default 'active';

alter table public.site_videos
    add column if not exists url text not null default '';

do $$
begin
    alter table public.site_videos drop constraint if exists site_videos_status_check;
    alter table public.site_videos
        add constraint site_videos_status_check
        check (status in ('active', 'inactive'));
end $$;

alter table public.orders enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.products enable row level security;
alter table public.collections enable row level security;
alter table public.site_videos enable row level security;
alter table public.incoming_products enable row level security;
alter table public.wave_payments enable row level security;
alter table public.abandoned_checkouts enable row level security;

grant usage on schema public to anon;
grant select, insert, update, delete on public.orders to anon;
grant select, insert, update, delete on public.contact_messages to anon;
grant select, insert, update, delete on public.newsletter_subscribers to anon;
grant select, insert, update, delete on public.products to anon;
grant select, insert, update, delete on public.collections to anon;
grant select, insert, update, delete on public.site_videos to anon;
grant select, insert, update, delete on public.incoming_products to anon;
grant select, insert, update, delete on public.wave_payments to anon;
grant select, insert, update, delete on public.abandoned_checkouts to anon;
grant select, insert, update, delete on storage.objects to anon;
grant select on storage.buckets to anon;

drop policy if exists "Public can create orders" on public.orders;
create policy "Public can create orders"
on public.orders
for insert
to anon
with check (true);

drop policy if exists "Dashboard can update order status" on public.orders;
create policy "Dashboard can update order status"
on public.orders
for update
to anon
using (true)
with check (status in ('cancelled', 'shipping', 'delivered'));

drop policy if exists "Public can create contact messages" on public.contact_messages;
create policy "Public can create contact messages"
on public.contact_messages
for insert
to anon
with check (true);

drop policy if exists "Public can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Public can subscribe to newsletter"
on public.newsletter_subscribers
for insert
to anon
with check (true);

drop policy if exists "Dashboard can create products" on public.products;
create policy "Dashboard can create products"
on public.products
for insert
to anon
with check (true);

drop policy if exists "Dashboard can update products" on public.products;
create policy "Dashboard can update products"
on public.products
for update
to anon
using (true)
with check (true);

drop policy if exists "Dashboard can delete products" on public.products;
create policy "Dashboard can delete products"
on public.products
for delete
to anon
using (true);

drop policy if exists "Dashboard can create incoming products" on public.incoming_products;
create policy "Dashboard can create incoming products"
on public.incoming_products
for insert
to anon
with check (true);

drop policy if exists "Dashboard can update incoming products" on public.incoming_products;
create policy "Dashboard can update incoming products"
on public.incoming_products
for update
to anon
using (true)
with check (true);

drop policy if exists "Dashboard can delete incoming products" on public.incoming_products;
create policy "Dashboard can delete incoming products"
on public.incoming_products
for delete
to anon
using (true);

drop policy if exists "Dashboard can create collections" on public.collections;
create policy "Dashboard can create collections"
on public.collections
for insert
to anon
with check (true);

drop policy if exists "Dashboard can update collections" on public.collections;
create policy "Dashboard can update collections"
on public.collections
for update
to anon
using (true)
with check (true);

drop policy if exists "Dashboard can delete collections" on public.collections;
create policy "Dashboard can delete collections"
on public.collections
for delete
to anon
using (true);

drop policy if exists "Dashboard can create videos" on public.site_videos;
create policy "Dashboard can create videos"
on public.site_videos
for insert
to anon
with check (status = 'active');

drop policy if exists "Dashboard can update videos" on public.site_videos;
create policy "Dashboard can update videos"
on public.site_videos
for update
to anon
using (true)
with check (status in ('active', 'inactive'));

drop policy if exists "Dashboard can delete videos" on public.site_videos;
create policy "Dashboard can delete videos"
on public.site_videos
for delete
to anon
using (true);

drop policy if exists "Public can create Wave payments" on public.wave_payments;
create policy "Public can create Wave payments"
on public.wave_payments
for insert
to anon
with check (true);

drop policy if exists "Dashboard can read Wave payments" on public.wave_payments;
create policy "Dashboard can read Wave payments"
on public.wave_payments
for select
to anon
using (true);

drop policy if exists "Dashboard can update Wave payments" on public.wave_payments;
create policy "Dashboard can update Wave payments"
on public.wave_payments
for update
to anon
using (true)
with check (status in ('pending', 'pending_review', 'succeeded', 'failed'));

drop policy if exists "Public can create abandoned checkouts" on public.abandoned_checkouts;
create policy "Public can create abandoned checkouts"
on public.abandoned_checkouts
for insert
to anon
with check (true);

drop policy if exists "Public can update abandoned checkouts" on public.abandoned_checkouts;
create policy "Public can update abandoned checkouts"
on public.abandoned_checkouts
for update
to anon
using (true)
with check (true);

drop policy if exists "Dashboard can read abandoned checkouts" on public.abandoned_checkouts;
create policy "Dashboard can read abandoned checkouts"
on public.abandoned_checkouts
for select
to anon
using (true);

drop policy if exists "Dashboard can delete abandoned checkouts" on public.abandoned_checkouts;
create policy "Dashboard can delete abandoned checkouts"
on public.abandoned_checkouts
for delete
to anon
using (true);

drop policy if exists "Public can read site video files" on storage.objects;
create policy "Public can read site video files"
on storage.objects
for select
to anon
using (bucket_id = 'site-videos');

drop policy if exists "Dashboard can upload site video files" on storage.objects;
create policy "Dashboard can upload site video files"
on storage.objects
for insert
to anon
with check (bucket_id = 'site-videos');

drop policy if exists "Dashboard can update site video files" on storage.objects;
create policy "Dashboard can update site video files"
on storage.objects
for update
to anon
using (bucket_id = 'site-videos')
with check (bucket_id = 'site-videos');

drop policy if exists "Dashboard can delete site video files" on storage.objects;
create policy "Dashboard can delete site video files"
on storage.objects
for delete
to anon
using (bucket_id = 'site-videos');

drop policy if exists "Public can read site image files" on storage.objects;
create policy "Public can read site image files"
on storage.objects
for select
to anon
using (bucket_id = 'site-images');

drop policy if exists "Dashboard can upload site image files" on storage.objects;
create policy "Dashboard can upload site image files"
on storage.objects
for insert
to anon
with check (bucket_id = 'site-images');

drop policy if exists "Dashboard can update site image files" on storage.objects;
create policy "Dashboard can update site image files"
on storage.objects
for update
to anon
using (bucket_id = 'site-images')
with check (bucket_id = 'site-images');

drop policy if exists "Dashboard can delete site image files" on storage.objects;
create policy "Dashboard can delete site image files"
on storage.objects
for delete
to anon
using (bucket_id = 'site-images');

drop policy if exists "Dashboard can delete contact messages" on public.contact_messages;
create policy "Dashboard can delete contact messages"
on public.contact_messages
for delete
to anon
using (true);

drop policy if exists "Dashboard can delete newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can delete newsletter subscribers"
on public.newsletter_subscribers
for delete
to anon
using (true);

-- Le dashboard actuel utilise la cle anon cote navigateur.
-- Ces policies permettent l'affichage dans dashboard.html.
-- Pour un site en production, il faudra remplacer ce dashboard par une vraie authentification serveur.
drop policy if exists "Dashboard can read orders" on public.orders;
create policy "Dashboard can read orders"
on public.orders
for select
to anon
using (true);

drop policy if exists "Dashboard can read contact messages" on public.contact_messages;
create policy "Dashboard can read contact messages"
on public.contact_messages
for select
to anon
using (true);

drop policy if exists "Dashboard can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can read newsletter subscribers"
on public.newsletter_subscribers
for select
to anon
using (true);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon
using (is_active = true);

drop policy if exists "Public can read active incoming products" on public.incoming_products;
create policy "Public can read active incoming products"
on public.incoming_products
for select
to anon
using (is_active = true);

drop policy if exists "Public can read active collections" on public.collections;
create policy "Public can read active collections"
on public.collections
for select
to anon
using (is_active = true);

drop policy if exists "Public can read active videos" on public.site_videos;
create policy "Public can read active videos"
on public.site_videos
for select
to anon
using (status = 'active');

-- Production hardening -------------------------------------------------------
-- A executer apres les blocs ci-dessus si le site public passe par Netlify
-- Functions avec SUPABASE_SERVICE_ROLE_KEY cote serveur.

revoke all on public.orders from anon;
revoke all on public.contact_messages from anon;
revoke all on public.newsletter_subscribers from anon;
revoke all on public.products from anon;
revoke all on public.collections from anon;
revoke all on public.site_videos from anon;
revoke all on public.incoming_products from anon;
revoke insert, update, delete on storage.objects from anon;

grant insert on public.orders to anon;
grant insert on public.contact_messages to anon;
grant insert on public.newsletter_subscribers to anon;
grant select on public.products to anon;
grant select on public.collections to anon;
grant select on public.site_videos to anon;
grant select on public.incoming_products to anon;
grant select on storage.objects to anon;
grant select on storage.buckets to anon;

drop policy if exists "Dashboard can read orders" on public.orders;
drop policy if exists "Dashboard can read contact messages" on public.contact_messages;
drop policy if exists "Dashboard can read newsletter subscribers" on public.newsletter_subscribers;
drop policy if exists "Dashboard can update order status" on public.orders;
drop policy if exists "Dashboard can delete contact messages" on public.contact_messages;
drop policy if exists "Dashboard can delete newsletter subscribers" on public.newsletter_subscribers;

drop policy if exists "Dashboard can create products" on public.products;
drop policy if exists "Dashboard can update products" on public.products;
drop policy if exists "Dashboard can delete products" on public.products;
drop policy if exists "Dashboard can create incoming products" on public.incoming_products;
drop policy if exists "Dashboard can update incoming products" on public.incoming_products;
drop policy if exists "Dashboard can delete incoming products" on public.incoming_products;
drop policy if exists "Dashboard can create collections" on public.collections;
drop policy if exists "Dashboard can update collections" on public.collections;
drop policy if exists "Dashboard can delete collections" on public.collections;
drop policy if exists "Dashboard can create videos" on public.site_videos;
drop policy if exists "Dashboard can update videos" on public.site_videos;
drop policy if exists "Dashboard can delete videos" on public.site_videos;

drop policy if exists "Dashboard can upload site video files" on storage.objects;
drop policy if exists "Dashboard can update site video files" on storage.objects;
drop policy if exists "Dashboard can delete site video files" on storage.objects;
drop policy if exists "Dashboard can upload site image files" on storage.objects;
drop policy if exists "Dashboard can update site image files" on storage.objects;
drop policy if exists "Dashboard can delete site image files" on storage.objects;

-- ============================================================
-- RESTAURATION COMPLÈTE — House of Redemption
-- Colle dans Supabase SQL Editor et clique Run
-- ============================================================

-- ÉTAPE 1 : Restaurer les grants complets sur toutes les tables
grant usage on schema public to anon;
grant select, insert, update, delete on public.orders to anon;
grant select, insert, update, delete on public.contact_messages to anon;
grant select, insert, update, delete on public.newsletter_subscribers to anon;
grant select, insert, update, delete on public.products to anon;
grant select, insert, update, delete on public.collections to anon;
grant select, insert, update, delete on public.site_videos to anon;
grant select, insert, update, delete on public.incoming_products to anon;
grant select, insert, update, delete on public.abandoned_checkouts to anon;
grant select, insert, update, delete on storage.objects to anon;
grant select on storage.buckets to anon;

-- ÉTAPE 2 : Restaurer les policies storage (upload images et videos)
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

drop policy if exists "Public can read site image files" on storage.objects;
create policy "Public can read site image files"
on storage.objects for select to anon
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

drop policy if exists "Public can read site video files" on storage.objects;
create policy "Public can read site video files"
on storage.objects for select to anon
using (bucket_id = 'site-videos');

-- ÉTAPE 3 : Restaurer les policies dashboard sur les tables
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

drop policy if exists "Dashboard can read orders" on public.orders;
create policy "Dashboard can read orders"
on public.orders for select to anon using (true);

drop policy if exists "Dashboard can update order status" on public.orders;
create policy "Dashboard can update order status"
on public.orders for update to anon
using (true)
with check (status in ('cancelled', 'shipping', 'delivered'));

drop policy if exists "Dashboard can delete contact messages" on public.contact_messages;
create policy "Dashboard can delete contact messages"
on public.contact_messages for delete to anon using (true);

drop policy if exists "Dashboard can read contact messages" on public.contact_messages;
create policy "Dashboard can read contact messages"
on public.contact_messages for select to anon using (true);

drop policy if exists "Dashboard can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can read newsletter subscribers"
on public.newsletter_subscribers for select to anon using (true);

drop policy if exists "Dashboard can delete newsletter subscribers" on public.newsletter_subscribers;
create policy "Dashboard can delete newsletter subscribers"
on public.newsletter_subscribers for delete to anon using (true);

grant select, insert, update, delete on public.abandoned_checkouts to anon;

drop policy if exists "Dashboard can read abandoned checkouts" on public.abandoned_checkouts;
create policy "Dashboard can read abandoned checkouts"
on public.abandoned_checkouts for select to anon using (true);

drop policy if exists "Dashboard can delete abandoned checkouts" on public.abandoned_checkouts;
create policy "Dashboard can delete abandoned checkouts"
on public.abandoned_checkouts for delete to anon using (true);

drop policy if exists "Public can create abandoned checkouts" on public.abandoned_checkouts;
create policy "Public can create abandoned checkouts"
on public.abandoned_checkouts for insert to anon with check (true);

drop policy if exists "Public can update abandoned checkouts" on public.abandoned_checkouts;
create policy "Public can update abandoned checkouts"
on public.abandoned_checkouts for update to anon using (true) with check (true);
      
