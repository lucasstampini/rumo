-- RUMO — schema inicial (SPEC §7)
-- Idempotência: esta migration roda uma vez (supabase db reset / db push ou colada no SQL Editor).

create extension if not exists btree_gist;

-- ───────────────────────── Tabelas ─────────────────────────

create table bubbles (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- 'Butantã'
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m int not null
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  cnh_url text,
  verified boolean not null default false,  -- MVP: vira true ao enviar CNH
  bubble_id uuid references bubbles,
  created_at timestamptz not null default now()
);

create type transmission as enum ('manual', 'automatic');
create type car_category as enum ('economy', 'sedan', 'suv');

create table cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  bubble_id uuid not null references bubbles,
  make text not null, model text not null, year int not null,
  color text not null, plate text not null,
  category car_category not null,
  transmission transmission not null,
  seats int not null default 5,
  price_per_day_cents int not null check (price_per_day_cents > 0),
  lat double precision not null, lng double precision not null,
  pickup_address text not null,             -- ex.: 'R. do Matão, garagem 2'
  available_weekdays int[] not null default '{0,1,2,3,4,5,6}', -- 0=domingo
  annual_ipva_cents int not null default 0,
  annual_insurance_cents int not null default 0,
  annual_maintenance_cents int not null default 0,
  annual_depreciation_cents int not null default 0,
  is_listed boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);
create index cars_bubble_idx on cars (bubble_id) where is_listed;
create index cars_owner_idx on cars (owner_id);

create table car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars on delete cascade,
  url text not null, position int not null default 0
);
create index car_photos_car_idx on car_photos (car_id, position);

create table car_blocked_dates (
  car_id uuid references cars on delete cascade,
  day date not null,
  primary key (car_id, day)
);

create type booking_status as enum ('requested','accepted','active','completed','rejected','cancelled');
create type protection_plan as enum ('basic','full');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars,
  renter_id uuid not null references profiles,
  start_date date not null, end_date date not null check (end_date >= start_date),
  protection protection_plan not null default 'basic',
  days int not null,
  subtotal_cents int not null, protection_cents int not null,
  service_fee_cents int not null, total_cents int not null,
  owner_payout_cents int not null,
  payment_method text not null check (payment_method in ('pix','card')),
  payment_status text not null default 'paid' check (payment_status in ('paid','refunded')),
  status booking_status not null default 'requested',
  pickup_code char(4),
  -- Fora da spec (ver DECISIONS.md): momento em que o dono conferiu o código de retirada.
  pickup_confirmed_at timestamptz,
  requested_at timestamptz not null default now(),
  accepted_at timestamptz, started_at timestamptz, completed_at timestamptz, closed_at timestamptz,
  exclude using gist (car_id with =, daterange(start_date, end_date, '[]') with &&)
    where (status in ('requested','accepted','active'))
);
create index bookings_renter_idx on bookings (renter_id);
create index bookings_car_idx on bookings (car_id);

create type inspection_kind as enum ('pickup','return');
create table inspection_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings on delete cascade,
  kind inspection_kind not null,
  angle text not null check (angle in ('front','back','left','right')),
  url text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, kind, angle)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings on delete cascade,
  author_id uuid not null references profiles,
  target_id uuid not null references profiles,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, author_id)
);
create index reviews_target_idx on reviews (target_id);

-- Bolha piloto com id fixo: novos cadastros já caem nela antes mesmo do seed.
insert into bubbles (id, name, center_lat, center_lng, radius_m)
values ('00000000-0000-4000-8000-000000000001', 'Butantã', -23.5614, -46.7230, 1500)
on conflict (id) do nothing;

-- ───────────────────────── Funções auxiliares ─────────────────────────

-- "Hoje" no fuso da operação.
create function rumo_today() returns date
language sql stable as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- Chamadas com service role, SQL direto (migrations/seed) ou funções internas pulam as travas.
create function rumo_is_privileged() returns boolean
language sql stable as $$
  select coalesce(auth.role(), 'postgres') not in ('authenticated', 'anon')
      or coalesce(current_setting('rumo.bypass', true), '') = '1'
$$;

-- security definer: quebram a recursão entre as policies de cars e bookings.
create function is_car_owner(p_car uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cars where id = p_car and owner_id = auth.uid())
$$;

create function has_booking_on_car(p_car uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from bookings where car_id = p_car and renter_id = auth.uid())
$$;

create function is_booking_participant(p_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b join cars c on c.id = b.car_id
    where b.id = p_booking and (b.renter_id = auth.uid() or c.owner_id = auth.uid())
  )
