import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readShop } from "@/game/data";
import type { ShopUpgrades } from "@/game/types";

export type CloudMeta = {
  highWave: number;
  bank: number;
  shop: ShopUpgrades;
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
      shop_okiku: number;
      shop_path: number;
      shop_base: number;
      shop_seed: number;
      shop_back: number;
      shop_arms: number;
    }>`select high_wave, bank, shop_atk, shop_spd, shop_coin, shop_okiku, shop_path, shop_base, shop_seed, shop_back, shop_arms from player_saves where user_id = ${context.userId} limit 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      highWave: row.high_wave,
      bank: row.bank,
      shop: readShop({
        atk: row.shop_atk,
        spd: row.shop_spd,
        coin: row.shop_coin,
        okiku: row.shop_okiku,
        path: row.shop_path,
        base: row.shop_base,
        seed: row.shop_seed,
        back: row.shop_back,
        arms: row.shop_arms,
      }),
    } satisfies CloudMeta;
  });

export const putCloudSave = createServerFn({ method: "POST" })
  .validator((data: CloudMeta) => data)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const shop = readShop(data.shop);
    const sql = await getSql();
    await sql`
      insert into player_saves (user_id, high_wave, bank, shop_atk, shop_spd, shop_coin, shop_okiku, shop_path, shop_base, shop_seed, shop_back, shop_arms, updated_at)
      values (${context.userId}, ${data.highWave}, ${data.bank}, ${shop.atk}, ${shop.spd}, ${shop.coin}, ${shop.okiku}, ${shop.path}, ${shop.base}, ${shop.seed}, ${shop.back}, ${shop.arms}, now())
      on conflict (user_id) do update set
        high_wave = greatest(player_saves.high_wave, excluded.high_wave),
        bank = excluded.bank,
        shop_atk = greatest(player_saves.shop_atk, excluded.shop_atk),
        shop_spd = greatest(player_saves.shop_spd, excluded.shop_spd),
        shop_coin = greatest(player_saves.shop_coin, excluded.shop_coin),
        shop_okiku = greatest(player_saves.shop_okiku, excluded.shop_okiku),
        shop_path = greatest(player_saves.shop_path, excluded.shop_path),
        shop_base = greatest(player_saves.shop_base, excluded.shop_base),
        shop_seed = greatest(player_saves.shop_seed, excluded.shop_seed),
        shop_back = greatest(player_saves.shop_back, excluded.shop_back),
        shop_arms = greatest(player_saves.shop_arms, excluded.shop_arms),
        updated_at = now()
    `;
    return true;
  });
