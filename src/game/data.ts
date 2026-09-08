/*
  数値と配置の置き場。sim はルール、draw は絵。
  マスを正方形グリッドに戻すな。円陣は同心円 SLOT_LAYOUT。
  近接の長さは swingLen / swingTip が描画と当たりの唯一の定義。
*/
import type { HeroDef, HeroId, RouteOption, WeaponOption } from "./types";

export const VW = 390;
export const VH = 844;

export const PIT_X = 195;
export const PIT_Y = 448;
export const PIT_R = 156;

export const SLOT_R = 15;
export const SWING_REACH = 1.34;
export const STARTER_SLOT = 0;

// 円の中に収まる同心円。真四角 6x6 だと縁が空き、角が円からはみ出す。
export const SLOT_LAYOUT: Array<{ x: number; y: number }> = (() => {
  const out: Array<{ x: number; y: number }> = [];
  const rings: Array<{ n: number; r: number; a0: number }> = [
    { n: 1, r: 0, a0: 0 },
    { n: 8, r: 46, a0: Math.PI / 8 },
    { n: 12, r: 88, a0: 0 },
    { n: 16, r: 130, a0: Math.PI / 16 },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const ang = ring.a0 + (i / ring.n) * Math.PI * 2 - Math.PI / 2;
      out.push({
        x: PIT_X + Math.cos(ang) * ring.r,
        y: PIT_Y + Math.sin(ang) * ring.r,
      });
    }
  }
  return out;
})();

export const SLOT_COUNT = SLOT_LAYOUT.length;
export const SLOT_HIT_R = 19;

export const BALL_R = 24;
export const HEX_DX = 47;
export const HEX_DY = 41;
export const STACK_BOTTOM = PIT_Y - PIT_R + 10;
export const STACK_CAP = 15;
export const STACK_START = 10;

export const WRAP_R = 168;
export const WRAP_ORB_R = 13;
export const WRAP_CAP = 18;
export const WRAP_START = Math.PI * 1.18;
export const WRAP_SPAN = Math.PI * 1.85;

/** t=0 is ゴール (11 o'clock). t grows along the rim, away from the goal. */
export const GOAL_A = (Math.PI * 4) / 3;
export const BELT_SPAN = Math.PI * 1.72;
export const BELT_SLOTS = 20;
export const BELT_START = 0.48;
export const BELT_FILL = 10;
export const NETA_SPAWN_CD = 2;
export const NETA_RESERVE = 240;

export const BOSS_X = 236;
export const BOSS_Y = PIT_Y + 92;

export function beltPose(t: number): { x: number; y: number; a: number } {
  const tt = Math.max(0, Math.min(1, t));
  const a = GOAL_A - tt * BELT_SPAN;
  return {
    x: PIT_X + Math.cos(a) * WRAP_R,
    y: PIT_Y + Math.sin(a) * WRAP_R,
    a,
  };
}

export const HEROES: Record<HeroId, HeroDef> = {
  okiku: {
    id: "okiku",
    name: "お菊",
    title: "井戸の童",
    rarity: "common",
    role: "melee",
    atk: 1,
    interval: 0.92,
    range: 64,
    color: "#d4a07a",
    projectile: "#e8c9a0",
  },
  mio: {
    id: "mio",
    name: "澪",
    title: "白狐巫女",
    rarity: "rare",
    role: "ranged",
    atk: 1,
    interval: 1.08,
    range: 96,
    color: "#f0e6d8",
    projectile: "#9ad8e8",
  },
  kuro: {
    id: "kuro",
    name: "黒",
    title: "二尾の刃",
    rarity: "rare",
    role: "melee",
    atk: 1,
    interval: 0.78,
    range: 68,
    color: "#3a2a28",
    projectile: "#c45a4a",
  },
  hakumen: {
    id: "hakumen",
    name: "白面",
    title: "無貌の杖",
    rarity: "elite",
    role: "ranged",
    atk: 1,
    interval: 1.14,
    range: 104,
    color: "#c8b8d8",
    projectile: "#b48cff",
  },
  takaten: {
    id: "takaten",
    name: "高天",
    title: "白帽の鎌",
    rarity: "elite",
    role: "melee",
    atk: 1,
    interval: 0.86,
    range: 74,
    color: "#e8e4dc",
    projectile: "#7ec8e0",
  },
};

export const RARITY_WEIGHT: Record<string, number> = {
  common: 72,
  rare: 22,
  elite: 6,
};

export function slotXY(i: number): { x: number; y: number } {
  return SLOT_LAYOUT[i] ?? { x: PIT_X, y: PIT_Y };
}

export const BUFF_CARD_W = 300;
export const BUFF_CARD_H = 80;
export const BUFF_CARD_GAP = 14;

export function buffCardRect(i: number): { x: number; y: number; w: number; h: number } {
  const total = 3 * BUFF_CARD_H + 2 * BUFF_CARD_GAP;
  const y0 = (VH - total) / 2 + 18;
  return {
    x: (VW - BUFF_CARD_W) / 2,
    y: y0 + i * (BUFF_CARD_H + BUFF_CARD_GAP),
    w: BUFF_CARD_W,
    h: BUFF_CARD_H,
  };
}

/** World length of the drawn weapon. drawWeapon の rotate(+Y) と同じ向き。cos/sin で先端を取ると90度ずれる。 */
export function swingLen(h: { defId: HeroId; level: number }): number {
  const hs = (SLOT_R / 27) * SWING_REACH;
  const s = 0.92 + h.level * 0.18;
  let L = 38;
  if (h.defId === "okiku") L = 47;
  else if (h.defId === "kuro") L = 46 + h.level * 4;
  else if (h.defId === "takaten") L = 48 + h.level * 4;
  else L = 36 + (h.level - 1) * 3;
  return L * s * hs;
}

