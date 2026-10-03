alter table player_saves add column if not exists items jsonb not null default '{}'::jsonb;
