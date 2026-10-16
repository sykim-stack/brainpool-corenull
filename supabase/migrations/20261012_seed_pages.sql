-- 씨드 배포 페이지 (초대장 URL)
-- 씨드 시작 직후 생성 → 미리 공유 → 종료 시 fruit 상태로 보관

create table if not exists public.corenull_seed_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  run_id uuid not null,
  room_id uuid not null references public.corenull_rooms(id) on delete cascade,
  house_id uuid references public.corenull_houses(id) on delete set null,
  owner_key text not null,
  title text,
  memo text default '',
  end_date date,
  status text not null default 'open'
    check (status in ('open', 'fruit', 'released')),
  created_at timestamptz not null default now(),
  fruited_at timestamptz,
  released_at timestamptz
);

create index if not exists corenull_seed_pages_room_id_idx on public.corenull_seed_pages(room_id);
create index if not exists corenull_seed_pages_run_id_idx on public.corenull_seed_pages(run_id);
create index if not exists corenull_seed_pages_owner_key_idx on public.corenull_seed_pages(owner_key);
create index if not exists corenull_seed_pages_status_idx on public.corenull_seed_pages(status);

comment on table public.corenull_seed_pages is '씨드 구간 배포 페이지(초대장). open=초대중, fruit=수확보관, released=중도해제';
comment on column public.corenull_seed_pages.memo is '인사/장소/계좌 등 메모장 수준 초대 문구';
comment on column public.corenull_seed_pages.slug is '공개 URL /s/[slug]';
