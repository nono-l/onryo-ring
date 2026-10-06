/*
  武器・道・敗北・休止の画面。選ぶ処理は親が渡す。
  客に出すかは親の seat。ここは席を見ない。
*/
import type { LessonStep, RouteOption, WeaponOption } from "./types";

const LESSON_LINE: Record<LessonStep, string> = {
  move: "お菊を動かしてみよう",
  break: "鞠を壊そう",
  merge: "お菊を重ねよう",
};

export function DangerWarn({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay-scrim is-modal">
      <div className="overlay-panel enter">
        <div className="ribbon">花魁が近い</div>
        <p className="overlay-copy">赤い線の先がゴールです。花魁がゴールへ着くと敗北です。</p>
        <p className="overlay-copy">手毬を壊すと式神が出て、花魁を押し戻せます。</p>
        <button type="button" className="cta" onClick={onClose}>
          わかった
        </button>
      </div>
    </div>
  );
}

export function LessonBar({ step, onSkip }: { step: LessonStep; onSkip: () => void }) {
  return (
    <div className="lesson-bar" role="status">
      <p>{LESSON_LINE[step]}</p>
      <button type="button" className="ghost-btn" onClick={onSkip}>
        スキップ
      </button>
    </div>
  );
}

export function WeaponOverlay({
  options,
  hexOnly,
  tick,
  onReveal,
  onPick,
}: {
  options: WeaponOption[];
  hexOnly: boolean;
  tick: number;
  onReveal: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter">
        <button type="button" className="weapon-hex-wrap" onClick={onReveal} aria-label="武器昇格">
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
            {options.map((o) => (
              <button
                key={o.id + tick}
                type="button"
                className="choice-card weapon-pick stagger"
                onClick={() => onPick(o.id)}
              >
                <span className="nm">{o.name}</span>
                <span className="st">{o.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RouteOverlay({
  options,
  tick,
  onPick,
}: {
  options: RouteOption[];
  tick: number;
  onPick: (index: number) => void;
}) {
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter">
        <div className="ribbon stagger">ルート選択</div>
        <div className="choice-row">
          {options.map((o, i) => (
            <button
              key={o.id + tick}
              type="button"
              className={`choice-card ${o.risk ? "risk" : "safe"} stagger`}
              onClick={() => onPick(i)}
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
  );
}

export function ClearOverlay({
  wave,
  coins,
  marks,
  onContinue,
  onCashOut,
}: {
  wave: number;
  coins: number;
  marks: number;
  onContinue: () => void;
  onCashOut: () => void;
}) {
  return (
    <div className="overlay-scrim is-modal">
      <div className="overlay-panel enter">
        <div className="ribbon">花魁を倒した</div>
        <p className="stat-line">WAVE {wave}</p>
        <p className="overlay-copy">続けるか、ここまでの報酬を確定してタイトルに戻ります。</p>
        {coins > 0 && <p className="shop-gain">確定すると両 +{coins}</p>}
        {marks > 0 && <p className="shop-gain">確定すると華 +{marks}</p>}
        <button type="button" className="cta" onClick={onContinue}>
          続ける
        </button>
        <button type="button" className="ghost-btn" onClick={onCashOut}>
          報酬を確定してタイトルへ
        </button>
      </div>
    </div>
  );
}

export function FailOverlay({
  wave,
  power,
  earned,
  marks,
  offerManual,
  manualOn,
  onManual,
  onRetry,
  onShop,
  onTitle,
  onCodex,
}: {
  wave: number;
  power: number;
  earned: number;
  marks: number;
  offerManual: boolean;
  manualOn: boolean;
  onManual: () => void;
  onRetry: () => void;
  onShop: () => void;
  onTitle: () => void;
  onCodex: () => void;
}) {
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter">
        <div className="fail-mark stagger">挑戦失敗</div>
        <p className="stat-line stagger">
          WAVE {wave}　戦闘力 {power}
        </p>
        <p className="overlay-copy stagger">花魁がゴールへ流れ着いた。円陣は破れた。</p>
        {earned > 0 && <p className="shop-gain stagger">獲得両 +{earned}</p>}
        {marks > 0 && <p className="shop-gain stagger">獲得華 +{marks}</p>}
        {offerManual && (
          <div className="fail-manual stagger">
            <p className="fail-manual-kicker">マニュアルにできます</p>
            <p className="fail-manual-copy">式神を掴んでいるあいだ、円陣が止まります。</p>
            <button type="button" className="cta" onClick={onManual}>
              マニュアルにする
            </button>
          </div>
        )}
        {manualOn && (
          <div className="fail-manual stagger">
            <p className="fail-manual-kicker">マニュアルにしました</p>
            <p className="fail-manual-copy">再挑戦から、動かしている間は止まります。</p>
          </div>
        )}
        <button type="button" className="cta stagger" onClick={onRetry}>
          再挑戦
        </button>
        <button type="button" className="ghost-btn stagger" onClick={onShop}>
          式神強化へ
        </button>
        <button type="button" className="ghost-btn stagger" onClick={onTitle}>
          タイトルへ
        </button>
        <button type="button" className="ghost-btn stagger" onClick={onCodex}>
          図鑑
        </button>
      </div>
    </div>
  );
}

export function PauseOverlay({
  onResume,
  onTitle,
  onCodex,
}: {
  onResume: () => void;
  onTitle: () => void;
  onCodex: () => void;
}) {
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter">
        <div className="ribbon stagger">休止</div>
        <p className="overlay-copy stagger">円陣は止まっている。</p>
        <button type="button" className="cta stagger" onClick={onResume}>
          再開
        </button>
        <button type="button" className="ghost-btn stagger" onClick={onTitle}>
          タイトルへ
        </button>
        <button type="button" className="ghost-btn stagger" onClick={onCodex}>
          図鑑
        </button>
      </div>
    </div>
  );
}

export function PauseButton({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="hud-icon pause"
      aria-label={paused ? "再開" : "休止"}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {paused ? "再開" : "休止"}
    </button>
  );
}
