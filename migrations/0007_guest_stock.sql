alter table player_saves add column if not exists guest_stock jsonb not null default '{}'::jsonb;
