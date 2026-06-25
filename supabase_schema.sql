-- ============================================================================
-- Redemption — Schéma Supabase (version sécurisée)
-- Copie tout ce fichier dans Supabase > SQL Editor, puis clique sur Run.
--
-- Modèle de sécurité :
--   * anon (clé publique, exposée au navigateur) :
--       - LECTURE seule du catalogue public (produits, collections, arrivages,
--         vidéos, articles populaires) — uniquement les lignes actives ;
--       - INSERTION seule des soumissions publiques (commandes, messages,
--         newsletter, paiements Wave, paniers abandonnés, abonnements push).
--       - AUCUN accès en lecture/modification/suppression aux données clients.
--   * service_role (clé secrète, jamais dans le navigateur) :
--       - utilisée uniquement par les Netlify Functions (admin-api, webhook) ;
--       - contourne le RLS → le dashboard lit/écrit via une session admin signée.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────── Tables ────────────────────────────────────

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

create table if not exists public.bestsellers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null default '',
    collection_name text default '',
    color text default '',
    description text not null default '',
    image_url text default '',
    image_urls jsonb not null default '[]'::jsonb,
    price integer not null default 0,
    sizes jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    endpoint text not null unique,
    subscription jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- ─────────────────────────────── Storage ───────────────────────────────────

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

-- ─────────────────────────────── Index ─────────────────────────────────────

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists newsletter_subscribers_created_at_idx on public.newsletter_subscribers (created_at desc);
create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_active_idx on public.products (is_active);
create index if not exists incoming_products_created_at_idx on public.incoming_products (created_at desc);
create index if not exists incoming_products_active_idx on public.incoming_products (is_active);
create index if not exists collections_category_idx on public.collections (category);
create index if not exists collections_active_idx on public.collections (is_active);
create index if not exists site_videos_created_at_idx on public.site_videos (created_at desc);
create index if not exists site_videos_status_idx on public.site_videos (status);
create index if not exists wave_payments_created_at_idx on public.wave_payments (created_at desc);
create index if not exists wave_payments_reference_idx on public.wave_payments (reference);
create index if not exists wave_payments_status_idx on public.wave_payments (status);
create index if not exists abandoned_checkouts_updated_at_idx on public.abandoned_checkouts (updated_at desc);
create index if not exists abandoned_checkouts_status_idx on public.abandoned_checkouts (status);
create index if not exists bestsellers_active_idx on public.bestsellers (is_active);

-- ──────────────────── Migrations idempotentes (bases existantes) ────────────

alter table public.contact_messages add column if not exists whatsapp text not null default '';
alter table public.newsletter_subscribers add column if not exists whatsapp text not null default '';
alter table public.orders add column if not exists status text not null default 'shipping';
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists wave_reference text not null default '';
alter table public.orders add column if not exists wave_payment_url text not null default '';
alter table public.orders add column if not exists latitude double precision;
alter table public.orders add column if not exists longitude double precision;
alter table public.orders add column if not exists location_accuracy double precision;
alter table public.orders add column if not exists location_captured_at timestamptz;
alter table public.products add column if not exists color text not null default '';
alter table public.products add column if not exists collection_id uuid;
alter table public.products add column if not exists collection_name text not null default '';
alter table public.products add column if not exists subcollection_name text not null default '';
alter table public.products add column if not exists video_url text not null default '';
alter table public.products add column if not exists image_urls jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists sizes jsonb not null default '[]'::jsonb;
alter table public.incoming_products add column if not exists color text not null default '';
alter table public.incoming_products add column if not exists sizes jsonb not null default '[]'::jsonb;
alter table public.collections add column if not exists short_name text not null default '';
alter table public.collections add column if not exists subcollections jsonb not null default '[]'::jsonb;
alter table public.collections add column if not exists is_active boolean not null default true;
alter table public.bestsellers add column if not exists image_urls jsonb not null default '[]'::jsonb;

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

    alter table public.site_videos drop constraint if exists site_videos_status_check;
    alter table public.site_videos
        add constraint site_videos_status_check
        check (status in ('active', 'inactive'));
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SÉCURITÉ : RLS + privilèges (section unique, sans contradiction)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Activer RLS sur toutes les tables.
alter table public.orders enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.products enable row level security;
alter table public.collections enable row level security;
alter table public.site_videos enable row level security;
alter table public.incoming_products enable row level security;
alter table public.wave_payments enable row level security;
alter table public.abandoned_checkouts enable row level security;
alter table public.bestsellers enable row level security;
alter table public.push_subscriptions enable row level security;

