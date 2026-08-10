-- 버추얼 연간 캘린더 / 방송 시간표 관리 스키마
-- Supabase SQL Editor에서 전체 실행 (멱등)

-- 1) 스트리머
create table if not exists public.streamers (
  id text primary key,
  name text not null,
  color text not null,
  sort_order int not null default 0
);
alter table public.streamers enable row level security;
drop policy if exists "public read streamers" on public.streamers;
drop policy if exists "auth all streamers" on public.streamers;
create policy "public read streamers" on public.streamers for select using (true);
create policy "auth all streamers" on public.streamers for all to authenticated using (true) with check (true);

insert into public.streamers (id, name, color, sort_order) values
  ('jju',      '쮸',    '#ff6f6f', 1),
  ('qp',       '큐피',  '#ef5da8', 2),
  ('hira',     '히라',  '#9b7ff0', 3),
  ('doomi',    '두미',  '#22b8a3', 4),
  ('kachu',    '카츄',  '#f2a93b', 5),
  ('yami',     '야미',  '#4f8ef7', 6),
  ('momong',   '모몽',  '#4fbf7a', 7),
  ('nyanya',   '냔냐',  '#f2895b', 8)
on conflict (id) do nothing;

-- 2) 기념일 (생일 · 데뷔 주년)
create table if not exists public.special_days (
  id bigserial primary key,
  streamer_id text not null references public.streamers(id) on delete cascade,
  month int not null check (month between 1 and 12),
  day int not null check (day between 1 and 31),
  type text not null check (type in ('birthday','anniv')),
  label text,
  created_at timestamptz default now()
);
create index if not exists idx_special_days_month on public.special_days(month);
alter table public.special_days enable row level security;
drop policy if exists "public read special_days" on public.special_days;
drop policy if exists "auth all special_days" on public.special_days;
create policy "public read special_days" on public.special_days for select using (true);
create policy "auth all special_days" on public.special_days for all to authenticated using (true) with check (true);

insert into public.special_days (streamer_id, month, day, type, label) values
  ('nyanya',   1, 24, 'anniv',    '냔냐 주년'),
  ('kachu',    2, 19, 'anniv',    '카츄 주년'),
  ('yami',     3, 12, 'anniv',    '야미 주년'),
  ('hira',     3, 17, 'anniv',    '히라 주년'),
  ('yami',     5, 31, 'birthday', '야미 생일'),
  ('nyanya',   6, 10, 'birthday', '냔냐 생일'),
  ('qp',       6, 21, 'anniv',    '큐피 주년'),
  ('doomi',    7, 17, 'anniv',    '두미 주년'),
  ('momong',   7, 19, 'anniv',    '모몽 주년'),
  ('hira',     8, 23, 'birthday', '히라 생일'),
  ('momong',   10,18, 'birthday', '모몽 생일'),
  ('qp',       10,22, 'birthday', '큐피 생일'),
  ('jju',      10,28, 'birthday', '쮸 생일'),
  ('jju',      11,18, 'anniv',    '쮸 주년'),
  ('doomi',    11,25, 'birthday', '두미 생일'),
  ('kachu',    12,28, 'birthday', '카츄 생일')
on conflict do nothing;

