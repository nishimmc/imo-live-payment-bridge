create extension if not exists pgcrypto;

create table if not exists profiles(
 id uuid primary key default gen_random_uuid(), name text not null, age int not null check(age>=18),
 rating numeric(2,1) default 5, reviews int default 0, online boolean default false,
 price numeric not null default 0, price_10 numeric not null default 0, price_20 numeric not null default 0,
 price_30 numeric not null default 0, price_45 numeric not null default 0, price_60 numeric not null default 0,
 real_imo_encrypted text not null, photo text not null, gallery text[] default '{}', bio text default '',
 languages text[] default '{}', active boolean default true, created_at timestamptz default now()
);
alter table profiles add column if not exists price_10 numeric not null default 0;
alter table profiles add column if not exists price_20 numeric not null default 0;
alter table profiles add column if not exists price_30 numeric not null default 0;
alter table profiles add column if not exists price_45 numeric not null default 0;
alter table profiles add column if not exists price_60 numeric not null default 0;

create table if not exists bookings(
 id uuid primary key default gen_random_uuid(), code text unique not null, profile_id uuid references profiles(id) on delete restrict,
 profile_name text not null, user_imo text not null, trx_id text not null, duration int not null check(duration in (10,20,30,45,60)), price numeric not null,
 status text not null default 'pending' check(status in ('pending','approved','connected','completed','expired','rejected')),
 access_token_hash text, created_at timestamptz default now()
);
alter table bookings add column if not exists access_token_hash text;
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check check(status in ('pending','approved','connected','completed','expired','rejected'));
alter table bookings drop constraint if exists bookings_duration_check;
alter table bookings add constraint bookings_duration_check check(duration in (10,20,30,45,60));

-- Remove duplicate transaction IDs before creating the unique index on an existing database.
with duplicates as (
  select id, row_number() over(partition by lower(trim(trx_id)) order by created_at asc, id asc) rn
  from bookings
)
update bookings b set status='expired'
where b.id in (select id from duplicates where rn>1);

delete from bookings b
using (
  select id, row_number() over(partition by lower(trim(trx_id)) order by created_at asc, id asc) rn
  from bookings
) d
where b.id=d.id and d.rn>1;
create unique index if not exists bookings_trx_id_unique on bookings(lower(trim(trx_id)));

create table if not exists reviews(
 id uuid primary key default gen_random_uuid(), profile_id uuid references profiles(id) on delete cascade,
 rating int not null check(rating between 1 and 5), review text default '', reviewer_name text default 'Anonymous', created_at timestamptz default now()
);
create table if not exists settings(
 id int primary key default 1, manager_number text not null, manager_name text default 'ImoLive Manager', bkash_number text default '', nagad_number text default '',
 top_banner_enabled boolean default true, top_banner_text text default '', top_banner_image text default '', top_banner_link text default '', top_banner_animation text default 'marquee',
 bottom_banner_enabled boolean default true, bottom_banner_text text default '', bottom_banner_image text default '', bottom_banner_link text default '', bottom_banner_animation text default 'pulse'
);
alter table settings add column if not exists top_banner_enabled boolean default true;
alter table settings add column if not exists top_banner_text text default '';
alter table settings add column if not exists top_banner_image text default '';
alter table settings add column if not exists top_banner_link text default '';
alter table settings add column if not exists top_banner_animation text default 'marquee';
alter table settings add column if not exists bottom_banner_enabled boolean default true;
alter table settings add column if not exists bottom_banner_text text default '';
alter table settings add column if not exists bottom_banner_image text default '';
alter table settings add column if not exists bottom_banner_link text default '';
alter table settings add column if not exists bottom_banner_animation text default 'pulse';
insert into settings(id,manager_number,manager_name,bkash_number,nagad_number,top_banner_text,bottom_banner_text)
values(1,'+8801712345678','ImoLive Manager','017XX-XXXXXX','01XX-XXXXXX','✨ Verified Models • Fast Booking • Secure Agency Service','📲 Payment করে TrxID দিন — Admin approval-এর পর Manager Number পাবেন')
on conflict(id) do nothing;

alter table profiles enable row level security;
alter table bookings enable row level security;
alter table reviews enable row level security;
alter table settings enable row level security;
drop policy if exists "public profiles" on profiles;
drop policy if exists "public reviews" on reviews;
drop policy if exists "public settings" on settings;
create policy "public reviews" on reviews for select using (true);
create policy "public settings" on settings for select using (true);

-- SMS-based payment verification (customer enters provider + source number only)
alter table bookings add column if not exists provider text;
alter table bookings add column if not exists payment_source text;
alter table bookings add column if not exists payment_event_id uuid;
create table if not exists payment_events(
 id uuid primary key default gen_random_uuid(),
 provider text not null check(provider in ('bkash','nagad')),
 payment_source text not null,
 amount numeric not null check(amount>0),
 received_at timestamptz not null,
 sms_hash text not null unique,
 sms_text text not null,
 sms_sender text default '',
 used boolean default false,
 booking_id uuid references bookings(id) on delete set null,
 created_at timestamptz default now()
);
alter table payment_events add column if not exists sms_sender text default '';
create index if not exists payment_events_match_idx on payment_events(provider,payment_source,amount,received_at,used);


-- Payment bridge device monitoring
create table if not exists payment_devices(
 id uuid primary key default gen_random_uuid(),
 device_key text not null unique,
 app_version text default '',
 device_model text default '',
 last_seen_at timestamptz not null default now(),
 last_sms_at timestamptz,
 last_upload_at timestamptz,
 last_result text default '',
 created_at timestamptz default now()
);
create index if not exists payment_devices_last_seen_idx on payment_devices(last_seen_at desc);