$$;

-- Dados privados do próprio perfil (telefone, CNH): as colunas não são legíveis via select direto.
create function get_my_profile() returns profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid()
$$;

-- Períodos ocupados de um carro, sem expor quem reservou.
create function car_busy_ranges(p_car uuid)
returns table (start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select b.start_date, b.end_date from bookings b
  where b.car_id = p_car
    and b.status in ('requested', 'accepted', 'active')
    and b.end_date >= rumo_today()
$$;

-- Pedidos sem resposta do dono há mais de 24h viram "rejected" com estorno (SPEC §6).
create function expire_stale_requests() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform set_config('rumo.bypass', '1', true);
  update bookings
     set status = 'rejected', payment_status = 'refunded', closed_at = now()
   where status = 'requested' and requested_at < now() - interval '24 hours';
  get diagnostics n = row_count;
  perform set_config('rumo.bypass', '', true);
  return n;
end $$;

-- ───────────────────────── Triggers ─────────────────────────

-- Cria o profile no signup (full_name vem do metadata).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, bubble_id)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    '00000000-0000-4000-8000-000000000001'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- MVP: enviar a CNH marca o perfil como verificado.
create function profiles_before_update() returns trigger
language plpgsql as $$
begin
  if new.cnh_url is not null and new.cnh_url <> '' then
    new.verified := true;
  end if;
  return new;
end $$;

create trigger profiles_verify
  before update on profiles
  for each row execute function profiles_before_update();

-- Reserva nova: o banco recalcula os valores (SPEC §5) e fixa o estado inicial,
-- então o cliente não consegue inventar preço nem pular etapas.
create function bookings_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c cars;
  d date;
begin
  if rumo_is_privileged() then return new; end if;

  select * into c from cars where id = new.car_id;
  if not found or not c.is_listed then raise exception 'RUMO:car_unavailable'; end if;
  if c.owner_id = auth.uid() then raise exception 'RUMO:own_car'; end if;

  new.renter_id := auth.uid();
  new.days := new.end_date - new.start_date + 1;
  if new.days < 1 or new.days > 30 then raise exception 'RUMO:invalid_days'; end if;
  if new.start_date < rumo_today() then raise exception 'RUMO:past_date'; end if;

  for d in select generate_series(new.start_date, new.end_date, interval '1 day')::date loop
    if not (extract(dow from d)::int = any (c.available_weekdays))
       or exists (select 1 from car_blocked_dates where car_id = c.id and day = d) then
      raise exception 'RUMO:day_unavailable';
    end if;
  end loop;

  new.subtotal_cents := new.days * c.price_per_day_cents;
  new.protection_cents := case when new.protection = 'full' then 2900 * new.days else 0 end;
  -- 10% arredondado para o real inteiro
  new.service_fee_cents := round((new.subtotal_cents + new.protection_cents) * 0.10 / 100.0) * 100;
  new.total_cents := new.subtotal_cents + new.protection_cents + new.service_fee_cents;
  new.owner_payout_cents := round(new.subtotal_cents * 0.85);

  new.status := 'requested';
  new.payment_status := 'paid';
  new.pickup_code := null;
  new.pickup_confirmed_at := null;
  new.requested_at := now();
  new.accepted_at := null; new.started_at := null; new.completed_at := null; new.closed_at := null;
  return new;
end $$;

create trigger bookings_insert_guard
  before insert on bookings
  for each row execute function bookings_before_insert();

-- Máquina de estados (SPEC §6): só as transições previstas, feitas pela pessoa certa.
create function bookings_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  is_renter boolean;
  n_photos int;
