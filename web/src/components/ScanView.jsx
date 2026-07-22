import { useEffect, useRef, useState } from "react";
import { identifyImage, fetchFish } from "../api";
import { StatGrid } from "./FishUI";

export default function ScanView({ onOpenFish, user, setUser, onPaywall }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [catalog, setCatalog] = useState([]);

  useEffect(() => {
    fetchFish()
      .then((d) => setCatalog(d.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        setError(
          "Kamera açılamadı. Tarayıcı izni verin veya galeriden fotoğraf yükleyin."
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const captureBlob = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) throw new Error("Kamera hazır değil");
    const w = video.videoWidth || 960;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // Merkez kareyi kırp — arka plan gürültüsünü azaltır
    const side = Math.min(w, h) * 0.78;
    const sx = (w - side) / 2;
    const sy = (h - side) / 2;
    canvas.width = 512;
    canvas.height = 512;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, 512, 512);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    return blob;
  };

  const runIdentify = async (blob) => {
    setBusy(true);
    setError("");
    setResult(null);
    setSelected(null);
    try {
      const json = await identifyImage(blob);
      setResult(json);
      if (json.user) setUser?.(json.user);
      if (json.match && !json.needsConfirm && json.isFish !== false) {
        setSelected(json.match);
      }
    } catch (err) {
      if (err.paywall || err.code === "LIMIT") {
        if (err.user) setUser?.(err.user);
        setError(err.message || "Tarama hakkın bitti");
        onPaywall?.();
      } else {
        setError(err.message || "Tanıma başarısız");
      }
    } finally {
      setBusy(false);
    }
  };

  const onScan = async () => {
    try {
      const blob = await captureBlob();
      await runIdentify(blob);
    } catch (err) {
      setError(err.message || "Çekim başarısız");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    await runIdentify(file);
  };

  const pickCandidate = (id) => {
    const fromAlt = result?.alternatives?.find((a) => a.id === id);
    const fromMatch = result?.match?.id === id ? result.match : null;
    const fromCat = catalog.find((f) => f.id === id);
    const fish = fromMatch || fromCat;
    if (fish) setSelected(fish);
    else if (fromAlt && fromCat) setSelected(fromCat);
  };

  const candidates = [];
  if (result?.match) {
    candidates.push({
      id: result.match.id,
      name: result.match.name,
      confidence: result.confidence,
    });
  }
  for (const a of result?.alternatives || []) {
    if (!candidates.some((c) => c.id === a.id)) candidates.push(a);
  }

  return (
    <div className="scan-layout">
      <div>
        <div className="viewport">
          {preview ? (
            <img src={preview} alt="Tarama önizleme" />
          ) : (
            <video ref={videoRef} playsInline muted />
          )}
          <div className="scan-frame" />
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <p className="meta" style={{ marginTop: 8 }}>
          İpucu: Balığı çerçeveye doldur, ışık bol olsun, tek balık çek.
          {user?.plan === "free"
            ? ` · Kalan hak: ${user.scansLeft}/${user.scanLimit}`
            : " · Premium sınırsız"}
        </p>
        <div className="scan-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onScan}
            disabled={!ready || busy}
          >
            {busy ? "AI tanıyor…" : "Tara & Tanı"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPreview(null);
              setResult(null);
              setSelected(null);
            }}
          >
            Kameraya Dön
          </button>
          <label className="btn" style={{ cursor: "pointer" }}>
            Galeri
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFile}
              style={{ display: "none" }}
            />
          </label>
        </div>
        {error && (
          <p className="disclaimer" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="panel">
        <h2 className="section-title">AI Sonuç</h2>
        {busy && (
          <p className="loading">Analiz ediliyor — birkaç saniye sürebilir</p>
        )}
        {!busy && !result && (
          <p className="muted">
            Balığı çerçeveye alıp tara. Sistem tür tahmini yapar; emin değilse
            adaylardan sen seçersin (rastgele sonuç engellenir).
          </p>
        )}

        {result && result.isFish === false && (
          <div>
            <p className="confidence">Balık tespit edilemedi</p>
            <p className="muted">{result.notes}</p>
            <p className="meta" style={{ marginTop: 10 }}>
              Manuel seç:
            </p>
            <div className="chips" style={{ marginTop: 8 }}>
              {catalog.slice(0, 8).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`chip ${selected?.id === f.id ? "active" : ""}`}
                  onClick={() => setSelected(f)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {result?.isFish !== false && candidates.length > 0 && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <p className="confidence">
              Eşleşme %{result.confidence}
              {result.needsConfirm ? " — lütfen doğru türü seç" : ""}
            </p>
            <p className="muted">{result.notes}</p>

            <p className="meta" style={{ marginTop: 12, marginBottom: 8 }}>
              Doğru türü seç:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="fish-card"
                  style={{
                    borderColor:
                      selected?.id === c.id
                        ? "var(--line-strong)"
                        : "var(--line)",
                  }}
                  onClick={() => pickCandidate(c.id)}
                >
                  <div className="tag">%{c.confidence}</div>
                  <h3 style={{ margin: 0 }}>{c.name}</h3>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && (
          <div style={{ marginTop: "1rem" }}>
            <h3 style={{ fontFamily: "var(--display)", margin: "0.4rem 0" }}>
              {selected.name}
            </h3>
            <StatGrid fish={selected} />
            <p style={{ marginTop: "0.9rem", lineHeight: 1.5 }}>
              <strong>Bölge:</strong> {selected.regions.join(", ")}
              <br />
              <strong>Ağırlık:</strong> {selected.avgWeight}
            </p>
            <h4 style={{ marginBottom: 6 }}>Olası faydalar</h4>
            <ul className="listy good">
              {selected.benefits.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <h4 style={{ marginBottom: 6 }}>Dikkat</h4>
            <ul className="listy warn">
              {selected.harms.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: "0.8rem" }}
              onClick={() => onOpenFish?.(selected)}
            >
              Tüm özellikleri aç
            </button>
            {result?.disclaimer && (
              <p className="disclaimer">{result.disclaimer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
