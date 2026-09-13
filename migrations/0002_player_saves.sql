-- 式神強化と最高WAVEを Google / ゲートログインの user_id に紐づける。
create table if not exists player_saves (
  user_id    text primary key,
  high_wave  integer not null default 0,
  bank       integer not null default 0,
  shop_atk   integer not null default 0,
  shop_spd   integer not null default 0,
  shop_coin  integer not null default 0,
  updated_at timestamptz not null default now()
);
