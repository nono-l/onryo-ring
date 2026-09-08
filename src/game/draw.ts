/*
  Canvas 描画。金皿3択は HTML overlay にしない。このプレビューでは欠ける。
  先端の向きは data.swingTip と drawWeapon の rotate(+Y) を一致させる。
*/
import {
  BALL_R,
  BELT_SPAN,
  GOAL_A,
  HEROES,
  PIT_R,
  PIT_X,
  PIT_Y,
  SLOT_COUNT,
  SLOT_R,
  SWING_REACH,
  VH,
  VW,
  WRAP_ORB_R,
  WRAP_R,
  beltPose,
  buffCardRect,
  displayLevel,
  slotXY,
  swingLen,
  swingTip,
  swingTipR,
} from "./data";
import type { Ball, Game, Hero } from "./types";

export const SPRITES: Record<string, HTMLImageElement> = {};

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

export async function loadAssets(): Promise<void> {
  const names = ["okiku", "mio", "kuro", "hakumen", "takaten", "oiran"] as const;
  const jobs = names.map((n) =>
    loadImg(`/assets/${n}.png`).then((img) => {
      SPRITES[n] = img;
    }),
  );
  jobs.push(
    loadImg("/assets/bg.jpg").then((img) => {
      SPRITES.bg = img;
    }),
  );
  await Promise.all(jobs);
  await document.fonts.ready.catch(() => undefined);
  buildCaches();
}

let pitLayer: HTMLCanvasElement | null = null;
const temariTex: HTMLCanvasElement[] = [];

function buildCaches() {
  pitLayer = document.createElement("canvas");
  pitLayer.width = VW;
  pitLayer.height = VH;
  const c = pitLayer.getContext("2d")!;
  paintPit(c);

  for (let i = 0; i < 5; i++) {
    const t = document.createElement("canvas");
    t.width = 128;
    t.height = 128;
    paintTemari(t.getContext("2d")!, 64, 64, 60, i);
    temariTex[i] = t;
  }
}

