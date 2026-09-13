import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [{ title: "ログイン · 怨霊円陣" }],
  }),
});

function Login() {
  return (
    <main className="terms-page">
      <p className="display-sub">ONRYO RING</p>
      <h1 className="display-title">ログイン</h1>
      <p className="overlay-copy">Google で進捗を雲に置く。別の端末でも同じ円陣から始められる。</p>
      {authEnabled ? (
        <div className="login-actions">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              className={p.idp === "google" ? "cta" : "ghost-btn"}
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
            >
              {p.idp === "google" ? "Google で続ける" : `${p.label} で続ける`}
            </button>
          ))}
        </div>
      ) : (
        <p className="shop-hint">いまはログインできません。</p>
      )}
      <Link to="/" className="ghost-btn terms-back">
        円陣へ戻る
      </Link>
    </main>
  );
}
