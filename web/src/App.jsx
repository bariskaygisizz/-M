import { useEffect, useState } from "react";
import { fetchFish, health } from "./api";
import ScanView from "./components/ScanView.jsx";
import { FishCard, FishDetail } from "./components/FishUI.jsx";

const REGIONS = ["Tümü", "Karadeniz", "Marmara", "Ege", "Akdeniz", "Tatlı Su"];

export default function App() {
  const [tab, setTab] = useState("home");
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("Tümü");
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    health()
      .then(setStatus)
      .catch(() => setStatus({ ok: false }));
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
            onClick={() => setTab("scan")}
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
        </nav>
      </header>

      <main className="main">
        {tab === "home" && (
          <>
            <section className="hero">
              <div className="hero-kicker">AI · Kamera · Canlı Rehber</div>
              <h1>BALIKATLAS</h1>
              <p>
                Kamerayla tara, balığı tanı. Tür, ağırlık, bölge, kalori, fayda
                ve zararları tek ekranda — istanbulasim tarzı modern arayüz.
              </p>
              <div className="cta-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setTab("scan")}
                >
                  Kamerayı Aç
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTab("atlas")}
                >
                  Balık Atlası
                </button>
              </div>
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

        {tab === "scan" && <ScanView onOpenFish={openFish} />}

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
      </main>

      <footer className="footer">
        API {status?.ok ? "online" : "offline"}
        {status?.fishCount != null ? ` · ${status.fishCount} balık` : ""}
        {status?.vision ? " · vision aktif" : " · yerel AI"} · Bilgilendirme
        amaçlıdır
      </footer>
    </div>
  );
}