begin
  if rumo_is_privileged() then return new; end if;

  if (new.id, new.car_id, new.renter_id, new.start_date, new.end_date, new.protection, new.days,
      new.subtotal_cents, new.protection_cents, new.service_fee_cents, new.total_cents,
      new.owner_payout_cents, new.payment_method, new.requested_at)
     is distinct from
     (old.id, old.car_id, old.renter_id, old.start_date, old.end_date, old.protection, old.days,
      old.subtotal_cents, old.protection_cents, old.service_fee_cents, old.total_cents,
      old.owner_payout_cents, old.payment_method, old.requested_at) then
    raise exception 'RUMO:immutable';
  end if;

  is_renter := old.renter_id = uid;
  is_owner := exists (select 1 from cars where id = old.car_id and owner_id = uid);

  -- Tudo que não é status é carimbado aqui, não pelo cliente.
  new.payment_status := old.payment_status;
  new.accepted_at := old.accepted_at; new.started_at := old.started_at;
  new.completed_at := old.completed_at; new.closed_at := old.closed_at;

  if new.status = old.status then
    -- única edição sem troca de status: dono confere o código de retirada
    if old.status = 'accepted' and is_owner and old.pickup_confirmed_at is null
       and new.pickup_confirmed_at is not null then
      new.pickup_code := old.pickup_code;
      new.pickup_confirmed_at := now();
      return new;
    end if;
    raise exception 'RUMO:invalid_transition';
  end if;

  new.pickup_confirmed_at := old.pickup_confirmed_at;

  if old.status = 'requested' and new.status = 'accepted' and is_owner then
    if new.pickup_code is null or new.pickup_code !~ '^[0-9]{4}$' then
      raise exception 'RUMO:pickup_code_required';
    end if;
    new.accepted_at := now();
    return new;
  end if;

  new.pickup_code := old.pickup_code;

  if old.status = 'requested' and new.status = 'rejected' and is_owner then
    new.payment_status := 'refunded'; new.closed_at := now();
    return new;
  end if;

  if old.status in ('requested', 'accepted') and new.status = 'cancelled' and is_renter then
    new.payment_status := 'refunded'; new.closed_at := now();
    return new;
  end if;

  if old.status = 'accepted' and new.status = 'active' and is_renter then
    if old.pickup_confirmed_at is null then raise exception 'RUMO:code_not_confirmed'; end if;
    select count(*) into n_photos from inspection_photos where booking_id = old.id and kind = 'pickup';
    if n_photos < 4 then raise exception 'RUMO:photos_missing'; end if;
    new.started_at := now();
    return new;
  end if;

  if old.status = 'active' and new.status = 'completed' and is_owner then
    select count(*) into n_photos from inspection_photos where booking_id = old.id and kind = 'return';
    if n_photos < 4 then raise exception 'RUMO:photos_missing'; end if;
    new.completed_at := now(); new.closed_at := now();
    return new;
  end if;

  raise exception 'RUMO:invalid_transition';
end $$;

create trigger bookings_update_guard
  before update on bookings
  for each row execute function bookings_before_update();

-- ───────────────────────── Views ─────────────────────────

-- Nota e nº de aluguéis por carro (avaliações que os locatários deram ao dono naquele carro).
create view car_ratings as
select
  c.id as car_id,
  c.owner_id,
  round(avg(r.rating)::numeric, 1) as avg_rating,
  count(r.id)::int as review_count,
  count(distinct b.id)::int as trips_count
from cars c
left join bookings b on b.car_id = c.id and b.status = 'completed'
left join reviews r on r.booking_id = b.id and r.target_id = c.owner_id
group by c.id, c.owner_id;

-- Nota média por pessoa (como dono ou como locatário).
create view profile_ratings as
select
  target_id as profile_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(*)::int as review_count
from reviews
group by target_id;

-- ───────────────────────── RLS ─────────────────────────

alter table bubbles enable row level security;
alter table profiles enable row level security;
alter table cars enable row level security;
alter table car_photos enable row level security;
alter table car_blocked_dates enable row level security;
alter table bookings enable row level security;
alter table inspection_photos enable row level security;
alter table reviews enable row level security;

revoke all on bubbles, profiles, cars, car_photos, car_blocked_dates, bookings, inspection_photos, reviews,
  car_ratings, profile_ratings from anon, authenticated;

-- bubbles
grant select on bubbles to authenticated;
create policy bubbles_read on bubbles for select to authenticated using (true);

-- profiles: os outros só enxergam nome, avatar e selo; cada um edita o seu.
grant select (id, full_name, avatar_url, verified, bubble_id, created_at) on profiles to authenticated;
grant update (full_name, phone, avatar_url, cnh_url, bubble_id) on profiles to authenticated;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- cars
grant select, insert, update, delete on cars to authenticated;
create policy cars_read on cars for select to authenticated
  using (is_listed or owner_id = auth.uid() or has_booking_on_car(id));
create policy cars_insert_own on cars for insert to authenticated with check (owner_id = auth.uid());
create policy cars_update_own on cars for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy cars_delete_own on cars for delete to authenticated using (owner_id = auth.uid());

-- car_photos
grant select, insert, update, delete on car_photos to authenticated;
create policy car_photos_read on car_photos for select to authenticated using (true);
create policy car_photos_insert_own on car_photos for insert to authenticated with check (is_car_owner(car_id));
create policy car_photos_update_own on car_photos for update to authenticated
  using (is_car_owner(car_id)) with check (is_car_owner(car_id));