-- 3) 주간 방송 시간표 (weekday: 0=월 ... 6=일)
create table if not exists public.weekly_schedule (
  id bigserial primary key,
  streamer_id text not null references public.streamers(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  time time,
  is_rest boolean not null default false,
  unique (streamer_id, weekday)
);
alter table public.weekly_schedule enable row level security;
drop policy if exists "public read weekly_schedule" on public.weekly_schedule;
drop policy if exists "auth all weekly_schedule" on public.weekly_schedule;
create policy "public read weekly_schedule" on public.weekly_schedule for select using (true);
create policy "auth all weekly_schedule" on public.weekly_schedule for all to authenticated using (true) with check (true);

insert into public.weekly_schedule (streamer_id, weekday, time, is_rest) values
  ('jju',0,'20:00',false), ('jju',1,'20:00',false), ('jju',2,'20:00',false), ('jju',3,'20:00',false), ('jju',4,'20:00',false), ('jju',5,'20:00',false), ('jju',6,'20:00',false),
  ('qp',0,'18:00',false),  ('qp',1,null,true),       ('qp',2,'18:00',false),  ('qp',3,'18:00',false),  ('qp',4,null,true),       ('qp',5,'14:00',false),  ('qp',6,'14:00',false),
  ('hira',0,'19:00',false),('hira',1,'19:00',false), ('hira',2,null,true),    ('hira',3,'19:00',false),('hira',4,'19:00',false), ('hira',5,null,true),    ('hira',6,'19:00',false),
  ('doomi',0,'18:00',false),('doomi',1,null,true),   ('doomi',2,'18:00',false),('doomi',3,'18:00',false),('doomi',4,'18:00',false),('doomi',5,'18:00',false),('doomi',6,'18:00',false),
  ('yami',0,'21:00',false),('yami',1,'21:00',false), ('yami',2,null,true),    ('yami',3,'21:00',false),('yami',4,'21:00',false), ('yami',5,'21:00',false),('yami',6,'21:00',false),
  ('nyanya',0,null,true),  ('nyanya',1,'19:00',false),('nyanya',2,'19:00',false),('nyanya',3,null,true),('nyanya',4,'19:00',false),('nyanya',5,'14:00',false),('nyanya',6,'14:00',false)
on conflict (streamer_id, weekday) do nothing;

-- 4) 기간 일정 (휴가 등 특정 날짜 범위 이벤트) — 예: 7/21~7/24 여름휴가
-- streamer_id가 없으면(NULL) custom_name(예: "대형 콜라보 방송")으로 직접 표기
create table if not exists public.range_events (
  id bigserial primary key,
  streamer_id text references public.streamers(id) on delete cascade,
  custom_name text,
  start_date date not null,
  end_date date not null,
  label text not null,
  created_at timestamptz default now()
);
alter table public.range_events alter column streamer_id drop not null;
alter table public.range_events add column if not exists custom_name text;
create index if not exists idx_range_events_dates on public.range_events(start_date, end_date);
alter table public.range_events enable row level security;
drop policy if exists "public read range_events" on public.range_events;
drop policy if exists "auth all range_events" on public.range_events;
create policy "public read range_events" on public.range_events for select using (true);
create policy "auth all range_events" on public.range_events for all to authenticated using (true) with check (true);

-- 5) (기존에 이미 실행했었다면) 물초코 데이터 정리
delete from public.special_days where streamer_id = 'mulchoco';
delete from public.weekly_schedule where streamer_id = 'mulchoco';
delete from public.range_events where streamer_id = 'mulchoco';
delete from public.streamers where id = 'mulchoco';

-- 6) 스트리머 채널 정보 (온에어 표시 + 방송국 바로가기용)
alter table public.streamers add column if not exists channel_url text;
alter table public.streamers add column if not exists soop_id text;

-- 7) 데뷔일 (몇주년인지 계산용) — 아는 만큼만 채움. 두미(doomi)는 연도 미상이라 비워둠
alter table public.streamers add column if not exists debut_date date;
update public.streamers set debut_date = '2023-11-18' where id = 'jju';
update public.streamers set debut_date = '2025-06-21' where id = 'qp';
update public.streamers set debut_date = '2024-03-17' where id = 'hira';
update public.streamers set debut_date = '2025-02-19' where id = 'kachu';
update public.streamers set debut_date = '2025-03-12' where id = 'yami';
update public.streamers set debut_date = '2025-07-19' where id = 'momong';
update public.streamers set debut_date = '2026-01-24' where id = 'nyanya';

-- 8) 사이트 설정 (스트리머 칩 그리드 열 개수 등)
create table if not exists public.site_settings (
  key text primary key,
  value text
);
alter table public.site_settings enable row level security;
drop policy if exists "public read site_settings" on public.site_settings;
drop policy if exists "auth all site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings for select using (true);
create policy "auth all site_settings" on public.site_settings for all to authenticated using (true) with check (true);

insert into public.site_settings (key, value) values ('chip_columns', '4')
on conflict (key) do nothing;

-- 9) 이름 그라데이션 끝색 (시작색 = 기존 color, 끝색 = color2)
alter table public.streamers add column if not exists color2 text;

-- 10) 좌표 추천 (라이브 방송 업/다운 투표, 1시간 만료, 1인당 방송당 1회)
create table if not exists public.live_recommends (
  id uuid primary key default gen_random_uuid(),
  soop_id text not null,
  display_name text,          -- 표시용 이름
  voter_id text not null,     -- 방문자 식별(localStorage UUID)
  vote smallint not null default 1,  -- +1(업) 또는 -1(다운)
  created_at timestamptz not null default now()
);
-- 1인당 같은 방송에 1행만 (업↔다운 전환은 update)
create unique index if not exists uq_live_recommends_voter_soop on public.live_recommends (voter_id, soop_id);
-- 기존 테이블에 vote 컬럼이 없으면 추가 (마이그레이션)
alter table public.live_recommends add column if not exists vote smallint not null default 1;

