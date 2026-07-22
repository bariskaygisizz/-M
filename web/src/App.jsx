import { useEffect, useState } from "react";
import {
  fetchFish,
  fetchMe,
  fetchMeta,
  health,
  login,
  register,
  clearSession,
  getCachedUser,
} from "./api";
import ScanView from "./components/ScanView.jsx";
import {
  FishCard,
  FishDetail,
  AuthPanel,
  Paywall,
  OceanSim,
} from "./components/FishUI.jsx";

const REGIONS = ["Tümü", "Karadeniz", "Marmara", "Ege", "Akdeniz", "Tatlı Su"];

export default function App() {
  const [tab, setTab] = useState("home");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("Tümü");
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(getCachedUser());
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [plans, setPlans] = useState([]);
  const [paywall, setPaywall] = useState(false);

  useEffect(() => {
    health().catch(() => {});
    fetchMeta()
      .then((m) => setPlans(m.plans || []))
      .catch(() => {});
    fetchMe().then((u) => setUser(u));
  }, []);

  useEffect(() => {
    if (tab !== "atlas" && tab !== "home") return;
    let alive = true;
    fetchFish({ q, region })
      .then((data) => {
        if (alive) setItems(data.items || []);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [tab, q, region]);

  const openFish = (fish) => {
    setSelected(fish);
    setTab("detail");
  };

  const onAuth = async (username, password) => {
    setAuthBusy(true);
    setAuthError("");
    try {
      const fn = authMode === "login" ? login : register;
      const json = await fn(username, password);
      setUser(json.user);
      setTab("home");
    } catch (err) {
      setAuthError(err.message || "Hata");
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          BALIK<span>ATLAS</span>
        </div>
        <nav className="nav">
          <button
            type="button"
            className={tab === "home" ? "active" : ""}
            onClick={() => setTab("home")}
          >
            Ana
          </button>
          <button
            type="button"
            className={tab === "scan" ? "active" : ""}
            onClick={() => setTab(user ? "scan" : "auth")}
          >
            AI Tara
          </button>
          <button
            type="button"
            className={tab === "atlas" || tab === "detail" ? "active" : ""}
            onClick={() => {
              setSelected(null);
              setTab("atlas");
            }}
          >
            Atlas
          </button>
          <button
            type="button"
            className={tab === "premium" ? "active" : ""}
            onClick={() => (user ? setPaywall(true) : setTab("auth"))}
          >
            Premium
          </button>
          <button
            type="button"
            className={tab === "auth" || tab === "account" ? "active" : ""}
            onClick={() => setTab(user ? "account" : "auth")}
          >
            {user ? user.username : "Giriş"}
          </button>
        </nav>
      </header>

      <main className="main">
        {tab === "home" && (
          <>
            <section className="hero">
              <OceanSim />
              <div className="hero-kicker">AI kamera · Balık atlası</div>
              <h1>BALIKATLAS</h1>
              <p>
                Kamerayla tara, balığı tanı. Bölge, sezon, kalori, neyle gider ve
                olası faydalar tek yerde.
              </p>
              <div className="cta-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setTab(user ? "scan" : "auth")}
                >
                  {user ? "Kamerayı Aç" : "Giriş / Kayıt"}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTab("atlas")}
                >
                  Balık Atlası
                </button>
                <button type="button" className="btn" onClick={() => setPaywall(true)}>
                  Abonelikler
                </button>
              </div>
              {user && (
                <div className="hud-chip">
                  @{user.username} · {user.plan}
                  {user.plan === "free" ? ` · kalan ${user.scansLeft}/${user.scanLimit}` : " · sınırsız"}
                </div>
              )}
            </section>

            <section style={{ marginTop: "1.25rem" }}>
              <h2 className="section-title">Öne çıkanlar</h2>
              <div className="grid">
                {items.slice(0, 4).map((f) => (
                  <FishCard key={f.id} fish={f} onOpen={openFish} />
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "scan" && user && (
          <ScanView
            onOpenFish={openFish}
            user={user}
            setUser={setUser}
            onPaywall={() => setPaywall(true)}
          />
        )}

        {tab === "atlas" && (
          <>
            <div className="toolbar">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Balık, bölge veya tür ara…"
              />
            </div>
            <div className="chips" style={{ marginBottom: "1rem" }}>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`chip ${region === r ? "active" : ""}`}
                  onClick={() => setRegion(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="meta" style={{ marginBottom: "0.8rem" }}>
              {items.length} kayıt
            </p>
            <div className="grid">
              {items.map((f) => (
                <FishCard key={f.id} fish={f} onOpen={openFish} />
              ))}
            </div>
          </>
        )}

        {tab === "detail" && selected && (
          <FishDetail fish={selected} onBack={() => setTab("atlas")} />
        )}

        {tab === "auth" && !user && (
          <AuthPanel
            mode={authMode}
            busy={authBusy}
            error={authError}
            onSubmit={onAuth}
            onSwitch={() =>
              setAuthMode((m) => (m === "login" ? "register" : "login"))
            }
          />
        )}

        {tab === "account" && user && (
          <div className="panel">
            <h2 className="section-title">Hesabım</h2>
            <p>
              Kullanıcı: <strong>@{user.username}</strong>
            </p>
            <p>
              Plan: <span className="meta">{user.plan}</span>
            </p>
            {user.premiumUntil && (
              <p className="muted">Premium bitiş: {new Date(user.premiumUntil).toLocaleString("tr-TR")}</p>
            )}
            {user.plan === "free" && (
              <p className="muted">
                Bugün kalan AI tarama: {user.scansLeft}/{user.scanLimit}
              </p>
            )}
            <div className="cta-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-primary" onClick={() => setPaywall(true)}>
                Premium Abonelikler
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  clearSession();
                  setUser(null);
                  setTab("auth");
                }}
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        )}
      </main>

      {paywall && user && (
        <Paywall
          plans={plans}
          user={user}
          onClose={() => setPaywall(false)}
        />
      )}

      <footer className="footer">
        © BalıkAtlas
        {user ? ` · @${user.username}` : ""}
      </footer>
    </div>
  );
}
