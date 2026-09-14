alter table player_saves add column if not exists shop_slow integer not null default 0;
alter table player_saves add column if not exists shop_thin integer not null default 0;
alter table player_saves add column if not exists shop_auto integer not null default 0;
