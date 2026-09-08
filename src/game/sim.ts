/*
  1フレームのルール。描画は draw.ts。
  手毬を dropCd で落とすな。召喚ボタンを戻すな。近接は先端だけ。
  金皿3択は mode=buff で Canvas に出す。React overlay だけにするとプレビューで欠ける。
*/
import {
  BALL_R,
  BELT_FILL,
  BELT_SLOTS,
  BELT_START,
  BOSS_X,
  BOSS_Y,
  HEROES,
  GOLD_EARLY_EVERY,
  GOLD_FAST_KILLS,
  GOLD_LATE_NORMAL,
  HEX_DX,
  HEX_DY,
  NETA_RESERVE,
  NETA_SPAWN_CD,
  PIT_R,
  PIT_X,
  PIT_Y,
  RARITY_WEIGHT,
  SAVE_KEY,
  SLOT_COUNT,
  SLOT_HIT_R,
  STACK_BOTTOM,
  STACK_CAP,
  STACK_START,
  STARTER_SLOT,
  WEAPON_POOL,
  BUFF_POOL,
  WRAP_CAP,
  WRAP_ORB_R,
  beltPose,
  bossHp,
  buffCardRect,
  displayLevel,
  levelMul,
  makeWave,
  mulberry32,
  netaHpAt,
  routeFor,
  slotXY,
  summonCostAt,
  swingTip,
  swingTipR,
  temariHpAt,
} from "./data";
import type { Ball, Game, Hero, HeroId, Mode, Projectile, Role, WeaponOption } from "./types";
import * as audio from "./audio";

function nid(g: Game): number {
  g.nextId += 1;
  return g.nextId;
}

function loadHigh(): number {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw) as { version?: number; highWave?: number };
    return p.highWave ?? 0;
  } catch {
    return 0;
  }
}

function saveHigh(g: Game) {
  try {
    if (g.wave > g.highWave) g.highWave = g.wave;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, highWave: g.highWave }));
  } catch {
    /* private mode */
  }
}

function makeBall(g: Game, spec: { hp: number; pattern: number }, kind: Ball["kind"] = "stack"): Ball {
  const b: Ball = {
    id: nid(g),
    hp: spec.hp,
    maxHp: spec.hp,
    pattern: spec.pattern,
    x: PIT_X,
    y: STACK_BOTTOM - 5 * HEX_DY - 30,
    vx: 0,
    vy: 0,
    kind,
    wrapIndex: 0,
    bob: g.rng() * Math.PI * 2,
    gold: false,
  };
  if (kind === "wrap") stampGoldNeta(g, b);
  return b;
}

function stampGoldNeta(g: Game, b: Ball) {
  g.netaCount += 1;
  // 4 個壊すまでは 4 皿に 1 金。多いとパワーアップが簡単すぎるので、その後はノーマル 10 に金 1。
  if (g.goldKills < GOLD_FAST_KILLS) {
    b.gold = g.netaCount % GOLD_EARLY_EVERY === 0;
    return;
  }
  g.netaSinceGold += 1;
  if (g.netaSinceGold > GOLD_LATE_NORMAL) {
    b.gold = true;
    g.netaSinceGold = 0;
  } else {
    b.gold = false;
  }
}

function spawnBeltNeta(g: Game): boolean {
  if (g.netaReserve <= 0) return false;
  if (g.wrap.length >= WRAP_CAP - 1) return false;
  g.netaReserve -= 1;
  const n = g.netaCount + 1;
  const b = makeBall(g, { hp: netaHpAt(g.goldKills), pattern: n % 5 }, "wrap");
  const p = beltPose(Math.min(0.98, g.boss.track + (g.wrap.length + 1) / BELT_SLOTS));
  b.x = p.x;
  b.y = p.y;
  g.wrap.push(b);
  reindexWrap(g);
  return true;
}