export function swingTipR(h: { defId: HeroId; level: number }): number {
  if (h.defId === "okiku") return 8 + h.level;
  if (h.defId === "kuro") return 6 + h.level;
  if (h.defId === "takaten") return 7 + h.level;
  return 5 + h.level;
}

export function swingTip(
  h: { defId: HeroId; level: number; swing: number },
  x: number,
  y: number,
): { x: number; y: number } {
  const len = swingLen(h);
  return {
    x: x - Math.sin(h.swing) * len,
    y: y + Math.cos(h.swing) * len,
  };
}

export function wrapAngle(index: number): number {
  return WRAP_START - (index + 0.5) * (WRAP_SPAN / WRAP_CAP);
}

export function wrapXY(index: number): { x: number; y: number } {
  const a = wrapAngle(index);
  return {
    x: PIT_X + Math.cos(a) * WRAP_R,
    y: PIT_Y + Math.sin(a) * WRAP_R,
  };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const GOLD_FAST_KILLS = 4;
export const GOLD_EARLY_EVERY = 4;
export const GOLD_LATE_NORMAL = 10;

// レーン上の皿は出たときの HP のまま。ここはこれから出す皿だけ。
// 6個倍は最初の4回（撃破 6/12/18/24）。そのあと 2 個ごと。wave は掛けない。
export function netaHpAt(goldKills: number): number {
  const k = Math.max(0, goldKills);
  const sixTimes = 4;
  const sixInterval = 6;
  let doubles: number;
  if (k < sixTimes * sixInterval) {
    doubles = Math.floor(k / sixInterval);
  } else {
    doubles = sixTimes + Math.floor((k - sixTimes * sixInterval) / 2);
  }
  return Math.max(1, 2 ** doubles);
}

export function summonCostAt(count: number): number {
  return Math.min(40, 10 + count * 2);
}

/** Same counter as summon cost: n=0..2 → 2, then 6, 9/18, 15/35… */
export function temariHpAt(count: number, rng: () => number, wave = 1): number {
  let mul: number;
  if (count <= 2) mul = 1;
  else if (count <= 5) mul = 3;
  else if (count <= 9) mul = rng() > 0.48 ? 9 : 4.5;
  else if (count <= 14) {
    const r = rng();
    mul = r > 0.84 ? 17.5 : r > 0.5 ? 10 : 7.5;
  } else {
    const grow = Math.pow(1.42, 1 + Math.floor((count - 15) / 5));
    const r = rng();
    mul = (r > 0.8 ? 16 : r > 0.4 ? 9 : 6) * grow;
  }
  const waveMul = Math.pow(1.28, Math.max(0, wave - 1));
  return Math.max(1, Math.round(2 * mul * waveMul));
}

export function makeWave(
  wave: number,
  rng: () => number,
  startN = 0,
): Array<{ hp: number; pattern: number }> {
  const count = 18 + wave * 7;
  const out: Array<{ hp: number; pattern: number }> = [];
  for (let i = 0; i < count; i++) {
    out.push({
      hp: temariHpAt(startN + i, rng, wave),
      pattern: (i + wave * 3) % 5,
    });
  }
  return out;
}

export function bossHp(wave: number): number {
  return Math.round(9999 * Math.pow(1.38, wave - 1));
}

export function dropInterval(wave: number): number {
  return Math.max(3.0, 5.2 - wave * 0.16);
}

export function levelMul(level: number): number {
  return 2 * level - 1;
}

/** 3-merge display: Lv1→1, Lv2→3, Lv3→5 */
export function displayLevel(level: number): number {
  return 2 * level - 1;
}

export const WEAPON_POOL: WeaponOption[] = [
  { id: "atk", name: "鬼金棒", desc: "全員の攻撃力 +30%" },
  { id: "spd", name: "時雨", desc: "攻撃速度 +22%" },
  { id: "gold", name: "金運", desc: "獲得コイン +40%" },
  { id: "cheap", name: "口寄せ札", desc: "召喚コスト −4（最低 6）" },
];

export const BUFF_POOL: WeaponOption[] = [
  { id: "atk", name: "攻撃力UP", desc: "全員の攻撃力 +15%" },
  { id: "spd", name: "攻撃速度UP", desc: "振りと攻撃間隔が速くなる" },
  { id: "gold", name: "金運UP", desc: "入手両が増える" },
  { id: "back", name: "花魁バック", desc: "花魁が大きく下がる" },
  { id: "both", name: "二刀流", desc: "攻撃力と速度が少し上がる" },
];

export function routeFor(wave: number): RouteOption[] {
  if (wave <= 2) {
    return [
      {
        id: "hakumen",
        name: "白面",
        atkLabel: "攻撃力 +1000%",
        chanceLabel: "失敗確率 50%",
        risk: true,
        failChance: 0.5,
        atkMul: 11,
      },
      {
        id: "takaten",
        name: "高天",
        atkLabel: "攻撃力 +500%",
        chanceLabel: "成功率 100%",
        risk: false,
        failChance: 0,
        atkMul: 6,
      },
    ];
  }
  return [
    {
      id: "kuro",
      name: "黒",
      atkLabel: "攻撃力 +800%",
      chanceLabel: "失敗確率 35%",
      risk: true,
      failChance: 0.35,
      atkMul: 9,
    },
    {
      id: "mio",
      name: "澪",
      atkLabel: "攻撃力 +400%",
      chanceLabel: "成功率 100%",
      risk: false,
      failChance: 0,
      atkMul: 5,
    },
  ];
}

export const SAVE_KEY = "onryo-ring-v1";
