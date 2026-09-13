import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [{ title: "保存 · 怨霊円陣" }],
  }),
});

function Login() {
  return (
    <main className="terms-page">
      <p className="display-sub">ONRYO RING</p>
      <h1 className="display-title">保存</h1>
      <p className="terms-en">Keep the ring across devices</p>
      <p className="overlay-copy">Google で入れると、両と店の強化が別の端末でも続きます。</p>
      {authEnabled ? (
        <div className="debug-actions">
          {GROK_PROVIDERS.filter((p) => p.idp === "google").map((p) => (
            <button
              key={p.providerId}
              type="button"
              className="cta"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              Googleで保存
            </button>
          ))}
        </div>
      ) : (
        <p className="shop-hint">いまは端末の中だけ残ります。</p>
      )}
      <Link to="/" className="ghost-btn terms-back">
        円陣へ戻る
      </Link>
    </main>
  );
}
