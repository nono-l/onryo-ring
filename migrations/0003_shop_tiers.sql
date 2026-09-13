alter table player_saves add column if not exists shop_okiku integer not null default 0;
alter table player_saves add column if not exists shop_path integer not null default 0;
alter table player_saves add column if not exists shop_base integer not null default 0;
alter table player_saves add column if not exists shop_seed integer not null default 0;
alter table player_saves add column if not exists shop_back integer not null default 0;
alter table player_saves add column if not exists shop_arms integer not null default 0;