function refillBelt(g: Game, dt: number) {
  g.netaCd -= dt;
  let n = 0;
  while (g.wrap.length < BELT_FILL && g.netaReserve > 0 && n < 3) {
    spawnBeltNeta(g);
    n += 1;
  }
  if (g.netaCd <= 0 && g.wrap.length < WRAP_CAP - 1 && g.netaReserve > 0) {
    spawnBeltNeta(g);
    g.netaCd = NETA_SPAWN_CD;
  }
}

function emptySlots(): Array<Hero | null> {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

function seedHero(g: Game, defId: HeroId, slot: number, buffMul = 1): Hero {
  return {
    id: nid(g),
    defId,
    level: 1,
    stack: 1,
    slot,
    atkCd: 0.2,
    facing: 1,
    attackT: 0,
    swing: g.rng() * Math.PI * 2,
    targetX: BOSS_X,
    targetY: BOSS_Y,
    buffMul,
  };
}

function heroAtk(g: Game, h: Hero): number {
  const d = HEROES[h.defId];
  return d.atk * levelMul(h.level) * g.atkMul * h.buffMul;
}

export function createGame(opts?: { demo?: boolean; muted?: boolean; debug?: boolean }): Game {
  const rng = mulberry32((Math.random() * 0xffffffff) | 0);
  const g: Game = {
    mode: "title",
    demo: !!opts?.demo,
    t: 0,
    wave: 1,
    coins: 60,
    summonCost: 10,
    summonCount: 0,
    combatPower: 0,
    slots: emptySlots(),
    stack: [],
    falling: [],
    wrap: [],
    boss: { hp: bossHp(1), maxHp: bossHp(1), hitFlash: 0, x: BOSS_X, y: BOSS_Y, track: BELT_START, spin: 0 },
    projectiles: [],
    particles: [],
    floats: [],
    selectedSlot: null,
    drag: null,
    shake: 0,
    hitstop: 0,
    spawnQueue: makeWave(1, rng),
    dropCd: 0,
    muted: opts?.muted ?? false,
    debug: opts?.debug ?? false,
    unlocked: ["okiku"],
    atkMul: 1,
    spdMul: 1,
    goldMul: 1,
    rng,
    nextId: 1,
    highWave: loadHigh(),
    weaponOptions: [],
    buffOptions: [],
    routeOptions: [],
    flashBanner: null,
    flashT: 0,
    justMerged: 0,
    processed: 0,
    weaponCount: 0,
    routeCount: 0,
    netaCount: 0,
    goldKills: 0,
    netaSinceGold: 0,
    netaCd: 0,
    netaReserve: NETA_RESERVE,
  };
  g.slots[STARTER_SLOT] = seedHero(g, "okiku", STARTER_SLOT);
  for (let i = 0; i < BELT_FILL; i++) spawnBeltNeta(g);
  layoutBelt(g, true);
  refillStack(g, STACK_START);
  layoutStack(g, true);
  recomputePower(g);
  return g;
}

export function resetRun(g: Game, demo = false) {
  const high = g.highWave;
  const muted = g.muted;
  const debug = g.debug;
  const fresh = createGame({ demo, muted, debug });
  Object.assign(g, fresh);
  g.highWave = high;
  g.debug = debug;
  g.mode = demo ? "title" : "playing";
  g.demo = demo;
}

function refillStack(g: Game, cap = STACK_CAP) {
  while (g.stack.length < cap && g.spawnQueue.length) {
    const spec = g.spawnQueue.shift()!;
    const live = temariHpAt(g.summonCount, g.rng, g.wave);
    const hp = Math.max(spec.hp, live);
    g.stack.push(makeBall(g, { hp, pattern: spec.pattern }));
  }
}

function layoutStack(g: Game, snap = false) {
  const counts = [1, 2, 3, 4, 5];
  let i = 0;
  for (let r = 0; r < counts.length; r++) {
    const n = counts[r]!;
    const y = STACK_BOTTOM - r * HEX_DY;
    for (let j = 0; j < n; j++) {
      if (i >= g.stack.length) return;
      const b = g.stack[i]!;
      const tx = PIT_X + (j - (n - 1) / 2) * HEX_DX;
      if (snap) {
        b.x = tx;
        b.y = y;
      } else {
        b.x += (tx - b.x) * 0.22;
        b.y += (y - b.y) * 0.22;
      }
      i++;
    }
  }
}

function recomputePower(g: Game) {
  let p = 0;
  for (const h of g.slots) {
    if (!h) continue;
    const d = HEROES[h.defId];
    const atk = heroAtk(g, h);
    const iv = d.interval / g.spdMul;
    p += (atk / iv) * 10;
  }
  g.combatPower = Math.round(p);
}

function burst(g: Game, x: number, y: number, color: string, n = 8, kind: "spark" | "puff" = "spark") {
  for (let i = 0; i < n; i++) {
    const a = g.rng() * Math.PI * 2;
    const s = 40 + g.rng() * 90;
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 20,
      life: 0.28 + g.rng() * 0.25,
      maxLife: 0.45,
      r: kind === "puff" ? 6 + g.rng() * 6 : 2 + g.rng() * 3,
      color,
      kind,
    });
  }
}

