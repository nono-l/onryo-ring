import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadCloudSave, putCloudSave } from "@/server/saves";
import { SHOP_ITEMS, SHOP_T2_ITEMS, SHOP_T3_ITEMS, SHOP_T3_SPEND, VH, VW, shopCost, shopMax, shopT1Maxed, shopT2Spent, shopT3Open, shopValue } from "./data";
import { draw, loadAssets } from "./draw";
import {
  applyMeta,
  buyShop,
  chooseRoute,
  chooseWeapon,
  createGame,
  debugNudge,
  mergeMeta,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resetRun,
  setCloudFlush,
  setMode,
  snapshotMeta,
  step,
} from "./sim";
import { DebugDock, SettingsPanel } from "./DebugPanel";
import type { Game, ShopId } from "./types";
import type { DebugField } from "./sim";
import * as audio from "./audio";

type OverlayKind = "title" | "none" | "weapon" | "route" | "buff" | "fail" | "paused";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [kind, setKind] = useState<OverlayKind>("title");
  const [tick, setTick] = useState(0);
  const [hexOnly, setHexOnly] = useState(true);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAssets().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const game = createGame({ demo: true });
    gameRef.current = game;
    audio.setMuted(game.muted);
    setMuted(game.muted);

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
      if (document.visibilityState === "visible") {
        audio.resumeIfNeeded();
        return;
      }
      if (game.mode === "playing") {
        setMode(game, "paused");
        setKind("paused");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        game.muted = !game.muted;
        audio.setMuted(game.muted);
        setMuted(game.muted);
        return;
      }
      if (e.key === "Escape") {
        if (game.mode === "playing") {
          setMode(game, "paused");
          setKind("paused");
        } else if (game.mode === "paused") {
          setMode(game, "playing");
          setKind("none");
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", fit);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setCloudFlush(null);
      return;
    }
    let alive = true;
    let timer: number | null = null;
    void loadCloudSave()
      .then((remote) => {
        if (!alive) return;
        const game = gameRef.current;
        if (!game) return;
        const local = snapshotMeta(game);
        const merged = remote
          ? mergeMeta(local, {
              highWave: remote.highWave,
              bank: remote.bank,
              shop: remote.shop,
            })
          : local;
        applyMeta(game, merged);
        setTick((n) => n + 1);
        return putCloudSave({
          data: {
            highWave: merged.highWave,
            bank: merged.bank,
            shop: merged.shop,
          },
        });
      })
      .catch(() => undefined);
    setCloudFlush((m) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void putCloudSave({
          data: {
            highWave: m.highWave,
            bank: m.bank,
            shop: m.shop,
          },
        }).catch(() => undefined);
      }, 450);
    });
    return () => {
      alive = false;
      setCloudFlush(null);
      if (timer) window.clearTimeout(timer);
    };
  }, [user, isPending]);

  useEffect(() => {
    if (kind !== "weapon") return;
    setHexOnly(true);
    const t = window.setTimeout(() => setHexOnly(false), 1150);
    return () => window.clearTimeout(t);
  }, [kind, tick]);

  const toggleMute = () => {
    const g = gameRef.current;
    if (!g) return;
    g.muted = !g.muted;
    audio.setMuted(g.muted);
    setMuted(g.muted);
  };

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
    if (!g || !ready) return;
    audio.unlockAudio();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = toLocal(e);
    if (g.mode === "playing" || g.mode === "buff") onPointerDown(g, p.x, p.y);
    setMuted(g.muted);
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
    if (!g || !ready) return;
    audio.unlockAudio();
    resetRun(g, false);
    setShopOpen(false);
    setSettingsOpen(false);
    setKind("none");
  };

  const g = gameRef.current;
  const showPlayHud = kind === "none" || kind === "paused";

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
        {(kind === "title" || kind === "fail") && (
          <AuthSlot isPending={isPending} signedIn={!!user} />
        )}
        {kind === "title" && shopOpen && g && (
          <div className="overlay-scrim is-shop">
            <div className="overlay-panel enter shop-panel">
              <div className="shop-head">
                <div className="ribbon stagger">基礎強化</div>
                {g.lastEarned > 0 && <p className="shop-gain stagger">今回獲得 +{g.lastEarned} 両</p>}
                <p className="shop-bank stagger">
                  所持両 <strong>{g.bank}</strong>
                  {g.debug && (
                    <span className="debug-step inline">
                      <button type="button" onClick={() => { debugNudge(g, "bank", -1); setTick((n) => n + 1); }}>−</button>
                      <button type="button" onClick={() => { debugNudge(g, "bank", 1); setTick((n) => n + 1); }}>＋</button>
                    </span>
                  )}
                </p>
                {g.bank <= 0 && g.lastEarned <= 0 && (
                  <p className="shop-hint stagger">両がありません。ランで稼ぐと強化できます。</p>
                )}
              </div>
              <div className="shop-scroll">
                <div className="shop-list">
                  {SHOP_ITEMS.map((item) => (
                    <ShopRow key={item.id} g={g} id={item.id} name={item.name} desc={item.desc} onChange={() => setTick((n) => n + 1)} />
                  ))}
                </div>
                {(shopT1Maxed(g.shop) || g.debug) && (
                  <>
                    <div className="ribbon">二の強化</div>
                    <p className="shop-hint">
                      消費 {shopT2Spent(g.shop).toLocaleString("ja-JP")} / {SHOP_T3_SPEND.toLocaleString("ja-JP")} 両。全部 Lv.2 以上で三の強化。
                    </p>
                    <div className="shop-list">
                      {SHOP_T2_ITEMS.map((item) => (
                        <ShopRow key={item.id} g={g} id={item.id} name={item.name} desc={item.desc} onChange={() => setTick((n) => n + 1)} />
                      ))}
                    </div>
                  </>
                )}
                {(shopT3Open(g.shop) || g.debug) && (
                  <>
                    <div className="ribbon">三の強化</div>
                    <p className="shop-hint">口寄せ・押し戻し・輪刃。</p>
                    <div className="shop-list">
                      {SHOP_T3_ITEMS.map((item) => (
                        <ShopRow key={item.id} g={g} id={item.id} name={item.name} desc={item.desc} onChange={() => setTick((n) => n + 1)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="shop-foot">
                <button type="button" className="cta stagger" onClick={start} disabled={!ready}>
                  次の挑戦
                </button>
                <button type="button" className="ghost-btn stagger" onClick={() => setShopOpen(false)}>
                  タイトルへ
                </button>
              </div>
            </div>
          </div>
        )}
        {kind === "title" && !shopOpen && (
          <div className="overlay-scrim">
            <div className="overlay-panel enter">
              <div className="display-sub stagger">ONRYO RING</div>
              <h1 className="display-title stagger">怨霊円陣</h1>
              <p className="overlay-copy stagger">
                手前の手毬を壊すと式神が召喚される。
                花魁は回転寿司のレーンをゴールへ進む。
              </p>
              <p className="how-to stagger">
                皿は途切れず、8分は流れ続ける。金皿のあとほど硬い
                <br />
                金皿を崩すとパワーアップ３択。ゴールへ着くと敗北
              </p>
              <button type="button" className="cta stagger" onClick={start} disabled={!ready}>
                {ready ? "挑戦する" : "読み込み中"}
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => setShopOpen(true)}
              >
                式神強化
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => setSettingsOpen(true)}
              >
                設定
              </button>
              {!ready && <p className="shimmer stagger">式神を呼び出しています</p>}
              <p className="stat-line stagger">
                {g && g.highWave > 0 ? `最高記録 WAVE ${g.highWave}` : "まだ記録なし"}
              </p>
              <p className="shop-bank stagger">
                所持両 <strong>{g?.bank ?? 0}</strong>
                {g && (g.shop.atk > 0 || g.shop.spd > 0 || g.shop.coin > 0) ? (
                  <>
                    <br />
                    攻撃 Lv.{g.shop.atk} ／ 速度 Lv.{g.shop.spd} ／ 両 Lv.{g.shop.coin}
                    {shopT1Maxed(g.shop) ? (
                      <>
                        <br />
                        二人目 {g.shop.okiku} ／ 道 {g.shop.path} ／ 基礎 {g.shop.base}
                      </>
                    ) : null}
                    {shopT3Open(g.shop) ? (
                      <>
                        <br />
                        口寄せ {g.shop.seed} ／ 押し戻し {g.shop.back} ／ 輪刃 {g.shop.arms}
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <br />
                    <span className="shop-hint">円陣を守ると両が貯まる。店で次の挑戦が有利になる。</span>
                  </>
                )}
              </p>
              <div className="title-links stagger">
                <a href="/how" className="terms-link">
                  遊び方
                </a>
                <a href="/terms" className="terms-link">
                  配信規約
                </a>
              </div>
            </div>
          </div>
        )}
        {kind === "weapon" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel enter">
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
                <div className="weapon-picks enter">
                  {g.weaponOptions.map((o) => (
                    <button
                      key={o.id + tick}
                      type="button"
                      className="choice-card weapon-pick stagger"
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
            <div className="overlay-panel enter">
              <div className="ribbon stagger">ルート選択</div>
              <div className="choice-row">
                {g.routeOptions.map((o, i) => (
                  <button
                    key={o.id + tick}
                    type="button"
                    className={`choice-card stagger ${o.risk ? "risk" : "safe"}`}
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
            <div className="overlay-panel enter">
              <div className="fail-mark stagger">挑戦失敗</div>
              <p className="stat-line stagger">
                WAVE {g.wave}　戦闘力 {g.combatPower}
              </p>
              <p className="overlay-copy stagger">花魁がゴールへ流れ着いた。円陣は破れた。</p>
              {g.lastEarned > 0 && (
                <p className="shop-gain stagger">獲得両 +{g.lastEarned}</p>
              )}
              <button
                type="button"
                className="cta stagger"
                onClick={() => {
                  audio.unlockAudio();
                  resetRun(g, false);
                  setShopOpen(false);
                  setKind("none");
                }}
              >
                再挑戦
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => {
                  resetRun(g, true);
                  setShopOpen(true);
                  setKind("title");
                }}
              >
                式神強化へ
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => {
                  resetRun(g, true);
                  setShopOpen(false);
                  setKind("title");
                }}
              >
                タイトルへ
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => setSettingsOpen(true)}
              >
                設定
              </button>
            </div>
          </div>
        )}
        {kind === "paused" && g && (
          <div className="overlay-scrim">
            <div className="overlay-panel enter">
              <div className="ribbon stagger">休止</div>
              <p className="overlay-copy stagger">円陣は止まっている。</p>
              <button
                type="button"
                className="cta stagger"
                onClick={() => {
                  setMode(g, "playing");
                  setKind("none");
                }}
              >
                再開
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => {
                  resetRun(g, true);
                  setKind("title");
                }}
              >
                タイトルへ
              </button>
              <button
                type="button"
                className="ghost-btn stagger"
                onClick={() => setSettingsOpen(true)}
              >
                設定
              </button>
            </div>
          </div>
        )}
        {showPlayHud && ready && (
          <button
            type="button"
            className="hud-icon pause"
            aria-label={kind === "paused" ? "再開" : "休止"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const game = gameRef.current;
              if (!game) return;
              if (game.mode === "playing") {
                setMode(game, "paused");
                setKind("paused");
              } else if (game.mode === "paused") {
                setMode(game, "playing");
                setKind("none");
              }
            }}
          >
            {kind === "paused" ? "再開" : "休止"}
          </button>
        )}
        {showPlayHud && g && <DebugDock g={g} onChange={() => setTick((n) => n + 1)} />}
        <button
          type="button"
          className={`hud-icon mute${muted ? " on" : ""}`}
          aria-label={muted ? "音声オン" : "消音"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            audio.unlockAudio();
            toggleMute();
          }}
        >
          {muted ? "消音" : "音声"}
        </button>
        {settingsOpen && g && (
          <SettingsPanel
            g={g}
            onClose={() => setSettingsOpen(false)}
            onChange={() => {
              setTick((n) => n + 1);
            }}
          />
        )}
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

function AuthSlot({ isPending, signedIn }: { isPending: boolean; signedIn: boolean }) {
  if (isPending) {
    return <div className="auth-slot auth-skel" aria-hidden />;
  }
  if (signedIn) {
    return (
      <div className="auth-slot">
        <UserButton />
      </div>
    );
  }
  return (
    <Link to="/login" className="auth-slot auth-login">
      Googleで保存
    </Link>
  );
}

const SHOP_DEBUG_FIELD: Record<ShopId, DebugField> = {
  atk: "shopAtk",
  spd: "shopSpd",
  coin: "shopCoin",
  okiku: "shopOkiku",
  path: "shopPath",
  base: "shopBase",
  seed: "shopSeed",
  back: "shopBack",
  arms: "shopArms",
};

function ShopRow({
  g,
  id,
  name,
  desc,
  onChange,
}: {
  g: Game;
  id: ShopId;
  name: string;
  desc: string;
  onChange: () => void;
}) {
  const lv = g.shop[id] ?? 0;
  const maxed = lv >= shopMax(id);
  const cost = shopCost(id, lv);
  const can = !maxed && g.bank >= cost;
  const field = SHOP_DEBUG_FIELD[id];
  return (
    <div className="shop-row stagger">
      <div className="shop-copy">
        <div className="nm">{name}</div>
        <div className="lv">
          Lv.{lv} → 現在 {shopValue(id, lv)}
        </div>
        <div className="st">{desc}</div>
      </div>
      <button
        type="button"
        className="shop-buy"
        disabled={!can}
        onClick={() => {
          if (buyShop(g, id)) onChange();
        }}
      >
        {maxed ? "最大" : `${cost} 両`}
      </button>
      {g.debug && (
        <div className="debug-step">
          <button type="button" onClick={() => { debugNudge(g, field, -1); onChange(); }}>−</button>
          <button type="button" onClick={() => { debugNudge(g, field, 1); onChange(); }}>＋</button>
        </div>
      )}
    </div>
  );
}