alter table public.live_recommends enable row level security;
drop policy if exists "public read live_recommends" on public.live_recommends;
drop policy if exists "public insert live_recommends" on public.live_recommends;
drop policy if exists "public update live_recommends" on public.live_recommends;
drop policy if exists "public delete live_recommends" on public.live_recommends;
create policy "public read live_recommends" on public.live_recommends for select using (true);
create policy "public insert live_recommends" on public.live_recommends for insert with check (true);
create policy "public update live_recommends" on public.live_recommends for update using (true) with check (true);
create policy "public delete live_recommends" on public.live_recommends for delete using (true);

create index if not exists idx_live_recommends_created on public.live_recommends (created_at);
create index if not exists idx_live_recommends_soop on public.live_recommends (soop_id);

-- 11) 아카이브 갤러리 (R2 저장 이미지 메타데이터)
create table if not exists public.archive_items (
  id uuid primary key default gen_random_uuid(),
  file_key text not null,       -- R2 원본 키
  thumb_key text,               -- R2 정지 썸네일 키
  file_type text,               -- image/webp, image/gif, image/png
  title text,                   -- 선택: 캡션
  uploader text,                -- 선택: 업로더 표시명
  created_at timestamptz not null default now()
);
alter table public.archive_items enable row level security;
drop policy if exists "public read archive" on public.archive_items;
drop policy if exists "public insert archive" on public.archive_items;
drop policy if exists "auth delete archive" on public.archive_items;
-- 누구나 조회/업로드
create policy "public read archive" on public.archive_items for select using (true);
create policy "public insert archive" on public.archive_items for insert with check (true);
-- 삭제는 인증된(어드민) 사용자만
create policy "auth delete archive" on public.archive_items for delete using (auth.role() = 'authenticated');

create index if not exists idx_archive_created on public.archive_items (created_at desc);

-- 12) 아카이브 이미지 추천 (따봉, 1인 1추천 토글)
create table if not exists public.archive_likes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.archive_items(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now()
);
-- 1인당 이미지당 1회
create unique index if not exists uq_archive_likes_voter_item on public.archive_likes (voter_id, item_id);
alter table public.archive_likes enable row level security;
drop policy if exists "public read archive_likes" on public.archive_likes;
drop policy if exists "public insert archive_likes" on public.archive_likes;
drop policy if exists "public delete archive_likes" on public.archive_likes;
create policy "public read archive_likes" on public.archive_likes for select using (true);
create policy "public insert archive_likes" on public.archive_likes for insert with check (true);
-- 자기 추천 취소 가능 (토글)
create policy "public delete archive_likes" on public.archive_likes for delete using (true);
create index if not exists idx_archive_likes_item on public.archive_likes (item_id);

-- 13) 아카이브에 VOD/클립 지원 (컬럼 추가)
alter table public.archive_items add column if not exists kind text default 'image';  -- 'image' | 'vod'
alter table public.archive_items add column if not exists vod_url text;      -- VOD 원본 URL
alter table public.archive_items add column if not exists vod_title text;    -- VOD 제목
alter table public.archive_items add column if not exists thumb_url text;    -- 외부 썸네일 URL(VOD용, R2 아님)

-- 14) 아카이브 채널 분기 (서브컬쳐 / 심연)
alter table public.archive_items add column if not exists channel text default 'subculture';  -- 'subculture' | 'abyss'
create index if not exists idx_archive_channel on public.archive_items (channel, created_at desc);

-- 15) 아카이브 채널 이동을 위한 update 정책 (인증된 관리자만)
drop policy if exists "auth update archive" on public.archive_items;
create policy "auth update archive" on public.archive_items for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 16) 업 요청 게시판 (누구나 등록, 게시글 UP 순위 조회)
create table if not exists public.up_requests (
  id uuid primary key default gen_random_uuid(),
  post_url text not null,          -- SOOP 게시글 URL
  bj_id text,                      -- 추출된 BJ 아이디
  post_no text,                    -- 추출된 게시글 번호
  streamer_nick text not null,     -- 대상 스트리머 닉네임
  goal text,                       -- 목표 (예: "UP 30등 안")
  deadline date,                   -- 마감일
  created_at timestamptz not null default now()
);
alter table public.up_requests enable row level security;
drop policy if exists "public read up_requests" on public.up_requests;
drop policy if exists "public insert up_requests" on public.up_requests;
drop policy if exists "public delete up_requests" on public.up_requests;
drop policy if exists "auth delete up_requests" on public.up_requests;
create policy "public read up_requests" on public.up_requests for select using (true);
create policy "public insert up_requests" on public.up_requests for insert with check (true);
-- 삭제는 인증(어드민)만
create policy "auth delete up_requests" on public.up_requests for delete using (auth.role() = 'authenticated');
create index if not exists idx_up_requests_deadline on public.up_requests (deadline);
