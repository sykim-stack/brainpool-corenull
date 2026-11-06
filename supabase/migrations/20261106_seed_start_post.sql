-- 씨드 run: 시작 게시글 기준 범위
alter table public.corenull_seed_pages
  add column if not exists start_post_id uuid references public.messages(id) on delete set null;

alter table public.corenull_seed_pages
  add column if not exists start_at timestamptz;

create index if not exists corenull_seed_pages_start_post_id_idx
  on public.corenull_seed_pages(start_post_id);

comment on column public.corenull_seed_pages.start_post_id is '씨드 구간 시작 게시글';
comment on column public.corenull_seed_pages.start_at is '시작글 created_at 스냅샷 (범위 조회용)';