-- 2. Effacer TOUTES les politiques existantes sur ces tables (nettoyage des
--    anciennes règles permissives et contradictoires).
do $$
declare
    r record;
begin
    for r in
        select schemaname, tablename, policyname
        from pg_policies
        where (schemaname = 'public' and tablename in (
                'orders','wave_payments','abandoned_checkouts','contact_messages',
                'newsletter_subscribers','products','collections','site_videos',
                'incoming_products','bestsellers','push_subscriptions'))
           or (schemaname = 'storage' and tablename = 'objects')
    loop
        execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    end loop;
end $$;

-- 3. Réinitialiser les privilèges anon (on retire tout, puis on accorde le minimum).
revoke all on public.orders from anon;
revoke all on public.wave_payments from anon;
revoke all on public.abandoned_checkouts from anon;
revoke all on public.contact_messages from anon;
revoke all on public.newsletter_subscribers from anon;
revoke all on public.products from anon;
revoke all on public.collections from anon;
revoke all on public.incoming_products from anon;
revoke all on public.site_videos from anon;
revoke all on public.bestsellers from anon;
revoke all on public.push_subscriptions from anon;

grant usage on schema public to anon;

-- Catalogue public : lecture seule.
grant select on public.products to anon;
grant select on public.collections to anon;
grant select on public.incoming_products to anon;
grant select on public.site_videos to anon;
grant select on public.bestsellers to anon;

-- Soumissions du site public : insertion seule.
grant insert on public.orders to anon;
grant insert on public.contact_messages to anon;
grant insert on public.newsletter_subscribers to anon;
grant insert on public.wave_payments to anon;
grant insert on public.abandoned_checkouts to anon;
grant insert on public.push_subscriptions to anon;

-- Upsert nécessaire au site public (merge-duplicates via l'API publique).
grant update on public.abandoned_checkouts to anon;
grant update on public.push_subscriptions to anon;

-- 4. Politiques minimales pour anon.
--    Lecture du catalogue (lignes actives uniquement).
create policy "anon read active products"
    on public.products for select to anon using (is_active = true);
create policy "anon read active collections"
    on public.collections for select to anon using (is_active = true);
create policy "anon read active incoming"
    on public.incoming_products for select to anon using (is_active = true);
create policy "anon read active videos"
    on public.site_videos for select to anon using (status = 'active');
create policy "anon read active bestsellers"
    on public.bestsellers for select to anon using (is_active = true);

--    Insertions publiques (formulaires et checkout).
create policy "anon create orders"
    on public.orders for insert to anon with check (true);
create policy "anon create contact messages"
    on public.contact_messages for insert to anon with check (true);
create policy "anon subscribe newsletter"
    on public.newsletter_subscribers for insert to anon with check (true);
create policy "anon create wave payments"
    on public.wave_payments for insert to anon with check (true);
create policy "anon create abandoned checkouts"
    on public.abandoned_checkouts for insert to anon with check (true);
create policy "anon update abandoned checkouts"
    on public.abandoned_checkouts for update to anon using (true) with check (true);
create policy "anon create push subscriptions"
    on public.push_subscriptions for insert to anon with check (true);
create policy "anon update push subscriptions"
    on public.push_subscriptions for update to anon using (true) with check (true);

-- NB : aucune politique SELECT/UPDATE/DELETE n'est accordée à anon sur orders,
-- contact_messages, newsletter_subscribers, wave_payments ni abandoned_checkouts.
-- Le dashboard accède à ces données via les Netlify Functions (service_role),
-- qui contournent le RLS après vérification de la session admin signée.

-- ─────────────────────────────── Storage ───────────────────────────────────
-- Lecture publique des fichiers ; écriture encore ouverte à anon (uploads du
-- dashboard). À durcir ensuite via des URLs signées générées côté serveur.

grant select on storage.buckets to anon;
grant select, insert, update, delete on storage.objects to anon;

create policy "public read site media"
    on storage.objects for select to anon
    using (bucket_id in ('site-videos', 'site-images'));

create policy "dashboard upload site media"
    on storage.objects for insert to anon
    with check (bucket_id in ('site-videos', 'site-images'));

create policy "dashboard update site media"
    on storage.objects for update to anon
    using (bucket_id in ('site-videos', 'site-images'))
    with check (bucket_id in ('site-videos', 'site-images'));

create policy "dashboard delete site media"
    on storage.objects for delete to anon
    using (bucket_id in ('site-videos', 'site-images'));
