/*
  店の購入と、武器・金皿・道の3択。
  未知の id は倍率を掛けず、選択の終了だけ行う。戦闘の進行は sim.ts。
*/
import { BELT_SLOTS, isShopT2, isShopT3, isShopT4, shopCost, shopMax, shopT1Maxed, shopT3Open, shopT4Open, slotXY } from "./data";
import * as audio from "./audio";
import { saveMeta, setAutoMerge } from "./persist";
import { burst, firstEmptyNearBoss, makeBall, recomputePower, reindexWrap, seedHero } from "./sim";
import type { BuffPickId, Game, ShopId, WeaponPickId } from "./types";

export function buyShop(g: Game, id: ShopId): boolean {
  if (isShopT2(id) && !shopT1Maxed(g.shop)) return false;
  if (isShopT3(id) && !shopT3Open(g.shop)) return false;
  if (isShopT4(id) && !shopT4Open(g.shop)) return false;
  const lv = g.shop[id] ?? 0;
  if (lv >= shopMax(id)) return false;
  const cost = shopCost(id, lv);
  if (g.bank < cost) return false;
  g.bank -= cost;
  g.shop[id] = lv + 1;
  if (id === "auto") setAutoMerge(g, true);
  saveMeta(g);
  audio.sfxSelect();
  return true;
}

/** 金皿の倍率。id を足したらここを埋める。未知の文字列は何も掛けない。 */
const BUFF_FX: Record<BuffPickId, (g: Game) => void> = {
  atk: (g) => {
    g.atkMul *= 1.15;
  },
  spd: (g) => {
    g.spdMul *= 1.12;
  },
  gold: (g) => {
    g.goldMul *= 1.18;
  },
  back: (g) => {
    g.boss.track = Math.min(0.92, g.boss.track + 0.14);
  },
  both: (g) => {
    g.atkMul *= 1.08;
    g.spdMul *= 1.08;
  },
};

function isBuffPick(id: string): id is BuffPickId {
  return Object.hasOwn(BUFF_FX, id);
}

export function applyBuff(g: Game, id: string) {
  if (isBuffPick(id)) BUFF_FX[id](g);
  recomputePower(g);
}

/** 武器昇格の倍率。id を足したらここを埋める。未知の文字列は何も掛けず、対戦へ戻す。 */
const WEAPON_FX: Record<WeaponPickId, (g: Game) => void> = {
  atk: (g) => {
    g.atkMul *= 1.3;
  },
  spd: (g) => {
    g.spdMul *= 1.22;
  },
  gold: (g) => {
    g.goldMul *= 1.4;
  },
  cheap: (g) => {
    g.twinSummon += 1;
  },
};

function isWeaponPick(id: string): id is WeaponPickId {
  return Object.hasOwn(WEAPON_FX, id);
}

export function chooseWeapon(g: Game, id: string) {
  if (isWeaponPick(id)) WEAPON_FX[id](g);
  recomputePower(g);
  g.mode = "playing";
  g.flashBanner = null;
  audio.sfxSelect();
}

export function chooseBuff(g: Game, id: string) {
  applyBuff(g, id);
  g.mode = "playing";
  g.flashBanner = null;
  g.buffOptions = [];
  audio.sfxSelect();
}

export function chooseRoute(g: Game, optIndex: number) {
  const opt = g.routeOptions[optIndex];
  if (!opt) {
    g.mode = "playing";
    return;
  }
  const fail = opt.failChance > 0 && g.rng() < opt.failChance;
  if (fail) {
    g.flashBanner = "失敗";
    g.flashT = 0.9;
    for (let i = 0; i < 6; i++) {
      const spec = { hp: Math.max(3, 2 + g.wave), pattern: i % 5 };
      const b = makeBall(g, spec, "wrap");
      g.wrap.push(b);
    }
    reindexWrap(g);
    g.boss.track = Math.max(0.04, g.boss.track - 6 / BELT_SLOTS);
  } else {
    if (!g.unlocked.includes(opt.id)) g.unlocked.push(opt.id);
    const slot = firstEmptyNearBoss(g);
    if (slot >= 0) {
      const h = seedHero(g, opt.id, slot, opt.atkMul);
      g.slots[slot] = h;
      const p = slotXY(slot);
      burst(g, p.x, p.y, "#e8c15a", 18, "puff");
    } else {
      g.atkMul *= 1 + (opt.atkMul - 1) * 0.25;
    }
    g.flashBanner = `${opt.name} 加入`;
    g.flashT = 0.9;
  }
  recomputePower(g);
  g.mode = "playing";
  audio.sfxSelect();
}