function slashFx(g: Game, x: number, y: number) {
  g.particles.push({
    x,
    y,
    vx: (g.rng() - 0.5) * 20,
    vy: (g.rng() - 0.5) * 20,
    life: 0.16,
    maxLife: 0.16,
    r: 16 + g.rng() * 8,
    color: "#fff4d0",
    kind: "slash",
  });
}

function float(g: Game, x: number, y: number, text: string, color = "#fff4e0", scale = 1) {
  g.floats.push({
    x: x + (g.rng() - 0.5) * 10,
    y,
    vy: scale > 1.4 ? -22 : -38,
    text,
    life: scale > 1.4 ? 0.9 : 0.7,
    color,
    scale,
  });
}

function noteProcessed(g: Game, kind: Ball["kind"]) {
  if (kind === "wrap") return;
  g.processed += 1;
}

function popBall(g: Game, b: Ball) {
  burst(g, b.x, b.y, "#f0d9a0", 12, "puff");
  const gold = Math.max(1, Math.round((1 + b.maxHp * 0.18) * g.goldMul));
  g.coins += gold;
  float(g, b.x, b.y - 8, `+${gold}`, "#e8c15a");
  noteProcessed(g, b.kind);
  if (b.kind === "wrap") {
    g.boss.track = Math.min(0.9, g.boss.track + 1 / BELT_SLOTS);
    float(g, g.boss.x, g.boss.y - 36, "バック", "#9ad8e8");
    if (b.gold) {
      g.goldKills += 1;
      if (g.goldKills === GOLD_FAST_KILLS) g.netaSinceGold = 0;
      onGoldPlate(g, b);
    }
  }
  if (!g.demo) audio.sfxPop();
  if (b.kind === "stack" || b.kind === "fall") {
    trySummon(g, { free: true });
  }
}

function applyBuff(g: Game, id: string) {
  if (id === "atk") g.atkMul *= 1.15;
  else if (id === "spd") g.spdMul *= 1.12;
  else if (id === "gold") g.goldMul *= 1.18;
  else if (id === "back") g.boss.track = Math.min(0.92, g.boss.track + 0.14);
  else if (id === "both") {
    g.atkMul *= 1.08;
    g.spdMul *= 1.08;
  }
  recomputePower(g);
}

