/*
  タイトルのガチャ画面。中身と支払いは gacha.ts。
  挑戦中には出さない。タイトルに引くボタンを戻すな。
*/
import { useState } from "react";
import { GACHA_COST, GACHA_MULTI_COST, GUEST_CARD_MAX, GUEST_CARDS, GUEST_KINDS, HEROES, guestGrowthOf, guestKind, guestSlipCost } from "./data";
import { pullGacha, pullGachaMulti, type GachaPull } from "./gacha";
import { buyGuest } from "./guests";
import type { Game, HeroId } from "./types";

export function GachaPanel({
  g,
  onChange,
  onTitle,
}: {
  g: Game;
  onChange: () => void;
  onTitle: () => void;
}) {
  const [pick, setPick] = useState<HeroId>(GUEST_KINDS[0]!.id);
  const [last, setLast] = useState<GachaPull[]>([]);
  const row = guestGrowthOf(g.guestGrowth, pick);
  const canOne = g.markBank >= GACHA_COST;
  const canMulti = g.markBank >= GACHA_MULTI_COST;
  const stock = g.guestStock[pick] ?? 0;
  const kind = guestKind(pick);
  const price = kind ? guestSlipCost(kind, stock) : 0;
  const stockMaxed = stock >= (kind?.max ?? 0);
  return (
    <div className="overlay-scrim is-shop">
      <div className="overlay-panel enter shop-panel">
        <div className="shop-head">
          <div className="ribbon stagger">客神ガチャ</div>
          <p className="shop-bank stagger">
            華 <strong>{g.markBank}</strong>
            　所持両 <strong>{g.bank}</strong>
          </p>
          <p className="shop-hint">客神を選んで引く。在庫は札だけ。最初の1体は3枚、次から3倍。</p>
        </div>
        <div className="shop-scroll">
          <div className="gacha-picks">
            {GUEST_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                className={`gacha-pick${pick === k.id ? " on" : ""}`}
                onClick={() => {
                  setPick(k.id);
                  setLast([]);
                }}
              >
                <img src={`/assets/${k.id}.png`} alt="" width={48} height={48} />
                <span>{HEROES[k.id].name}</span>
              </button>
            ))}
          </div>
          <p className="shop-hint">
            {GUEST_CARDS.map((c) => `${c.name} ${row[c.id]}/${GUEST_CARD_MAX}`).join("　")}
            <br />
            封 {row.seal}/3　客神札 {row.slips}
          </p>
          {last.length > 0 && (
            <ul className="gacha-results">
              {last.map((hit, i) => (
                <li key={i}>{pullText(HEROES[pick].name, hit)}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="ghost-btn"
            disabled={stockMaxed || row.slips < price}
            onClick={() => {
              if (buyGuest(g, pick)) onChange();
            }}
          >
            {stockMaxed ? "在庫は最大" : `客神札${price}で在庫を増やす　いま ${stock}`}
          </button>
          <button
            type="button"
            className="cta"
            disabled={!canOne}
            onClick={() => {
              const got = pullGacha(g, pick);
              if (!got) return;
              setLast(got);
              onChange();
            }}
          >
            {canOne ? `1回　${GACHA_COST}華` : `華が足りません　${GACHA_COST}華`}
          </button>
          <button
            type="button"
            className="cta"
            disabled={!canMulti}
            onClick={() => {
              const got = pullGachaMulti(g, pick);
              if (!got) return;
              setLast(got);
              onChange();
            }}
          >
            {canMulti ? `11連　${GACHA_MULTI_COST}華　客神札1枚保証` : `華が足りません　${GACHA_MULTI_COST}華`}
          </button>
          <button type="button" className="ghost-btn" onClick={onTitle}>
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  );
}

function pullText(name: string, hit: GachaPull): string {
  if (hit.kind === "card") return `${name}の${hit.name}　${hit.lv}`;
  if (hit.kind === "slip") return `${name}の客神札　+${hit.n}${hit.guaranteed ? "　保証" : ""}　いま ${hit.total}`;
  if (hit.kind === "coins") return `端両　+${hit.n}`;
  if (hit.kind === "marks") return `花びら　華 +${hit.n}`;
  return hit.bonus ? `封　${hit.bonus}` : `封　${hit.n}/3`;
}
