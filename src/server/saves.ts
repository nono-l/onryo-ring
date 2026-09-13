import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";

export type CloudMeta = {
  highWave: number;
  bank: number;
  shop: { atk: number; spd: number; coin: number };
};

export const loadCloudSave = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      high_wave: number;
      bank: number;
      shop_atk: number;
      shop_spd: number;
      shop_coin: number;
    }>`select high_wave, bank, shop_atk, shop_spd, shop_coin from player_saves where user_id = ${context.userId} limit 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      highWave: row.high_wave,
      bank: row.bank,
      shop: { atk: row.shop_atk, spd: row.shop_spd, coin: row.shop_coin },
    } satisfies CloudMeta;
  });

export const putCloudSave = createServerFn({ method: "POST" })
  .validator((data: CloudMeta) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into player_saves (user_id, high_wave, bank, shop_atk, shop_spd, shop_coin, updated_at)
      values (${context.userId}, ${data.highWave}, ${data.bank}, ${data.shop.atk}, ${data.shop.spd}, ${data.shop.coin}, now())
      on conflict (user_id) do update set
        high_wave = greatest(player_saves.high_wave, excluded.high_wave),
        bank = excluded.bank,
        shop_atk = greatest(player_saves.shop_atk, excluded.shop_atk),
        shop_spd = greatest(player_saves.shop_spd, excluded.shop_spd),
        shop_coin = greatest(player_saves.shop_coin, excluded.shop_coin),
        updated_at = now()
    `;
    return true;
  });
