/*
  客神ガチャの中身。払う華と確率は data.ts。画面は gacha-ui。
  11連で客神札が無ければ最後の1枚を札にする。12枚目は足さない。
*/
import { GACHA_COIN_MISS, GACHA_COIN_P, GACHA_COST, GACHA_MARK_MISS, GACHA_MARK_P, GACHA_MULTI, GACHA_MULTI_COST, GACHA_SLIP_P, GACHA_UPGRADE_P, GUEST_CARD_MAX, GUEST_CARDS, emptyGuestGrowth, guestKind } from "./data";
import { saveMeta } from "./persist";
import type { Game, GuestCardId, HeroId } from "./types";

export type GachaPull =
  | { kind: "card"; card: GuestCardId; name: string; lv: number }
  | { kind: "slip"; n: number; total: number; guaranteed?: boolean }
  | { kind: "coins"; n: number }
  | { kind: "marks"; n: number }
  | { kind: "seal"; n: number; bonus: string | null };

function growth(g: Game, id: HeroId) {
  const row = g.guestGrowth[id] ?? emptyGuestGrowth();
  g.guestGrowth[id] = row;
  return row;
}

function openCards(g: Game, id: HeroId): GuestCardId[] {
  const row = growth(g, id);
  return GUEST_CARDS.map((c) => c.id).filter((id) => row[id] < GUEST_CARD_MAX);
}

function giveCard(g: Game, id: HeroId, card: GuestCardId): GachaPull {
  const row = growth(g, id);
  row[card] = Math.min(GUEST_CARD_MAX, row[card] + 1);
  const name = GUEST_CARDS.find((c) => c.id === card)?.name ?? card;
  return { kind: "card", card, name, lv: row[card] };
}

function giveSeal(g: Game, id: HeroId): GachaPull {
  const row = growth(g, id);
  row.seal += 1;
  if (row.seal < 3) return { kind: "seal", n: row.seal, bonus: null };
  row.seal = 0;
  const open = openCards(g, id);
  if (!open.length) {
    g.markBank += 20;
    return { kind: "seal", n: 0, bonus: "札は満杯。華 +20" };
  }
  const card = open[Math.floor(g.rng() * open.length)]!;
  const got = giveCard(g, id, card);
  return { kind: "seal", n: 0, bonus: got.kind === "card" ? `封が揃い、${got.name}が ${got.lv}` : null };
}

function giveSlip(g: Game, id: HeroId, guaranteed = false): GachaPull {
  const row = growth(g, id);
  row.slips = Math.min(9999, row.slips + 1);
  return { kind: "slip", n: 1, total: row.slips, ...(guaranteed ? { guaranteed: true } : {}) };
}

type Roll = { kind: "card"; card: GuestCardId } | { kind: "slip" } | { kind: "coins" } | { kind: "marks" } | { kind: "seal" };

function roll(g: Game): Roll {
  const r = g.rng();
  if (r < GACHA_UPGRADE_P) {
    const cards = GUEST_CARDS.map((c) => c.id);
    const width = GACHA_UPGRADE_P / cards.length;
    return { kind: "card", card: cards[Math.min(cards.length - 1, Math.floor(r / width))]! };
  }
  if (r < GACHA_SLIP_P) return { kind: "slip" };
  if (r < GACHA_COIN_P) return { kind: "coins" };
  if (r < GACHA_MARK_P) return { kind: "marks" };
  return { kind: "seal" };
}

function applyRoll(g: Game, id: HeroId, rolled: Roll, guaranteed = false): GachaPull {
  if (rolled.kind === "card") {
    const row = growth(g, id);
    if (row[rolled.card] >= GUEST_CARD_MAX) return giveSeal(g, id);
    return giveCard(g, id, rolled.card);
  }
  if (rolled.kind === "slip") return giveSlip(g, id, guaranteed);
  if (rolled.kind === "coins") {
    g.bank += GACHA_COIN_MISS;
    return { kind: "coins", n: GACHA_COIN_MISS };
  }
  if (rolled.kind === "marks") {
    g.markBank += GACHA_MARK_MISS;
    return { kind: "marks", n: GACHA_MARK_MISS };
  }
  return giveSeal(g, id);
}

export function pullGacha(g: Game, id: HeroId): GachaPull[] | null {
  if (!guestKind(id) || g.markBank < GACHA_COST) return null;
  g.markBank -= GACHA_COST;
  const got = [applyRoll(g, id, roll(g))];
  saveMeta(g);
  return got;
}

export function pullGachaMulti(g: Game, id: HeroId): GachaPull[] | null {
  if (!guestKind(id) || g.markBank < GACHA_MULTI_COST) return null;
  g.markBank -= GACHA_MULTI_COST;
  const rolls = Array.from({ length: GACHA_MULTI }, () => roll(g));
  let forced = -1;
  if (!rolls.some((r) => r.kind === "slip")) {
    forced = rolls.length - 1;
    rolls[forced] = { kind: "slip" };
  }
  const got = rolls.map((r, i) => applyRoll(g, id, r, i === forced));
  saveMeta(g);
  return got;
}