create policy car_photos_delete_own on car_photos for delete to authenticated using (is_car_owner(car_id));

-- car_blocked_dates
grant select, insert, delete on car_blocked_dates to authenticated;
create policy blocked_read on car_blocked_dates for select to authenticated using (true);
create policy blocked_insert_own on car_blocked_dates for insert to authenticated with check (is_car_owner(car_id));
create policy blocked_delete_own on car_blocked_dates for delete to authenticated using (is_car_owner(car_id));

-- bookings: locatário ou dono do carro; as transições passam pelo trigger acima.
grant select, insert, update on bookings to authenticated;
create policy bookings_read on bookings for select to authenticated
  using (renter_id = auth.uid() or is_car_owner(car_id));
create policy bookings_insert_renter on bookings for insert to authenticated
  with check (renter_id = auth.uid());
create policy bookings_update_participant on bookings for update to authenticated
  using (renter_id = auth.uid() or is_car_owner(car_id))
  with check (renter_id = auth.uid() or is_car_owner(car_id));

-- inspection_photos
grant select, insert, update, delete on inspection_photos to authenticated;
create policy inspection_read on inspection_photos for select to authenticated
  using (is_booking_participant(booking_id));
create policy inspection_insert on inspection_photos for insert to authenticated
  with check (is_booking_participant(booking_id));
create policy inspection_update on inspection_photos for update to authenticated
  using (is_booking_participant(booking_id)) with check (is_booking_participant(booking_id));
create policy inspection_delete on inspection_photos for delete to authenticated
  using (is_booking_participant(booking_id));

-- reviews: só quem participou de um aluguel concluído avalia a outra parte.
grant select, insert on reviews to authenticated;
create policy reviews_read on reviews for select to authenticated using (true);
create policy reviews_insert on reviews for insert to authenticated with check (
  author_id = auth.uid()
  and exists (
    select 1 from bookings b join cars c on c.id = b.car_id
    where b.id = booking_id and b.status = 'completed'
      and ((b.renter_id = auth.uid() and target_id = c.owner_id)
        or (c.owner_id = auth.uid() and target_id = b.renter_id))
  )
);

-- views (agregados públicos para usuários logados)
grant select on car_ratings, profile_ratings to authenticated;

-- funções
revoke execute on function
  is_car_owner(uuid), has_booking_on_car(uuid), is_booking_participant(uuid),
  get_my_profile(), car_busy_ranges(uuid), expire_stale_requests()
from public, anon;
grant execute on function
  is_car_owner(uuid), has_booking_on_car(uuid), is_booking_participant(uuid),
  get_my_profile(), car_busy_ranges(uuid), expire_stale_requests()
to authenticated, service_role;

-- service role (seed e scripts) enxerga tudo
grant all on bubbles, profiles, cars, car_photos, car_blocked_dates, bookings, inspection_photos, reviews
  to service_role;
grant select on car_ratings, profile_ratings to service_role;

-- ───────────────────────── Storage ─────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('car-photos',  'car-photos',  true,  5242880, array['image/*']),
  ('avatars',     'avatars',     true,  5242880, array['image/*']),
  ('inspections', 'inspections', false, 5242880, array['image/*']),
  ('documents',   'documents',   false, 5242880, array['image/*'])
on conflict (id) do nothing;

-- car-photos e avatars: cada um escreve só na própria pasta (<user_id>/...). Leitura é pública pelo bucket.
create policy rumo_public_buckets_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('car-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy rumo_public_buckets_select on storage.objects for select to authenticated
  using (bucket_id in ('car-photos', 'avatars'));
create policy rumo_public_buckets_update on storage.objects for update to authenticated
  using (bucket_id in ('car-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy rumo_public_buckets_delete on storage.objects for delete to authenticated
  using (bucket_id in ('car-photos', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

-- documents (CNH): privado, só o dono da pasta lê e escreve.
create policy rumo_documents_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy rumo_documents_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy rumo_documents_update on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- inspections: privado, pasta = id da reserva; só locatário e dono daquela reserva.
create policy rumo_inspections_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'inspections' and is_booking_participant(((storage.foldername(name))[1])::uuid));
create policy rumo_inspections_select on storage.objects for select to authenticated
  using (bucket_id = 'inspections' and is_booking_participant(((storage.foldername(name))[1])::uuid));
create policy rumo_inspections_update on storage.objects for update to authenticated
  using (bucket_id = 'inspections' and is_booking_participant(((storage.foldername(name))[1])::uuid));
