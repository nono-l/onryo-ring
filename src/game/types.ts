export type HeroId = "okiku" | "mio" | "kuro" | "hakumen" | "takaten";
export type Rarity = "common" | "rare" | "elite";
export type Role = "melee" | "ranged";
export type BallKind = "stack" | "fall" | "wrap";
export type Mode = "title" | "playing" | "paused" | "weapon" | "route" | "buff" | "fail";

export interface HeroDef {
  id: HeroId;
  name: string;
  title: string;
  rarity: Rarity;
  role: Role;
  atk: number;
  interval: number;
  range: number;
  color: string;
  projectile: string;
}

export interface Ball {
  id: number;
  hp: number;
  maxHp: number;
  pattern: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: BallKind;
  wrapIndex: number;
  bob: number;
  gold: boolean;
}

export interface Hero {
  id: number;
  defId: HeroId;
  level: number;
  stack: number;
  slot: number;
  atkCd: number;
  facing: 1 | -1;
  attackT: number;
  swing: number;
  targetX: number;
  targetY: number;
  buffMul: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  color: string;
  homing: boolean;
  tx: number;
  ty: number;
  target: "ball" | "boss" | "wrap";
  targetId: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
  kind: "spark" | "puff" | "ring" | "slash";
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  color: string;
  scale: number;
}

export interface WeaponOption {
  id: string;
  name: string;
  desc: string;
}

export interface RouteOption {
  id: HeroId;
  name: string;
  atkLabel: string;
  chanceLabel: string;
  risk: boolean;
  failChance: number;
  atkMul: number;
}

export interface DragState {
  slot: number;
  x: number;
  y: number;
}

export interface Game {
  mode: Mode;
  demo: boolean;
  t: number;
  wave: number;
  coins: number;
  summonCost: number;
  summonCount: number;
  combatPower: number;
  slots: Array<Hero | null>;
  stack: Ball[];
  falling: Ball[];
  wrap: Ball[];
  boss: {
    hp: number;
    maxHp: number;
    hitFlash: number;
    x: number;
    y: number;
    track: number;
    spin: number;
  };
  projectiles: Projectile[];
  particles: Particle[];
  floats: FloatText[];
  selectedSlot: number | null;
  drag: DragState | null;
  shake: number;
  hitstop: number;
  spawnQueue: Array<{ hp: number; pattern: number }>;
  dropCd: number;
  muted: boolean;
  debug: boolean;
  unlocked: HeroId[];
  atkMul: number;
  spdMul: number;
  goldMul: number;
  rng: () => number;
  nextId: number;
  highWave: number;
  weaponOptions: WeaponOption[];
  buffOptions: WeaponOption[];
  routeOptions: RouteOption[];
  flashBanner: string | null;
  flashT: number;
  justMerged: number;
  processed: number;
  weaponCount: number;
  routeCount: number;
  netaCount: number;
  goldKills: number;
  netaSinceGold: number;
  netaCd: number;
  netaReserve: number;
}
