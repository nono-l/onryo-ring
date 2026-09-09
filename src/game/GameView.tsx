import { useEffect, useRef, useState } from "react";
import { VH, VW } from "./data";
import { draw, loadAssets } from "./draw";
import { chooseRoute, chooseWeapon, createGame, onPointerDown, onPointerMove, onPointerUp, resetRun, setMode, step } from "./sim";
import type { Game } from "./types";
import * as audio from "./audio";

type OverlayKind = "title" | "none" | "weapon" | "route" | "buff" | "fail" | "paused";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [kind, setKind] = useState<OverlayKind>("title");
  const [tick, setTick] = useState(0);
  const [hexOnly, setHexOnly] = useState(true);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    void loadAssets();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = createGame({ demo: true });
    gameRef.current = game;
    audio.setMuted(game.muted);

    const fit = () => {
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      canvas.width = Math.round(VW * dpr);
      canvas.height = Math.round(VH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    let last = performance.now();
    let acc = 0;
    let raf = 0;
    let lastKind: OverlayKind = "title";
    const STEP = 1 / 60;

    const loop = (now: number) => {
      const raw = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += raw;
      while (acc >= STEP) {
        step(game, STEP);
        acc -= STEP;
      }
      draw(ctx, game);
      const k = overlayOf(game);
      if (k !== lastKind) {
        lastKind = k;
        setKind(k);
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onVis = () => {
      if (document.visibilityState === "visible") audio.resumeIfNeeded();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", fit);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    if (kind !== "weapon") return;
    setHexOnly(true);
    const t = window.setTimeout(() => setHexOnly(false), 1150);
    return () => window.clearTimeout(t);
  }, [kind, tick]);

  const toLocal = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * VW) / rect.width,
      y: ((e.clientY - rect.top) * VH) / rect.height,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    const g = gameRef.current;
    if (!g) return;
    audio.unlockAudio();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toLocal(e);
    if (g.mode === "playing" || g.mode === "buff") onPointerDown(g, p.x, p.y);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = gameRef.current;
    if (!g) return;
    const p = toLocal(e);
    onPointerMove(g, p.x, p.y);
  };
  const onUp = (e: React.PointerEvent) => {
    const g = gameRef.current;
    if (!g) return;
    const p = toLocal(e);
    onPointerUp(g, p.x, p.y);
  };

  const start = () => {
    const g = gameRef.current;
    if (!g) return;
    audio.unlockAudio();
    resetRun(g, false);
    setKind("none");
  };

  const g = gameRef.current;

  return (
    <div className="game-shell">
      <div className="game-stage">
        <canvas
          ref={canvasRef}
          width={VW}
          height={VH}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label="怨霊円陣"
        />
        {kind === "title" && (
          <div className="overlay-scrim">
            <div className="overlay-panel">
              <div className="display-sub">ONRYO RING</div>
              <h1 className="display-title">怨霊円陣</h1>
              <p className="overlay-copy">
                手前の手毬を壊すと式神が召喚される。
                花魁は回転寿司のレーンをゴールへ進む。
              </p>
              <p className="how-to">
                皿は途切れず、8分は流れ続ける。金皿のあとほど硬い
                <br />
                金皿を崩すとパワーアップ３択。ゴールへ着くと敗北
              </p>
              <button type="button" className="cta" onClick={start}>
                挑戦する
              </button>
              <p className="stat-line">最高記録 WAVE {g?.highWave ?? 0}</p>
              <a href="/terms" className="terms-link">
                配信規約
              </a>
            </div>
          </div>
        )}
        {kind === "weapon" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel">
              <button
                type="button"
                className="weapon-hex-wrap"
                onClick={() => setHexOnly(false)}
                aria-label="武器昇格"
              >
                <div className="weapon-hex" aria-hidden>
                  <span className="weapon-slash" />
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <path d="M20 30C14 14 22 8 26 20" stroke="#e8c15a" strokeWidth="2.2" />
                    <path d="M44 30C50 14 42 8 38 20" stroke="#e8c15a" strokeWidth="2.2" />
                    <ellipse cx="32" cy="30" rx="13" ry="12" fill="#f4efe4" />
                    <ellipse cx="27" cy="29" rx="2.3" ry="2.8" fill="#1c1510" />
                    <ellipse cx="37" cy="29" rx="2.3" ry="2.8" fill="#1c1510" />
                    <path d="M32 32.5 L35 37 H29 Z" fill="#1c1510" />
                    <rect x="25" y="40" width="14" height="7" rx="2" fill="#f4efe4" />
                    <path d="M28 40v7M32 40v7M36 40v7" stroke="#1c1510" strokeWidth="1.2" />
                  </svg>
                </div>
                <div className="ribbon">武器昇格</div>
              </button>
              {!hexOnly && (
                <div className="weapon-picks">
                  {g.weaponOptions.map((o) => (
                    <button
                      key={o.id + tick}
                      type="button"
                      className="choice-card weapon-pick"
                      onClick={() => {
                        chooseWeapon(g, o.id);
                        setKind("none");
                      }}
                    >
                      <span className="nm">{o.name}</span>
                      <span className="st">{o.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {kind === "route" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel">
              <div className="ribbon">ルート選択</div>
              <div className="choice-row">
                {g.routeOptions.map((o, i) => (
                  <button
                    key={o.id + tick}
                    type="button"
                    className={`choice-card ${o.risk ? "risk" : "safe"}`}
                    onClick={() => {
                      chooseRoute(g, i);
                      setKind(g.mode === "fail" ? "fail" : "none");
                    }}
                  >
                    <img src={`/assets/${o.id}.png`} alt="" width={96} height={96} />
                    <span className="nm">{o.name}</span>
                    <span className="atk">{o.atkLabel}</span>
                    <span className="chance-label">{o.chanceLabel}</span>
                    <span className="stars" aria-label="星5">
                      <span className="star" />
                      <span className="star" />
                      <span className="star" />
                      <span className="star" />
                      <span className="star" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {kind === "fail" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel">
              <div className="fail-mark">挑戦失敗</div>
              <p className="stat-line">
                WAVE {g.wave}　戦闘力 {g.combatPower}
              </p>
              <p className="overlay-copy">花魁がゴールへ流れ着いた。円陣は破れた。</p>
              <button
                type="button"
                className="cta"
                onClick={() => {
                  audio.unlockAudio();
                  resetRun(g, false);
                  setKind("none");
                }}
              >
                再挑戦
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  resetRun(g, true);
                  setKind("title");
                }}
              >
                タイトルへ
              </button>
            </div>
          </div>
        )}
        {kind === "paused" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel">
              <div className="ribbon">休止</div>
              <button
                type="button"
                className="cta"
                onClick={() => {
                  setMode(g, "playing");
                  setKind("none");
                }}
              >
                再開
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`debug-toggle${debug ? " on" : ""}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            const game = gameRef.current;
            if (!game) return;
            game.debug = !game.debug;
            setDebug(game.debug);
          }}
        >
          デバッグ {debug ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

function overlayOf(g: Game): OverlayKind {
  if (g.mode === "title") return "title";
  if (g.mode === "weapon") return "weapon";
  if (g.mode === "buff") return "buff";
  if (g.mode === "route") return "route";
  if (g.mode === "fail") return "fail";
  if (g.mode === "paused") return "paused";
  return "none";
}
