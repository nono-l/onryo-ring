import type { Game } from "./types";
import type { DebugField } from "./sim";
import { debugNudge, debugOpenBuff, debugOpenRoute, debugOpenWeapon, debugUnlockAll, setDebugMode } from "./sim";

const ROWS: Array<{ id: DebugField; label: string; fmt: (g: Game) => string }> = [
  { id: "bank", label: "所持両", fmt: (g) => String(g.bank) },
  { id: "shopAtk", label: "店・攻撃Lv", fmt: (g) => String(g.shop.atk) },
  { id: "shopSpd", label: "店・速度Lv", fmt: (g) => String(g.shop.spd) },
  { id: "shopCoin", label: "店・開始両Lv", fmt: (g) => String(g.shop.coin) },
  { id: "coins", label: "ランの両", fmt: (g) => String(g.coins) },
  { id: "wave", label: "WAVE", fmt: (g) => String(g.wave) },
  { id: "highWave", label: "最高WAVE", fmt: (g) => String(g.highWave) },
  { id: "processed", label: "処理数", fmt: (g) => String(g.processed) },
  { id: "goldKills", label: "金皿撃破", fmt: (g) => String(g.goldKills) },
  { id: "bossHp", label: "花魁HP", fmt: (g) => String(Math.round(g.boss.hp)) },
  { id: "track", label: "花魁位置", fmt: (g) => g.boss.track.toFixed(2) },
  { id: "atkMul", label: "攻撃倍率", fmt: (g) => `×${g.atkMul.toFixed(2)}` },
  { id: "spdMul", label: "速度倍率", fmt: (g) => `×${g.spdMul.toFixed(2)}` },
  { id: "twin", label: "口寄せ札", fmt: (g) => `+${g.twinSummon}` },
];

const LIVE: Array<{ id: DebugField; label: string; fmt: (g: Game) => string }> = [
  { id: "bossHp", label: "花魁HP", fmt: (g) => String(Math.round(g.boss.hp)) },
  { id: "track", label: "位置", fmt: (g) => g.boss.track.toFixed(2) },
  { id: "wave", label: "WAVE", fmt: (g) => String(g.wave) },
  { id: "processed", label: "処理", fmt: (g) => String(g.processed) },
];

export function SettingsPanel({
  g,
  onClose,
  onChange,
}: {
  g: Game;
  onClose: () => void;
  onChange: () => void;
}) {
  const bump = (id: DebugField, dir: 1 | -1) => {
    debugNudge(g, id, dir);
    onChange();
  };
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter shop-panel">
        <div className="ribbon stagger">設定</div>
        <p className="shop-hint stagger">開発中。誰でもデバッグを付けられます。</p>
        <button
          type="button"
          className={`debug-switch stagger${g.debug ? " on" : ""}`}
          onClick={() => {
            setDebugMode(g, !g.debug);
            onChange();
          }}
        >
          デバッグ {g.debug ? "ON" : "OFF"}
        </button>
        {g.debug && (
          <>
            <p className="shop-hint">ヒットボックスを出し、数値を増減できます。</p>
            <div className="shop-list debug-list">
              {ROWS.map((row) => (
                <div key={row.id} className="debug-row">
                  <div className="shop-copy">
                    <div className="nm">{row.label}</div>
                    <div className="lv">{row.fmt(g)}</div>
                  </div>
                  <div className="debug-step">
                    <button type="button" onClick={() => bump(row.id, -1)} aria-label="減らす">
                      −
                    </button>
                    <button type="button" onClick={() => bump(row.id, 1)} aria-label="増やす">
                      ＋
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="debug-actions">
              <button type="button" className="ghost-btn" onClick={() => { debugUnlockAll(g); onChange(); }}>
                式神を全解禁
              </button>
              <button type="button" className="ghost-btn" onClick={() => { debugOpenWeapon(g); onClose(); onChange(); }}>
                武器3択
              </button>
              <button type="button" className="ghost-btn" onClick={() => { debugOpenRoute(g); onClose(); onChange(); }}>
                上級の道
              </button>
              <button type="button" className="ghost-btn" onClick={() => { debugOpenBuff(g); onClose(); onChange(); }}>
                金皿3択
              </button>
            </div>
          </>
        )}
        <button type="button" className="ghost-btn stagger" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}

export function DebugDock({ g, onChange }: { g: Game; onChange: () => void }) {
  if (!g.debug) return null;
  return (
    <div className="debug-dock">
      {LIVE.map((row) => (
        <div key={row.id} className="debug-dock-row">
          <span>{row.label}</span>
          <button type="button" onClick={() => { debugNudge(g, row.id, -1); onChange(); }}>−</button>
          <b>{row.fmt(g)}</b>
          <button type="button" onClick={() => { debugNudge(g, row.id, 1); onChange(); }}>＋</button>
        </div>
      ))}
    </div>
  );
}
