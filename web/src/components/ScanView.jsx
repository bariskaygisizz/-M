import { useEffect, useRef, useState } from "react";
import { identifyImage } from "../api";
import { StatGrid } from "./FishUI";

export default function ScanView({ onOpenFish }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

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
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    return blob;
  };

  const runIdentify = async (blob) => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const json = await identifyImage(blob);
      setResult(json);
    } catch (err) {
      setError(err.message || "Tanıma başarısız");
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
        <div className="scan-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onScan}
            disabled={!ready || busy}
          >
            {busy ? "AI analiz ediyor…" : "Tara & Tanı"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPreview(null);
              setResult(null);
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
        {busy && <p className="loading">Görüntü işleniyor · renk/şekil analizi</p>}
        {!busy && !result && (
          <p className="muted">
            Balığı çerçeveye alıp tara. Sistem tür tahmini yapar; kalori, bölge,
            fayda ve zararları gösterir.
          </p>
        )}
        {result?.match && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <p className="confidence">
              Eşleşme %{result.confidence} · {result.engine} · {result.ms}ms
            </p>
            <h3 style={{ fontFamily: "var(--display)", margin: "0.4rem 0" }}>
              {result.match.name}
            </h3>
            <p className="muted">{result.notes}</p>
            {result.alternatives?.length > 0 && (
              <p className="meta" style={{ marginTop: 8 }}>
                Alternatifler:{" "}
                {result.alternatives.map((a) => a.name).join(" · ")}
              </p>
            )}
            <div style={{ marginTop: "1rem" }}>
              <StatGrid fish={result.match} />
            </div>
            <p style={{ marginTop: "0.9rem", lineHeight: 1.5 }}>
              <strong>Bölge:</strong> {result.match.regions.join(", ")}
              <br />
              <strong>Ağırlık:</strong> {result.match.avgWeight}
            </p>
            <h4 style={{ marginBottom: 6 }}>Olası faydalar</h4>
            <ul className="listy good">
              {result.match.benefits.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <h4 style={{ marginBottom: 6 }}>Dikkat</h4>
            <ul className="listy warn">
              {result.match.harms.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: "0.8rem" }}
              onClick={() => onOpenFish?.(result.match)}
            >
              Tüm özellikleri aç
            </button>
            <p className="disclaimer">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
