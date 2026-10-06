/*
  セーブと設定フラグ。盤面のルールは sim.ts。
  ここから sim を import しない。店の倍率の再計算は sim の applyMeta がやる。
*/
import { AUTO_KEY, DEBUG_KEY, PLAY_KEY, SAVE_KEY, TUTORIAL_KEY, VOICE_KEY, mergeGuestStock, readGuestStock, readShop } from "./data";
import type { Game, GuestStock, PlayStyle, ShopUpgrades } from "./types";

export type MetaSave = {
  version: number;
  highWave: number;
  bank: number;
  markBank: number;
  guestStock: GuestStock;
  shop: ShopUpgrades;
};

function emptyMeta(): MetaSave {
  return { version: 2, highWave: 0, bank: 0, markBank: 0, guestStock: readGuestStock(null), shop: readShop() };
}

export function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return emptyMeta();
    const p = JSON.parse(raw) as Partial<MetaSave> & { highWave?: number; guestBank?: number };
    return {
      version: 2,
      highWave: p.highWave ?? 0,
      bank: p.bank ?? 0,
      markBank: p.markBank ?? 0,
      guestStock: readGuestStock(p.guestStock, p.guestBank),
      shop: readShop(p.shop),
    };
  } catch {
    return emptyMeta();
  }
}

export function snapshotMeta(g: Game): MetaSave {
  return { version: 2, highWave: g.highWave, bank: g.bank, markBank: g.markBank, guestStock: { ...g.guestStock }, shop: { ...g.shop } };
}

export function mergeMeta(a: MetaSave, b: MetaSave): MetaSave {
  return {
    version: 2,
    highWave: Math.max(a.highWave, b.highWave),
    bank: Math.max(a.bank, b.bank),
    markBank: Math.max(a.markBank, b.markBank),
    guestStock: mergeGuestStock(a.guestStock ?? {}, b.guestStock ?? {}),
    shop: {
      atk: Math.max(a.shop.atk, b.shop.atk),
      spd: Math.max(a.shop.spd, b.shop.spd),
      coin: Math.max(a.shop.coin, b.shop.coin),
      okiku: Math.max(a.shop.okiku, b.shop.okiku),
      path: Math.max(a.shop.path, b.shop.path),
      base: Math.max(a.shop.base, b.shop.base),
      seed: Math.max(a.shop.seed, b.shop.seed),
      back: Math.max(a.shop.back, b.shop.back),
      arms: Math.max(a.shop.arms, b.shop.arms),
      slow: Math.max(a.shop.slow, b.shop.slow),
      thin: Math.max(a.shop.thin, b.shop.thin),
      auto: Math.max(a.shop.auto, b.shop.auto),
    },
  };
}

/** セーブの欄を盤面へ写す。店の倍率はここでは掛けない。 */
export function assignMeta(g: Game, meta: MetaSave) {
  g.highWave = meta.highWave;
  g.bank = meta.bank;
  g.markBank = meta.markBank;
  g.guestStock = readGuestStock(meta.guestStock);
  if (g.demo || g.mode === "title") g.guestLeft = { ...g.guestStock };
  g.shop = readShop(meta.shop);
}

let cloudFlush: ((m: MetaSave) => void) | null = null;
export function setCloudFlush(fn: ((m: MetaSave) => void) | null) {
  cloudFlush = fn;
}

export function saveMeta(g: Game) {
  try {
    if (g.wave > g.highWave) g.highWave = g.wave;
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshotMeta(g)));
  } catch {
    /* private mode */
  }
  cloudFlush?.(snapshotMeta(g));
}

export function loadDebugFlag(): boolean {
  try {
    return localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDebugMode(g: Game, on: boolean) {
  g.debug = on;
  try {
    localStorage.setItem(DEBUG_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function loadPlayStyle(): PlayStyle {
  try {
    return localStorage.getItem(PLAY_KEY) === "manual" ? "manual" : "active";
  } catch {
    return "active";
  }
}

export function setPlayStyle(g: Game, style: PlayStyle) {
  g.playStyle = style;
  try {
    localStorage.setItem(PLAY_KEY, style);
  } catch {
    /* private mode */
  }
}

export function loadAutoMerge(): boolean {
  try {
    const v = localStorage.getItem(AUTO_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* private mode */
  }
  return true;
}

export function setAutoMerge(g: Game, on: boolean) {
  g.autoMerge = on;
  try {
    localStorage.setItem(AUTO_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function loadVoiceFlag(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setVoiceOn(g: Game, on: boolean) {
  g.voiceOn = on;
  if (!on) g.screamMul = 1;
  try {
    localStorage.setItem(VOICE_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export type TutorialMode = "once" | "on" | "off";

export function tutorialShowMode(): TutorialMode {
  try {
    const v = localStorage.getItem(TUTORIAL_KEY);
    if (v === "1") return "on";
    if (v === "0") return "off";
    return "once";
  } catch {
    return "off";
  }
}

export function tutorialShowsOnStart(): boolean {
  return tutorialShowMode() !== "off";
}

export function setTutorialShow(on: boolean) {
  try {
    localStorage.setItem(TUTORIAL_KEY, on ? "1" : "0");
  } catch {
    /* private mode */
  }
}

/** 表示オンを自分で付けたときだけ、次の挑戦でも最初から出す。 */
export function dismissTutorial() {
  try {
    if (localStorage.getItem(TUTORIAL_KEY) === "1") return;
    localStorage.setItem(TUTORIAL_KEY, "0");
  } catch {
    /* private mode */
  }
}