function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function paintPit(ctx: CanvasRenderingContext2D) {
  const cx = PIT_X;
  const cy = PIT_Y;
  const r = PIT_R;

  ctx.save();
  const stone = ctx.createRadialGradient(cx - 18, cy - 22, 10, cx, cy, r + 18);
  stone.addColorStop(0, "#b7aa96");
  stone.addColorStop(0.45, "#9a8d7a");
  stone.addColorStop(0.78, "#7d7162");
  stone.addColorStop(1, "#4d463c");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
  ctx.fillStyle = stone;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#8f8474";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = "rgba(50,42,34,0.35)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 28; i++) {
    const a = hash2(i, 3) * Math.PI * 2;
    const rr = 20 + hash2(i, 9) * r;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
    for (let k = 0; k < 6; k++) {
      const wob = (hash2(i, k + 20) - 0.5) * 16;
      const t = (k + 1) / 6;
      const nx = cx + Math.cos(a) * rr * t + Math.cos(a + 1.2) * wob;
      const ny = cy + Math.sin(a) * rr * t + Math.sin(a + 1.2) * wob;
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const a = hash2(i, 40) * Math.PI * 2;
    const rr = hash2(i, 41) * r;
    ctx.fillStyle = `rgba(74,83,64,${0.12 + hash2(i, 42) * 0.2})`;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.5 + hash2(i, 43) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(30,24,18,0.35)";
  ctx.lineWidth = 10;
  ctx.stroke();

  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = slotXY(i);
    const sr = SLOT_R;
    ctx.beginPath();
    ctx.arc(p.x, p.y, sr + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(55,50,44,0.28)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, sr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(90,84,74,0.55)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, sr - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(210,200,180,0.28)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    const ig = ctx.createRadialGradient(p.x - 4, p.y - 5, 2, p.x, p.y, sr);
    ig.addColorStop(0, "rgba(130,122,110,0.35)");
    ig.addColorStop(1, "rgba(40,36,30,0.45)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, sr - 3, 0, Math.PI * 2);
    ctx.fillStyle = ig;
    ctx.fill();
  }

  ctx.restore();
}

function paintTemari(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, pattern: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (pattern === 0) {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g.addColorStop(0, "#f0c090");
    g.addColorStop(0.45, "#c44a2a");
    g.addColorStop(1, "#6a1e10");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - 0.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.11) * r, cy + Math.sin(a - 0.11) * r);
      ctx.lineTo(cx + Math.cos(a + 0.11) * r, cy + Math.sin(a + 0.11) * r);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,244,230,0.95)" : "rgba(160,30,24,0.35)";
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = "#f4e6c0";
    ctx.fill();
  } else if (pattern === 1) {
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 4, cx, cy, r);
    g.addColorStop(0, "#dce6b0");
    g.addColorStop(0.5, "#9aaa58");
    g.addColorStop(1, "#4a5a28");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = "rgba(50,70,28,0.55)";
    ctx.lineWidth = r * 0.06;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18, r * 0.42, r * 0.22, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "#e8f0c4";
    ctx.fill();
  } else if (pattern === 2) {
    const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 4, cx, cy, r);
    g.addColorStop(0, "#c8b0e0");
    g.addColorStop(0.5, "#6a4a9a");
    g.addColorStop(1, "#2e1a4a");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = "rgba(240,230,255,0.7)";
    for (let k = 1; k <= 4; k++) {
      ctx.lineWidth = r * 0.04;
      ctx.beginPath();
      ctx.arc(cx, cy, r * (0.2 * k), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,250,240,0.8)";
      ctx.fill();
    }
  } else if (pattern === 3) {
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 4, cx, cy, r);
    g.addColorStop(0, "#ffe6a0");
    g.addColorStop(0.45, "#d4892a");
    g.addColorStop(1, "#6a3010");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - 0.1) * r, cy + Math.sin(a - 0.1) * r);
      ctx.lineTo(cx + Math.cos(a + 0.1) * r, cy + Math.sin(a + 0.1) * r);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? "rgba(255,250,230,0.9)" : "rgba(180,60,20,0.28)";
      ctx.fill();
    }
  } else {
    const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, 4, cx, cy, r);
    g.addColorStop(0, "#d0ece0");
    g.addColorStop(0.5, "#3a8a78");
    g.addColorStop(1, "#143830");
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.strokeStyle = "rgba(230,255,240,0.65)";
    ctx.lineWidth = r * 0.05;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = "#e8fff4";
    ctx.fill();
  }
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "#2a1c14";
  ctx.lineWidth = r * 0.08;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx - r * 0.28, cy - r * 0.32, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fill();
}

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill = "#fff", size = 16) {
  ctx.font = `900 ${size}px "Zen Kaku Gothic New", "Hiragino Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "#1a120c";
  ctx.lineWidth = Math.max(3, size * 0.22);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawBall(ctx: CanvasRenderingContext2D, b: Ball, r: number) {
  if (b.kind === "wrap") {
    drawSushi(ctx, b, r);
    return;
  }
  const tex = temariTex[b.pattern % 5];
  ctx.save();
  ctx.translate(b.x, b.y + Math.sin(b.bob) * 0.6);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  if (tex) ctx.drawImage(tex, -r, -r, r * 2, r * 2);
  ctx.shadowColor = "transparent";
  const hp = Math.max(0, Math.ceil(b.hp));
  outlined(ctx, String(hp), 0, 0, "#fff", r > 16 ? 15 : 11);
  ctx.restore();
}

const NETA = ["#e07050", "#c04040", "#f0d060", "#6aaa58", "#e8a090"] as const;

function drawSushi(ctx: CanvasRenderingContext2D, b: Ball, r: number) {
  const a = Math.atan2(b.y - PIT_Y, b.x - PIT_X);
  const gold = b.gold;
  const rr = gold ? r + 2.5 : r;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(a + Math.PI / 2);
  ctx.shadowColor = gold ? "rgba(232,193,90,0.7)" : "rgba(0,0,0,0.4)";
  ctx.shadowBlur = gold ? 10 : 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = gold ? "#e8c15a" : "#efe6d4";
  ctx.beginPath();
  ctx.ellipse(0, 2, rr + 3, rr * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = gold ? "#8a5a12" : "#c4b496";
  ctx.lineWidth = gold ? 2.2 : 1.2;
  ctx.stroke();
  if (gold) {
    ctx.strokeStyle = "rgba(255,244,200,0.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 2, rr + 1, rr * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = gold ? "#fff4c8" : "#f7f1e4";
  ctx.beginPath();
  ctx.ellipse(0, 0, rr * 0.78, rr * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = gold ? "#d4a02a" : NETA[b.pattern % 5]!;
  ctx.beginPath();
  ctx.ellipse(0, -1.2, rr * 0.82, rr * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(-2.4, -2.4, rr * 0.28, rr * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (gold) {
    ctx.fillStyle = "#fff8dc";
    ctx.beginPath();
    ctx.moveTo(0, -rr * 0.85);
    ctx.lineTo(1.6, -rr * 0.35);
    ctx.lineTo(-1.6, -rr * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  outlined(ctx, String(Math.max(0, Math.ceil(b.hp))), b.x, b.y - 1, gold ? "#ffe28a" : "#fff", gold ? 12 : 11);
}

function drawBelt(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "#5a4a36";
  ctx.lineWidth = 18;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.arc(PIT_X, PIT_Y, WRAP_R, GOAL_A, GOAL_A - BELT_SPAN, true);
  ctx.stroke();
  ctx.strokeStyle = "#c8b898";
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = "#3a3024";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(PIT_X, PIT_Y, WRAP_R - 8, GOAL_A, GOAL_A - BELT_SPAN, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(PIT_X, PIT_Y, WRAP_R + 8, GOAL_A, GOAL_A - BELT_SPAN, true);
  ctx.stroke();
  ctx.restore();

  const g0 = beltPose(0);
  ctx.save();
  ctx.translate(g0.x, g0.y);
  ctx.rotate(g0.a + Math.PI / 2);
  ctx.fillStyle = "#6a2a22";
  ctx.fillRect(-24, -30, 48, 24);
  ctx.strokeStyle = "#2a1610";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(-24, -30, 48, 24);
  ctx.fillStyle = "#e8c15a";
  ctx.font = "bold 11px 'Hiragino Mincho ProN', 'Yu Mincho', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ゴール", 0, -18);
  ctx.restore();
}

function drawPlus(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(236,228,210,0.72)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.38, y);
  ctx.lineTo(x + r * 0.38, y);
  ctx.moveTo(x, y - r * 0.38);
  ctx.lineTo(x, y + r * 0.38);
  ctx.stroke();
  ctx.restore();
}

function mergeReadyCount(g: Game, h: Hero): number {
  let n = 0;
  for (const o of g.slots) {
    if (o && o.defId === h.defId && o.level === h.level) n += o.stack;
  }
  return n;
}

function drawSprite(ctx: CanvasRenderingContext2D, h: Hero, facing: number) {
  const img = SPRITES[h.defId];
  const def = HEROES[h.defId];
  ctx.save();
  ctx.scale(facing, 1);
  const s = 68;
  if (img && img.complete) {
    ctx.drawImage(img, -s / 2, -s * 0.72, s, s);
  } else {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWeapon(ctx: CanvasRenderingContext2D, h: Hero) {
  const def = HEROES[h.defId];
  const lv = h.level;
  const s = 0.92 + lv * 0.18;
  const atk = h.attackT;
  ctx.save();
  ctx.rotate(h.swing);
  ctx.scale(s, s);
  if (atk > 0.04) {
    ctx.strokeStyle = def.projectile;
    ctx.globalAlpha = Math.min(0.72, atk * 0.7);
    ctx.lineWidth = 6 + lv;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, 32 + lv * 5, -1.15, 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (h.defId === "okiku") {
    ctx.fillStyle = lv >= 3 ? "#6a3a12" : "#5a3214";
    ctx.fillRect(-2.6, 6, 5.2, 26);
    ctx.strokeStyle = "#2a1608";
    ctx.lineWidth = 1;
    ctx.strokeRect(-2.6, 6, 5.2, 26);
    if (lv >= 2) {
      ctx.fillStyle = lv >= 3 ? "#d4b45a" : "#8a8e96";
      ctx.fillRect(-3.4, 12, 6.8, 3.2);
      ctx.fillRect(-3.4, 24, 6.8, 3.2);
    }
    ctx.beginPath();
    ctx.ellipse(0, 38, 11 + (lv - 1) * 2.2, 9 + (lv - 1) * 1.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = lv >= 3 ? "#e8b43a" : lv >= 2 ? "#d45a2a" : "#c44a28";
    ctx.fill();
    ctx.strokeStyle = lv >= 3 ? "#7a4a10" : "#5a1c10";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    if (lv >= 3) {
      ctx.beginPath();
      ctx.ellipse(0, 38, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#fff4c8";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(-3, 35, 4, 2.4, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,220,180,0.35)";
    ctx.fill();
  } else if (h.defId === "kuro") {
    ctx.fillStyle = "#2a1814";
    ctx.fillRect(-1.8, 8, 3.6, 16 + (lv - 1) * 4);
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(5 + lv, 40 + lv * 4);
    ctx.lineTo(0, 46 + lv * 4);
    ctx.lineTo(-5 - lv, 40 + lv * 4);
    ctx.closePath();
    ctx.fillStyle = lv >= 3 ? "#e85a3a" : "#c45a4a";
    ctx.fill();
    ctx.strokeStyle = lv >= 2 ? "#ffe8e0" : "#f0d0c4";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.lineTo(0, 44 + lv * 4);
    ctx.stroke();
    if (lv >= 3) {
      ctx.beginPath();
      ctx.moveTo(-6, 28);
      ctx.lineTo(0, 22);
      ctx.lineTo(6, 28);
      ctx.strokeStyle = "#ffd0c0";
      ctx.stroke();
    }
  } else if (h.defId === "takaten") {
    ctx.fillStyle = lv >= 3 ? "#f0ece4" : "#d8d0c4";
    ctx.fillRect(-2.2, 4, 4.4, 34 + (lv - 1) * 4);
    ctx.strokeStyle = "#8a8074";
    ctx.lineWidth = 1;
    ctx.strokeRect(-2.2, 4, 4.4, 34 + (lv - 1) * 4);
    ctx.beginPath();
    ctx.moveTo(2, 34);
    ctx.quadraticCurveTo(28 + lv * 4, 28, 26 + lv * 3, 48 + lv * 4);
    ctx.quadraticCurveTo(18, 40, 2, 42);
    ctx.closePath();
    ctx.fillStyle = lv >= 3 ? "#b8ecff" : "#7ec8e0";
    ctx.fill();
    ctx.strokeStyle = "#e8f8ff";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    if (lv >= 2) {
      ctx.beginPath();
      ctx.moveTo(6, 38);
      ctx.quadraticCurveTo(20, 36, 22, 46);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (h.defId === "mio") {
    ctx.fillStyle = "#e8e0d4";
    ctx.fillRect(-2, 6, 4, 32 + (lv - 1) * 4);
    ctx.fillStyle = lv >= 3 ? "#c8f0ff" : "#9ad8e8";
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(7 + lv, 14);
    ctx.lineTo(0, 11);
    ctx.lineTo(-7 - lv, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f0e8";
    ctx.fillRect(-6, 18, 12, 9);
    ctx.strokeStyle = "#c45a4a";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-6, 18, 12, 9);
    if (lv >= 2) {
      ctx.fillStyle = "#f4f0e8";
      ctx.fillRect(-5, 30, 10, 7);
      ctx.strokeStyle = lv >= 3 ? "#d4b45a" : "#c45a4a";
      ctx.strokeRect(-5, 30, 10, 7);
    }
  } else {
    ctx.fillStyle = "#c8b8d8";
    ctx.fillRect(-2.2, 5, 4.4, 34 + (lv - 1) * 3);
    ctx.beginPath();
    ctx.arc(0, 5, 6 + lv, 0, Math.PI * 2);
    ctx.fillStyle = lv >= 3 ? "#d4b0ff" : "#b48cff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 5, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#f4e6ff";
    ctx.fill();
    if (lv >= 2) {
      ctx.beginPath();
      ctx.arc(0, 5, 9 + lv, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,176,255,0.7)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, g: Game, h: Hero, ox: number, oy: number, ghost = false) {
  const bob = Math.sin(g.t * 5 + h.slot) * 1.2;
  ctx.save();
  ctx.globalAlpha = ghost ? 0.75 : 1;

  if (g.selectedSlot === h.slot && !ghost) {
    const orbit = swingLen(h);
    ctx.beginPath();
    ctx.arc(ox, oy, orbit, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(232,193,90,0.32)";
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    const tip = swingTip(h, ox, oy);
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, swingTipR(h), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232,193,90,0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,236,160,0.7)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  if (h.stack >= 2 && !ghost) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.translate(ox - 9 * h.facing, oy + bob + 3);
    drawSprite(ctx, h, h.facing);
    ctx.restore();
  }

  ctx.translate(ox, oy + bob);
  const hs = SLOT_R / 27;
  ctx.scale(hs, hs);
  const weaponFront = Math.sin(h.swing) > -0.05;
  if (!weaponFront) {
    ctx.save();
    ctx.scale(SWING_REACH, SWING_REACH);
    drawWeapon(ctx, h);
    ctx.restore();
  }
  drawSprite(ctx, h, h.facing);
  if (weaponFront) {
    ctx.save();
    ctx.scale(SWING_REACH, SWING_REACH);
    drawWeapon(ctx, h);
    ctx.restore();
  }
  ctx.restore();
  outlined(ctx, String(displayLevel(h.level)), ox, oy - SLOT_R - 4, "#fff", 11);
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#1a1814";
  ctx.fillRect(-3, 40, 6, 70);
  ctx.fillStyle = "#2c3028";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 16 - 30);
    ctx.lineTo(-22 + i * 2, 28 + i * 12);
    ctx.lineTo(22 - i * 2, 28 + i * 12);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "#4a4338";
  ctx.fillRect(-10, 18, 20, 6);
  ctx.fillStyle = "#6a6052";
  ctx.fillRect(-7, 8, 14, 12);
  ctx.fillStyle = "#d8c48a";
  ctx.globalAlpha = 0.85;
  ctx.fillRect(-5, -6, 10, 16);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#4a4338";
  ctx.fillRect(-9, -10, 18, 5);
  ctx.fillRect(-2, -22, 4, 12);
  ctx.fillStyle = "#c9a24a";
  ctx.beginPath();
  ctx.arc(0, -22, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHitboxes(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);

  const ring = (x: number, y: number, r: number, color: string, dash = false) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace("1)", "0.12)").replace("0.9)", "0.1)");
    if (dash) ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fill();
    ctx.restore();
  };

  for (const b of g.stack) ring(b.x, b.y, BALL_R, "rgba(255,80,200,0.95)");
  for (const b of g.falling) ring(b.x, b.y, BALL_R, "rgba(255,80,200,0.95)");
  for (const b of g.wrap) ring(b.x, b.y, WRAP_ORB_R, "rgba(255,180,40,0.95)");
  ring(g.boss.x, g.boss.y - 10, 26, "rgba(255,60,70,0.95)");

  for (let i = 0; i < SLOT_COUNT; i++) {
    const p = slotXY(i);
    ring(p.x, p.y, SLOT_R, "rgba(255,255,255,0.35)");
    const h = g.slots[i];
    if (!h) continue;
    const def = HEROES[h.defId];
    if (def.role === "melee") {
      const len = swingLen(h);
      ring(p.x, p.y, len, "rgba(50,255,140,0.7)", true);
      const tip = swingTip(h, p.x, p.y);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.strokeStyle = "rgba(50,255,140,0.95)";
      ctx.stroke();
      ring(tip.x, tip.y, swingTipR(h), "rgba(50,255,140,0.95)");
    } else {
      ring(p.x, p.y, def.range, "rgba(80,200,255,0.75)", true);
    }
  }

  for (const p of g.projectiles) {
    ring(p.x, p.y, p.target === "boss" ? 36 : 18, "rgba(180,120,255,0.9)");
  }

  ctx.restore();
}

function drawBuffMenu(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.save();
  ctx.fillStyle = "rgba(12, 8, 6, 0.72)";
  ctx.fillRect(0, 0, VW, VH);
  outlined(ctx, "パワーアップ", VW / 2, 248, "#e8c15a", 28);
  ctx.font = '700 13px "Zen Kaku Gothic New", sans-serif';
  ctx.textAlign = "center";
  ctx.fillStyle = "#d8c8b0";
  ctx.fillText("金のお皿を崩した。ひとつ選べ", VW / 2, 278);
  for (let i = 0; i < g.buffOptions.length; i++) {
    const o = g.buffOptions[i]!;
    const r = buffCardRect(i);
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fillStyle = "#2a2218";
    ctx.fill();
    ctx.strokeStyle = "#e8c15a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = '800 20px "Shippori Mincho", serif';
    ctx.fillStyle = "#e8c15a";
    ctx.fillText(o.name, r.x + r.w / 2, r.y + 34);
    ctx.font = '700 13px "Zen Kaku Gothic New", sans-serif';
    ctx.fillStyle = "#f0e6d4";
    ctx.fillText(o.desc, r.x + r.w / 2, r.y + 58);
  }
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.save();
  ctx.fillStyle = "rgba(18,14,10,0.58)";
  ctx.fillRect(0, 0, VW, 44);
  ctx.fillStyle = "rgba(232,193,90,0.28)";
  ctx.fillRect(0, 44, VW, 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = '700 13px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = "#e8c15a";
  ctx.fillText(`WAVE ${g.wave}`, 14, 22);

  outlined(ctx, `戦闘力 ${g.combatPower}`, VW / 2, 22, "#f4e6c0", 15);

  const coinStr = String(g.coins);
  ctx.font = '700 14px "Zen Kaku Gothic New", sans-serif';
  const cw = ctx.measureText(coinStr).width;
  const iconX = VW - 20 - cw - 16;
  ctx.beginPath();
  ctx.arc(iconX, 22, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c15a";
  ctx.fill();
  ctx.fillStyle = "#5a3a10";
  ctx.font = '800 8px "Zen Kaku Gothic New", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("両", iconX, 23);
  ctx.textAlign = "right";
  ctx.font = '700 14px "Zen Kaku Gothic New", sans-serif';
  ctx.fillStyle = "#e8c15a";
  ctx.fillText(coinStr, VW - 14, 23);

  ctx.restore();
}

function drawMute(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.save();
  ctx.translate(366, 812);
  ctx.strokeStyle = "rgba(232,220,200,0.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -4);
  ctx.lineTo(-2, -4);
  ctx.lineTo(4, -8);
  ctx.lineTo(4, 8);
  ctx.lineTo(-2, 4);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.stroke();
  if (g.muted) {
    ctx.beginPath();
    ctx.moveTo(7, -6);
    ctx.lineTo(13, 6);
    ctx.moveTo(13, -6);
    ctx.lineTo(7, 6);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(4, 0, 8, -0.6, 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

function coverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function draw(ctx: CanvasRenderingContext2D, g: Game) {
  if (!pitLayer || temariTex.length < 5) buildCaches();
  ctx.save();
  const sh = g.shake * g.shake;
  if (sh > 0.002) {
    ctx.translate((Math.random() - 0.5) * 10 * sh, (Math.random() - 0.5) * 10 * sh);
  }

  ctx.fillStyle = "#1c1510";
  ctx.fillRect(0, 0, VW, VH);

  const bg = SPRITES.bg;
  if (bg && bg.complete && bg.naturalWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 560, VW, VH - 560);
    ctx.clip();
    ctx.globalAlpha = 0.9;
    coverImage(ctx, bg, VW, VH);
    ctx.restore();
  }

  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, "#2a3228");
  sky.addColorStop(0.35, "#3a3c34");
  sky.addColorStop(0.55, "#4a463c");
  sky.addColorStop(1, "#2a241c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VW, 580);

  drawPine(ctx, 28, 210, 1.1);
  drawPine(ctx, 8, 320, 0.85);
  drawPine(ctx, 362, 240, 1.05);
  drawPine(ctx, 378, 340, 0.7);

  ctx.fillStyle = "rgba(28,21,16,0.18)";
  ctx.fillRect(0, 0, VW, VH);

  drawLantern(ctx, 48, 700, 1.15);
  drawLantern(ctx, 78, 730, 0.7);

  ctx.fillStyle = "#5a5348";
  ctx.beginPath();
  ctx.roundRect(300, 690, 22, 36, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(328, 704, 16, 28, 5);
  ctx.fill();

  if (pitLayer) ctx.drawImage(pitLayer, 0, 0);
  else paintPit(ctx);

  drawBelt(ctx);

  for (let i = 0; i < SLOT_COUNT; i++) {
    if (g.slots[i] && !(g.drag && g.drag.slot === i)) continue;
    const p = slotXY(i);
    if (g.drag && g.drag.slot === i) drawPlus(ctx, p.x, p.y, SLOT_R);
    else if (!g.slots[i]) drawPlus(ctx, p.x, p.y, SLOT_R);
  }

  for (let i = g.wrap.length - 1; i >= 0; i--) {
    drawBall(ctx, g.wrap[i]!, WRAP_ORB_R);
  }

  for (let i = g.stack.length - 1; i >= 0; i--) {
    drawBall(ctx, g.stack[i]!, BALL_R);
  }

  for (const b of g.falling) drawBall(ctx, b, BALL_R * 0.92);

  const oiran = SPRITES.oiran;
  ctx.save();
  const bob = Math.sin(g.t * 2.2) * 2;
  ctx.translate(g.boss.x, g.boss.y + bob);
  ctx.rotate(g.boss.spin + Math.PI / 2);
  if (g.boss.hitFlash > 0) ctx.filter = "brightness(1.8)";
  const bw = 92;
  const bh = 92;
  if (oiran && oiran.complete) {
    ctx.drawImage(oiran, -bw * 0.5, -bh * 0.62, bw, bh);
  } else {
    ctx.fillStyle = "#4a2030";
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";
  ctx.restore();
  outlined(ctx, String(Math.max(0, Math.ceil(g.boss.hp))), g.boss.x + 8, g.boss.y - 28, "#fff", 20);

  for (let i = 0; i < SLOT_COUNT; i++) {
    const h = g.slots[i];
    if (!h) continue;
    if (g.drag && g.drag.slot === i) continue;
    const p = slotXY(i);
    const ready = mergeReadyCount(g, h) >= 3;
    if (g.selectedSlot === i || ready) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, SLOT_R + 3, 0, Math.PI * 2);
      ctx.strokeStyle = ready ? "rgba(232,193,90,0.95)" : "rgba(232,193,90,0.85)";
      ctx.lineWidth = ready ? 2.6 : 2;
      ctx.stroke();
      if (ready) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, SLOT_R + 6 + Math.sin(g.t * 8) * 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,236,160,0.45)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
    drawHero(ctx, g, h, p.x, p.y);
  }
  if (g.drag) {
    const h = g.slots[g.drag.slot];
    if (h) drawHero(ctx, g, h, g.drag.x, g.drag.y, true);
  }

  for (const p of g.projectiles) {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const p of g.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.kind === "slash") {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(p.x - p.r, p.y - p.r * 0.35);
      ctx.lineTo(p.x + p.r, p.y + p.r * 0.35);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  for (const f of g.floats) {
    const life = f.scale > 1.4 ? 0.9 : 0.7;
    ctx.globalAlpha = Math.max(0, f.life / life);
    const sz = f.text === "BOOM!" ? 22 * f.scale * 0.55 : 12;
    outlined(ctx, f.text, f.x, f.y, f.color, sz);
    ctx.globalAlpha = 1;
  }

  drawHud(ctx, g);
  drawMute(ctx, g);
  if (g.debug) drawHitboxes(ctx, g);
  if (g.mode === "buff") drawBuffMenu(ctx, g);

  if (g.flashBanner && (g.mode === "playing" || g.mode === "buff")) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, g.flashT * 2);
    ctx.fillStyle = "rgba(18,12,10,0.45)";
    ctx.fillRect(0, VH * 0.38, VW, 64);
    outlined(ctx, g.flashBanner, VW / 2, VH * 0.38 + 34, "#e8c15a", 26);
    ctx.restore();
  }

  ctx.restore();
}
