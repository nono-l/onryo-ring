import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [{ title: "配信規約 / プレイポリシー · 怨霊円陣" }],
  }),
});

function TermsPage() {
  return (
    <main className="terms-page">
      <p className="display-sub">ONRYO RING</p>
      <h1 className="display-title">配信規約</h1>
      <p className="terms-en">Streaming terms · Play policy</p>
      <p className="overlay-copy">円陣を外へ運ぶ契約です。許可は短い。条件はひとつです。</p>

      <section>
        <h2>Condition</h2>
        <p>
          名前を付ける。タイトル <strong>怨霊円陣 / ONRYO RING</strong> が画面か説明文のどこかにあれば、円陣の外へ出してよい。配信、収録、切り抜き、再編集、再投稿、公開、アーカイブを含む。回数も長さも問わない。名前があるから、誰の実況かが分かる。名前のないまま外へ出すのは仕様外で、許可しない。
        </p>
      </section>

      <section>
        <h2>Not asked</h2>
        <p>
          プラットフォームは問わない。個人か会社かも問わない。収益も、有料か無料も、人数も問わない。事前連絡はいらない。収益分配もない。許可を乞う手紙もいらない。
        </p>
      </section>

      <section>
        <h2>Fine to leave in</h2>
        <p>
          円陣の画面、式神の名前、手毬、花魁、寿司レーン、デバッグ表示。隠し立てしなくてよい。この契約を画面に出す必要もない。出してもよい。ロゴもいらない。
        </p>
      </section>

      <section>
        <h2>Not required</h2>
        <p>
          このゲームを、別の商用作品の複製として名乗ってはいけない。入り口そのもの（ソースや配布物）を、名前なしで自分の作品として配ってはいけない。遊びは旅してよい。箱そのものを無名のコピーとして渡してはいけない。
        </p>
      </section>

      <p className="terms-close">円陣は税ではない。名前が台帳になる。名のある実況は、夜へ出てよい。</p>
      <Link to="/" className="ghost-btn terms-back">
        円陣へ戻る
      </Link>
    </main>
  );
}
