export type HeroId = "okiku" | "mio" | "kuro" | "hakumen" | "takaten" | "shion";
export type GuestStock = Partial<Record<HeroId, number>>;
export type Rarity = "common" | "rare" | "elite";
export type Role = "melee" | "ranged";
export type BallKind = "stack" | "fall" | "wrap" | "collab";
export type PlayStyle = "active" | "manual";
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
  laneT: number;
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
  prevSwing: number;
  cleaveIds: number[];
  targetX: number;
  targetY: number;
  buffMul: number;
  rank: number;
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
  multi: boolean;
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

export type ShopId =
  | "atk"
  | "spd"
  | "coin"
  | "okiku"
  | "path"
  | "base"
  | "seed"
  | "back"
  | "arms"
  | "slow"
  | "thin"
  | "auto";
export interface ShopUpgrades {
  atk: number;
  spd: number;
  coin: number;
  okiku: number;
  path: number;
  base: number;
  seed: number;
  back: number;
  arms: number;
  slow: number;
  thin: number;
  auto: number;
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
  collab: Ball[];
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
  moveSeq: number;
  shake: number;
  hitstop: number;
  spawnQueue: Array<{ hp: number; pattern: number }>;
  dropCd: number;
  muted: boolean;
  debug: boolean;
  playStyle: PlayStyle;
  autoMerge: boolean;
  voiceOn: boolean;
  screamMul: number;
  unlocked: HeroId[];
  atkMul: number;
  spdMul: number;
  goldMul: number;
  rng: () => number;
  nextId: number;
  highWave: number;
  bank: number;
  shop: ShopUpgrades;
  lastEarned: number;
  twinSummon: number;
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
  collabCd: number;
  marks: number;
  markBank: number;
  lastMarks: number;
  guestStock: GuestStock;
  guestLeft: GuestStock;
  guestPick: HeroId | null;
}
