/*
  盤面の指。客神の配置は guests.ts、札は左下のボタン、3択は picks.ts。
  合成の中身は sim の tryMergeOrSwap。
*/
import { SLOT_COUNT, SLOT_HIT_R, buffCardRect, hitMarkBadge, slotXY } from "./data";
import * as audio from "./audio";
import { placeGuest } from "./guests";
import { chooseBuff } from "./picks";
import { bumpRank, tryMergeOrSwap } from "./sim";
import type { Game } from "./types";

export function slotAt(x: number, y: number): number {
  let best = -1;
  let bestD = SLOT_HIT_R;
  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = slotXY(i);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

export function hitBuffCard(x: number, y: number): number {
  for (let i = 0; i < 3; i++) {
    const r = buffCardRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

export function hitMute(x: number, y: number): boolean {
  return Math.hypot(x - 366, y - 812) < 22;
}

export function onPointerDown(g: Game, x: number, y: number) {
  if (g.mode === "buff") {
    const i = hitBuffCard(x, y);
    const opt = i >= 0 ? g.buffOptions[i] : undefined;
    if (opt) chooseBuff(g, opt.id);
    return;
  }
  if (g.mode !== "playing") return;
  if (hitMute(x, y)) {
    g.muted = !g.muted;
    audio.setMuted(g.muted);
    return;
  }
  if (hitMarkBadge(x, y)) {
    g.guestListOpen = !g.guestListOpen;
    if (!g.guestListOpen) g.guestPick = null;
    return;
  }
  if (g.guestPick) {
    const s = slotAt(x, y);
    if (s >= 0 && !g.slots[s]) {
      placeGuest(g, s);
      g.guestListOpen = false;
    }
    g.guestPick = null;
    return;
  }
  const s = slotAt(x, y);
  if (s >= 0 && g.slots[s]) {
    g.drag = { slot: s, x, y };
    g.selectedSlot = s;
  } else {
    g.selectedSlot = null;
  }
}

export function onPointerMove(g: Game, x: number, y: number) {
  if (!g.drag) return;
  g.drag.x = x;
  g.drag.y = y;
}

export function onPointerUp(g: Game, x: number, y: number) {
  if (!g.drag) return;
  const from = g.drag.slot;
  g.drag = null;
  const to = slotAt(x, y);
  if (to < 0) return;
  if (from !== to) tryMergeOrSwap(g, from, to);
  const placed = g.slots[to];
  if (placed) bumpRank(g, placed);
}