function pickBuffs(g: Game): WeaponOption[] {
  const pool = [...BUFF_POOL];
  const out: WeaponOption[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = (g.rng() * pool.length) | 0;
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

function onGoldPlate(g: Game, b: Ball) {
  g.shake = Math.min(1, g.shake + 0.28);
  burst(g, b.x, b.y, "#ffe28a", 16, "puff");
  float(g, b.x, b.y - 22, "金皿", "#ffe28a", 1.45);
  if (!g.demo) audio.sfxSelect();
  const picks = pickBuffs(g);
  if (g.demo) {
    applyBuff(g, picks[0]!.id);
    return;
  }
  g.buffOptions = picks;
  g.mode = "buff";
  g.flashBanner = "パワーアップ";
  g.flashT = 1.2;
}

function applyBallDmg(g: Game, b: Ball, dmg: number) {
  b.hp -= dmg;
  float(g, b.x, b.y, `${Math.round(dmg)}`, "#fff8ee");
  burst(g, b.x, b.y, "#fff", 4);
  if (b.hp <= 0) popBall(g, b);
}

function applyBossDmg(g: Game, dmg: number) {
  g.boss.hp -= dmg;
  g.boss.hitFlash = 0.12;
  g.shake = Math.min(1, g.shake + 0.18);
  g.hitstop = Math.max(g.hitstop, 0.04);
  if (dmg >= 22) {
    float(g, g.boss.x + 4, g.boss.y - 52, "BOOM!", "#ffe28a", 2.1);
    burst(g, g.boss.x, g.boss.y - 8, "#ffe28a", 16, "puff");
    slashFx(g, g.boss.x, g.boss.y - 12);
  } else {
    float(g, g.boss.x, g.boss.y - 28, `${Math.round(dmg)}`, "#ffe8a0");
    burst(g, g.boss.x, g.boss.y - 10, "#e8c15a", 6);
  }
  if (!g.demo) audio.sfxHit();
  if (g.boss.hp <= 0) onBossDown(g);
}

function onBossDown(g: Game) {
  burst(g, g.boss.x, g.boss.y, "#e8c15a", 22, "puff");
  g.shake = 1;
  g.coins += Math.round(12 * g.wave * g.goldMul);
  if (!g.demo) audio.sfxBoss();
  g.wave += 1;
  saveHigh(g);
  g.boss = {
    hp: bossHp(g.wave),
    maxHp: bossHp(g.wave),
    hitFlash: 0,
    x: g.boss.x,
    y: g.boss.y,
    track: Math.min(0.85, g.boss.track + 0.14),
    spin: g.boss.spin,
  };
  g.spawnQueue.push(...makeWave(g.wave, g.rng, g.summonCount));
  g.netaReserve += NETA_RESERVE;
  refillStack(g, g.processed >= 4 ? STACK_CAP : STACK_START);
  if (g.demo) return;
  if (g.routeCount === 0) openRoute(g);
}

function convertToWrap(g: Game, b: Ball) {
  const idx = g.falling.indexOf(b);
  if (idx >= 0) g.falling.splice(idx, 1);
  if (b.hp <= 0) return;
  b.kind = "wrap";
  b.vy = 0;
  stampGoldNeta(g, b);
  const hp = netaHpAt(g.goldKills);
  b.hp = hp;
  b.maxHp = hp;
  g.wrap.push(b);
  g.processed += 1;
  reindexWrap(g);
  if (g.wrap.length >= WRAP_CAP) {
    g.boss.track -= 1 / BELT_SLOTS;
  }
}

function failIfGoal(g: Game) {
  if (g.boss.track > 0) return;
  g.boss.track = 0;
  if (g.demo) {
    resetRun(g, true);
    return;
  }
  if (g.mode === "fail") return;
  g.mode = "fail";
  saveHigh(g);
  audio.sfxFail();
}

function layoutBelt(g: Game, snap = false, dt = 1 / 60) {
  const pose = beltPose(g.boss.track);
  const k = snap ? 1 : Math.min(1, 10 * dt);
  g.boss.x += (pose.x - g.boss.x) * k;
  g.boss.y += (pose.y - g.boss.y) * k;
  g.boss.spin = pose.a;
  for (let i = 0; i < g.wrap.length; i++) {
    const b = g.wrap[i]!;
    const p = beltPose(g.boss.track + (i + 1) / BELT_SLOTS);
    const bk = snap ? 1 : Math.min(1, 8 * dt);
    b.x += (p.x - b.x) * bk;
    b.y += (p.y - b.y) * bk;
    b.wrapIndex = i;
    b.bob += dt * 4;
  }
}

function reindexWrap(g: Game) {
  for (let i = 0; i < g.wrap.length; i++) {
    g.wrap[i]!.wrapIndex = i;
  }
}

type Target = { kind: "ball"; ball: Ball } | { kind: "boss" };

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function nearestBall(hx: number, hy: number, range2: number, balls: Ball[]): Ball | null {
  let best: Ball | null = null;
  let bestD = 1e12;
  for (const b of balls) {
    if (b.hp <= 0) continue;
    const d = dist2(hx, hy, b.x, b.y);
    if (d <= range2 && d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

function inReach(hx: number, hy: number, tx: number, ty: number, range: number, extra: number) {
  const r = range + extra;
  return dist2(hx, hy, tx, ty) <= r * r;
}

function inPit(hx: number, hy: number) {
  return dist2(hx, hy, PIT_X, PIT_Y) <= (PIT_R - 4) * (PIT_R - 4);
}

function heroRange(h: Hero): number {
  return HEROES[h.defId].range + (h.level - 1) * 3;
}

function tipHits(tip: { x: number; y: number }, r: number, x: number, y: number, extra: number) {
  const rr = r + extra;
  return dist2(tip.x, tip.y, x, y) <= rr * rr;
}

function meleeTipTouching(g: Game, h: Hero, pos: { x: number; y: number }): boolean {
  const tip = swingTip(h, pos.x, pos.y);
  const r = swingTipR(h);
  for (const b of g.falling) {
    if (b.hp > 0 && tipHits(tip, r, b.x, b.y, BALL_R)) return true;
  }
  if (g.stack.length) {
    const m = g.stack[0]!;
    if (m.hp > 0 && tipHits(tip, r, m.x, m.y, BALL_R)) return true;
  }
  for (const b of g.wrap) {
    if (b.hp > 0 && tipHits(tip, r, b.x, b.y, WRAP_ORB_R)) return true;
  }
  return tipHits(tip, r, g.boss.x, g.boss.y - 10, 26);
}

function pickTarget(g: Game, hx: number, hy: number, range: number, role: Role, buffMul: number): Target | null {
  const falling = nearestBall(hx, hy, (range + BALL_R) * (range + BALL_R), g.falling);
  if (falling) return { kind: "ball", ball: falling };

  if (g.stack.length) {
    const mouth = g.stack[0]!;
    if (mouth.hp > 0 && inPit(hx, hy)) {
      return { kind: "ball", ball: mouth };
    }
  }

  const bossIn = inReach(hx, hy, g.boss.x, g.boss.y - 20, range, 34);

  if (role === "melee") {
    if (buffMul >= 4 && bossIn) return { kind: "boss" };
    const wrap = nearestBall(hx, hy, (range + WRAP_ORB_R) * (range + WRAP_ORB_R), g.wrap);
    if (wrap) return { kind: "ball", ball: wrap };
    if (bossIn) return { kind: "boss" };
    return null;
  }

  if (bossIn) return { kind: "boss" };
  const wrap = nearestBall(hx, hy, (range + WRAP_ORB_R) * (range + WRAP_ORB_R), g.wrap);
  if (wrap) return { kind: "ball", ball: wrap };
  return null;
}

function meleeSweep(g: Game, h: Hero, pos: { x: number; y: number }) {
  // 体の周囲円・inPit 全当てを戻すな。当たるのは今の振りの先端だけ。
  const dmg = Math.max(1, Math.round(heroAtk(g, h) * (0.88 + g.rng() * 0.24)));
  h.attackT = 1;
  const tip = swingTip(h, pos.x, pos.y);
  const r = swingTipR(h);
  h.targetX = tip.x;
  h.targetY = tip.y;

  let hitBall = false;
  const strike = (b: Ball, extra: number) => {
    if (b.hp <= 0) return;
    if (!tipHits(tip, r, b.x, b.y, extra)) return;
    applyBallDmg(g, b, dmg);
    hitBall = true;
  };
  for (const b of g.falling) strike(b, BALL_R);
  if (g.stack.length) strike(g.stack[0]!, BALL_R);
  for (const b of g.wrap) strike(b, WRAP_ORB_R);
  pruneDead(g);

  const hitBoss = tipHits(tip, r, g.boss.x, g.boss.y - 10, 26);
  if (hitBoss) applyBossDmg(g, dmg);
  else if (hitBall && !g.demo) audio.sfxHit();

  slashFx(g, tip.x, tip.y);
}

function fireRanged(g: Game, h: Hero, target: Target) {
  const def = HEROES[h.defId];
  const pos = slotXY(h.slot);
  const dmg = Math.max(1, Math.round(heroAtk(g, h) * (0.88 + g.rng() * 0.24)));
  h.attackT = 1;
  const tx = target.kind === "boss" ? g.boss.x : target.ball.x;
  const ty = target.kind === "boss" ? g.boss.y - 18 : target.ball.y;
  h.targetX = tx;
  h.targetY = ty;
  h.facing = tx < pos.x ? -1 : 1;
  const ang = Math.atan2(ty - pos.y, tx - pos.x);
  h.swing = ang;

  const p: Projectile = {
    id: nid(g),
    x: pos.x + Math.cos(ang) * 22,
    y: pos.y + Math.sin(ang) * 22 - 4,
    vx: 0,
    vy: 0,
    dmg,
    life: 0.55,
    color: def.projectile,
    homing: true,
    tx,
    ty,
    target: target.kind === "boss" ? "boss" : target.ball.kind === "wrap" ? "wrap" : "ball",
    targetId: target.kind === "boss" ? -1 : target.ball.id,
  };
  const spd = 380;
  p.vx = Math.cos(ang) * spd;
  p.vy = Math.sin(ang) * spd;
  g.projectiles.push(p);
}

function findBall(g: Game, id: number): Ball | null {
  for (const b of g.falling) if (b.id === id) return b;
  for (const b of g.wrap) if (b.id === id) return b;
  for (const b of g.stack) if (b.id === id) return b;
  return null;
}

function pruneDead(g: Game) {
  const keep = (b: Ball) => b.hp > 0;
  if (g.stack.some((b) => b.hp <= 0)) {
    g.stack = g.stack.filter(keep);
    const cap = g.processed >= 4 ? STACK_CAP : STACK_START;
    refillStack(g, cap);
  }
  g.falling = g.falling.filter(keep);
  const wlen = g.wrap.length;
  g.wrap = g.wrap.filter(keep);
  if (g.wrap.length !== wlen) reindexWrap(g);
}

function stepProjectiles(g: Game, dt: number) {
  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const p = g.projectiles[i]!;
    p.life -= dt;
    if (p.homing) {
      if (p.target === "boss") {
        p.tx = g.boss.x;
        p.ty = g.boss.y - 18;
      } else {
        const b = findBall(g, p.targetId);
        if (b && b.hp > 0) {
          p.tx = b.x;
          p.ty = b.y;
        }
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const spd = 400;
      p.vx = p.vx * 0.55 + (dx / len) * spd * 0.45;
      p.vy = p.vy * 0.55 + (dy / len) * spd * 0.45;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const hitR = p.target === "boss" ? 36 : 18;
    if (Math.hypot(p.x - p.tx, p.y - p.ty) < hitR || p.life <= 0) {
      if (p.target === "boss") applyBossDmg(g, p.dmg);
      else {
        const b = findBall(g, p.targetId);
        if (b && b.hp > 0) applyBallDmg(g, b, p.dmg);
      }
      burst(g, p.x, p.y, p.color, 5);
      g.projectiles.splice(i, 1);
    }
  }
  pruneDead(g);
}

function stepHeroes(g: Game, dt: number) {
  for (const h of g.slots) {
    if (!h) continue;
    h.swing += (1.55 + h.attackT * 3.8) * g.spdMul * dt;
    h.attackT = Math.max(0, h.attackT - dt * (1.7 + g.spdMul * 1.1));
    h.atkCd -= dt;
    if (h.atkCd > 0) continue;
    const def = HEROES[h.defId];
    const pos = slotXY(h.slot);
    const range = heroRange(h);
    if (def.role === "melee") {
      if (!meleeTipTouching(g, h, pos)) continue;
      h.atkCd = def.interval / g.spdMul;
      meleeSweep(g, h, pos);
    } else {
      const t = pickTarget(g, pos.x, pos.y, range, def.role, h.buffMul);
      if (!t) continue;
      h.atkCd = def.interval / g.spdMul;
      fireRanged(g, h, t);
    }
  }
}

function firstEmpty(g: Game): number {
  return g.slots.findIndex((s) => !s);
}

function firstEmptyNearBoss(g: Game): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < SLOT_COUNT; i++) {
    if (g.slots[i]) continue;
    const p = slotXY(i);
    const d = Math.hypot(p.x - g.boss.x, p.y - g.boss.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function rollSummon(g: Game): HeroId {
  const pool = g.unlocked.map((id) => HEROES[id]).filter(Boolean);
  let total = 0;
  const weights = pool.map((d) => {
    const w = RARITY_WEIGHT[d.rarity] ?? 10;
    total += w;
    return w;
  });
  let r = g.rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return pool[i]!.id;
  }
  return pool[0]!.id;
}

export function trySummon(g: Game, opts?: { free?: boolean }): boolean {
  if (g.mode !== "playing" && !g.demo) return false;
  const slot = firstEmpty(g);
  if (slot < 0) return false;
  const free = !!opts?.free;
  if (!free) {
    if (g.coins < g.summonCost) return false;
    g.coins -= g.summonCost;
  }
  g.summonCount += 1;
  g.summonCost = summonCostAt(g.summonCount);
  const id = rollSummon(g);
  g.slots[slot] = seedHero(g, id, slot);
  const p = slotXY(slot);
  burst(g, p.x, p.y, "#e8c15a", 10, "puff");
  if (free) float(g, p.x, p.y - 26, "召喚", "#e8c15a");
  recomputePower(g);
  if (!g.demo) audio.sfxSummon();
  return true;
}

function tryMergeOrSwap(g: Game, from: number, to: number): boolean {
  if (from === to) return false;
  const a = g.slots[from];
  const b = g.slots[to];
  if (!a) return false;
  if (!b) {
    a.slot = to;
    g.slots[to] = a;
    g.slots[from] = null;
    return true;
  }
  if (a.defId === b.defId && a.level === b.level && a.level < 8) {
    const combined = a.stack + b.stack;
    const p = slotXY(to);
    if (combined >= 3) {
      b.level += 1;
      b.stack = combined - 2;
      g.slots[from] = null;
      burst(g, p.x, p.y, "#fff4c0", 16, "puff");
      g.justMerged = 0.35;
      g.shake = Math.min(1, g.shake + 0.25);
      float(g, p.x, p.y - 28, `${displayLevel(b.level)}`, "#e8c15a");
      recomputePower(g);
      if (!g.demo) audio.sfxMerge();
    } else {
      b.stack = combined;
      g.slots[from] = null;
      burst(g, p.x, p.y, "#e8c15a", 8, "puff");
      g.justMerged = 0.18;
    }
    return true;
  }
  a.slot = to;
  b.slot = from;
  g.slots[to] = a;
  g.slots[from] = b;
  return true;
}

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
  if (to >= 0) tryMergeOrSwap(g, from, to);
}

function openWeapon(g: Game) {
  g.weaponCount += 1;
  const pool = [...WEAPON_POOL];
  g.weaponOptions = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = (g.rng() * pool.length) | 0;
    g.weaponOptions.push(pool.splice(idx, 1)[0]!);
  }
  g.mode = "weapon";
  g.flashBanner = "武器昇格";
  g.flashT = 1.35;
  if (!g.demo) audio.sfxSelect();
}

function openRoute(g: Game) {
  g.routeCount += 1;
  g.routeOptions = routeFor(g.wave);
  g.mode = "route";
  if (!g.demo) audio.sfxSelect();
}

function maybeEvents(g: Game) {
  if (g.demo || g.mode !== "playing") return;
  if (g.routeCount === 0) {
    const low = g.boss.hp / g.boss.maxHp <= 0.15;
    if (low || g.processed >= 38) {
      openRoute(g);
      return;
    }
  }
  if (g.weaponCount < 3 && g.processed >= 14 + g.weaponCount * 22) {
    openWeapon(g);
  }
}

export function chooseWeapon(g: Game, id: string) {
  if (id === "atk") g.atkMul *= 1.3;
  if (id === "spd") g.spdMul *= 1.22;
  if (id === "gold") g.goldMul *= 1.4;
  if (id === "cheap") g.summonCost = Math.max(6, g.summonCost - 4);
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

function demoBrain(g: Game, dt: number) {
  if (g.rng() < dt * 0.28) {
    const groups = new Map<string, number[]>();
    g.slots.forEach((h, i) => {
      if (!h) return;
      const k = `${h.defId}:${h.level}`;
      const arr = groups.get(k) ?? [];
      arr.push(i);
      groups.set(k, arr);
    });
    for (const idxs of groups.values()) {
      if (idxs.length < 2) continue;
      const stacked = idxs.find((i) => (g.slots[i]?.stack ?? 0) >= 2);
      if (stacked != null) {
        const other = idxs.find((i) => i !== stacked);
        if (other != null) {
          tryMergeOrSwap(g, other, stacked);
          return;
        }
      }
      if (idxs.length >= 2) {
        tryMergeOrSwap(g, idxs[0]!, idxs[1]!);
        return;
      }
    }
  }
}

export function step(g: Game, dt: number) {
  const simming = g.mode === "playing" || (g.mode === "title" && g.demo);
  g.t += dt;
  g.shake = Math.max(0, g.shake - dt * 2.4);
  g.justMerged = Math.max(0, g.justMerged - dt);
  if (g.flashT > 0) {
    g.flashT -= dt;
    if (g.flashT <= 0) g.flashBanner = null;
  }
  g.boss.hitFlash = Math.max(0, g.boss.hitFlash - dt);

  if (g.hitstop > 0) {
    g.hitstop -= dt;
    stepFx(g, dt);
    return;
  }

  if (!simming) {
    stepFx(g, dt);
    return;
  }

  if (g.demo && g.mode === "title") demoBrain(g, dt);

  const cap = g.processed >= 4 ? STACK_CAP : STACK_START;
  refillStack(g, cap);
  layoutStack(g);

  // 手毬は列に残す。タイマーで falling に落とすと「壊す＝召喚」が壊れる。
  for (let i = g.falling.length - 1; i >= 0; i--) {
    const b = g.falling[i]!;
    b.y += b.vy * dt;
    b.x += (PIT_X - b.x) * 1.8 * dt;
    b.bob += dt * 6;
    if (b.hp <= 0) continue;
    if (b.y >= PIT_Y + 18) convertToWrap(g, b);
  }

  const packed = g.wrap.length / BELT_SLOTS;
  g.boss.track -= (0.018 + g.wave * 0.0032 + packed * 0.01) * dt;
  failIfGoal(g);
  refillBelt(g, dt);
  layoutBelt(g, false, dt);

  stepHeroes(g, dt);
  stepProjectiles(g, dt);
  pruneDead(g);
  stepFx(g, dt);
  recomputePower(g);
  maybeEvents(g);

  if (g.spawnQueue.length === 0 && g.stack.length === 0 && g.falling.length === 0 && g.boss.hp > 0) {
    g.spawnQueue.push(...makeWave(g.wave, g.rng, g.summonCount));
  }
}

function stepFx(g: Game, dt: number) {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const p = g.particles[i]!;
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind !== "slash") p.vy += 70 * dt;
    if (p.life <= 0) g.particles.splice(i, 1);
  }
  for (let i = g.floats.length - 1; i >= 0; i--) {
    const f = g.floats[i]!;
    f.life -= dt;
    f.y += f.vy * dt;
    f.vy *= 0.98;
    if (f.life <= 0) g.floats.splice(i, 1);
  }
  if (g.particles.length > 180) g.particles.splice(0, g.particles.length - 180);
  if (g.floats.length > 40) g.floats.splice(0, g.floats.length - 40);
}

export function setMode(g: Game, m: Mode) {
  g.mode = m;
}
