/*
  部屋の文言と並び。接続・在庫・電文は GameView。
  ここは Game も P2PRoom も受け取らない。客が主催の選択を押せるかは親が決める。
*/
export function RoomBox({
  seat,
  code,
  connected,
  draft,
  note,
  onDraft,
  onJoin,
  onOpen,
  onLeave,
}: {
  seat: "off" | "host";
  code: string;
  connected: number;
  draft: string;
  note: string;
  onDraft: (value: string) => void;
  onJoin: () => void;
  onOpen: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="room-box stagger">
      {seat === "host" ? (
        <>
          <p className="room-code">{code}</p>
          <p className="shop-hint">つながっている客 {connected}</p>
          <button type="button" className="ghost-btn" onClick={onLeave}>
            部屋を閉じる
          </button>
        </>
      ) : (
        <>
          <div className="room-row">
            <input
              className="room-input"
              value={draft}
              maxLength={12}
              autoCapitalize="characters"
              aria-label="合い言葉"
              placeholder="合い言葉"
              onChange={(e) => onDraft(e.target.value.toUpperCase())}
            />
            <button type="button" className="ghost-btn" onClick={onJoin}>
              入る
            </button>
          </div>
          <button type="button" className="ghost-btn" onClick={onOpen}>
            部屋をひらく
          </button>
          {note ? <p className="shop-hint">{note}</p> : null}
        </>
      )}
    </div>
  );
}

export function GuestWait({
  code,
  hostLinked,
  phase,
  onLeave,
}: {
  code: string;
  hostLinked: boolean;
  phase: "title" | "watch";
  onLeave: () => void;
}) {
  return (
    <div className="overlay-scrim">
      <div className="overlay-panel enter">
        <div className="display-sub stagger">GUEST</div>
        <h1 className="display-title stagger">客神だけ</h1>
        <p className="room-code stagger">{code}</p>
        <p className="shop-hint stagger">{hostLinked ? "主催とつながっています" : "主催を待っています"}</p>
        <p className="shop-hint stagger">
          {phase === "title" ? "主催が挑戦を始めると、円陣が動きます。" : "主催の画面を見ています。"}
        </p>
        <button type="button" className="ghost-btn stagger" onClick={onLeave}>
          部屋を出る
        </button>
      </div>
    </div>
  );
}

export function GuestBar({ linked, code, onLeave }: { linked: boolean; code: string; onLeave: () => void }) {
  return (
    <div className="guest-bar">
      <span>{linked ? `客 ${code}` : "主催を待っています"}</span>
      <button type="button" onClick={onLeave}>
        出る
      </button>
    </div>
  );
}

export function RoomOpened({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <div className="overlay-scrim is-modal room-help">
      <div className="overlay-panel enter">
        <p className="room-code">{code}</p>
        <p className="overlay-copy">
          この4文字を客に伝えてください。客は客神を空マスへ置き、置いた客神と札を使えます。式神の移動や休止は主催だけです。
        </p>
        <button type="button" className="cta" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}

export function RoomChip({ code }: { code: string }) {
  return <p className="room-chip">部屋 {code}</p>;
}
