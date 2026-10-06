/*
  客神の在庫と配置。戦闘の進行は sim.ts。
  式神の種と演出は sim にある。指は input.ts が placeGuest を呼ぶ。
*/
import { GUEST_KINDS, HEROES, SLOT_COUNT, guestCost, guestKind, isGuest, slotXY } from "./data";
import * as audio from "./audio";
import { saveMeta } from "./persist";
import { burst, clamp, float, recomputePower, seedHero } from "./sim";
import type { Game, HeroId } from "./types";

export function nudgeGuest(g: Game, id: HeroId, dir: 1 | -1) {
  const k = guestKind(id);
  if (!k) return;
  g.guestStock[id] = clamp((g.guestStock[id] ?? 0) + dir, 0, k.max);
  if (g.demo || g.mode === "title") g.guestLeft[id] = g.guestStock[id];
  saveMeta(g);
}

export function buyGuest(g: Game, id: HeroId): boolean {
  const k = guestKind(id);
  if (!k) return false;
  const n = g.guestStock[id] ?? 0;
  if (n >= k.max) return false;
  const price = guestCost(k, n);
  if (g.markBank < price) return false;
  g.markBank -= price;
  g.guestStock[id] = n + 1;
  if (g.demo || g.mode === "title") g.guestLeft[id] = g.guestStock[id];
  saveMeta(g);
  audio.sfxSelect();
  return true;
}

export function placeGuest(g: Game, slot: number): boolean {
  const id = g.guestPick;
  if (!id || !isGuest(id)) return false;
  if (g.mode !== "playing" && !g.demo) return false;
  const left = g.guestLeft[id] ?? 0;
  if (left <= 0) return false;
  if (slot < 0 || slot >= SLOT_COUNT) return false;
  if (g.slots[slot]) return false;
  g.guestLeft[id] = left - 1;
  const hero = seedHero(g, id, slot);
  hero.stack = 2;
  g.slots[slot] = hero;
  const p = slotXY(slot);
  burst(g, p.x, p.y, "#d4b0f0", 12, "puff");
  float(g, p.x, p.y - 26, HEROES[id].name, HEROES[id].projectile);
  recomputePower(g);
  if (!g.demo) audio.sfxSummon();
  return true;
}

/** 客の配置。主催の客神在庫は減らさない。空きマスだけ。owner は置いた客。 */
export function placeGuestFromPeer(g: Game, id: HeroId, slot: number, owner: string): boolean {
  if (!isGuest(id)) return false;
  if (g.mode !== "playing" || g.demo) return false;
  if (slot < 0 || slot >= SLOT_COUNT) return false;
  if (g.slots[slot]) return false;
  const hero = seedHero(g, id, slot);
  hero.stack = 2;
  hero.owner = owner;
  g.slots[slot] = hero;
  const p = slotXY(slot);
  burst(g, p.x, p.y, "#d4b0f0", 12, "puff");
  float(g, p.x, p.y - 26, HEROES[id].name, HEROES[id].projectile);
  recomputePower(g);
  audio.sfxSummon();
  return true;
}

/** 客が自分の客神を空マスへ動かすか、自分の客神と入れ替える。合成も他人の式神も触らない。 */
export function moveOwnedGuest(g: Game, from: number, to: number, owner: string): boolean {
  if (g.mode !== "playing" || g.demo) return false;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from === to || from < 0 || to < 0 || from >= SLOT_COUNT || to >= SLOT_COUNT) return false;
  const a = g.slots[from];
  if (!a || !isGuest(a.defId) || a.owner !== owner) return false;
  const b = g.slots[to];
  if (!b) {
    a.slot = to;
    g.slots[to] = a;
    g.slots[from] = null;
    return true;
  }
  if (!isGuest(b.defId) || b.owner !== owner) return false;
  a.slot = to;
  b.slot = from;
  g.slots[to] = a;
  g.slots[from] = b;
  return true;
}

/** 客が自分の客神を1体使う。部屋を出ても戻さない。 */
export function spendOwnGuest(g: Game, id: HeroId): boolean {
  const kind = guestKind(id);
  if (!kind || !isGuest(id)) return false;
  const left = g.guestLeft[id] ?? 0;
  const owned = g.guestStock[id] ?? 0;
  if (left <= 0 || owned <= 0) return false;
  g.guestLeft[id] = left - 1;
  g.guestStock[id] = owned - 1;
  saveMeta(g);
  return true;
}

export function refundOwnGuest(g: Game, id: HeroId) {
  const kind = guestKind(id);
  if (!kind) return;
  g.guestLeft[id] = Math.min(kind.max, (g.guestLeft[id] ?? 0) + 1);
  g.guestStock[id] = Math.min(kind.max, (g.guestStock[id] ?? 0) + 1);
  saveMeta(g);
}

export function armGuestLeft(g: Game) {
  for (const k of GUEST_KINDS) {
    g.guestLeft[k.id] = g.guestStock[k.id] ?? k.start;
  }
}
