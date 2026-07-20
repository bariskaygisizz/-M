import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { fishList } from "../data/fish.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h /= 6;
  return { h: h * 360, s, l };
}

function hueBucket(h, s, l) {
  if (l < 0.18) return "dark";
  if (l > 0.82 && s < 0.2) return "white";
  if (s < 0.12) return l > 0.55 ? "silver" : "gray";
  if (h < 20 || h >= 340) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "gold";
  if (h < 100) return "yellow";
  if (h < 150) return "green";
  if (h < 175) return "olive";
  if (h < 200) return "cyan";
  if (h < 255) return "blue";
  if (h < 290) return "bluegray";
  if (h < 330) return "pink";
  return "rose";
}

function decodeImage(buffer, mime) {
  const type = (mime || "").toLowerCase();
  if (type.includes("png") || buffer[0] === 0x89) {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: png.data };
  }
  const jpg = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 });
  return { width: jpg.width, height: jpg.height, data: jpg.data };
}

function analyzePixels(width, height, data) {
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 4000)));
  const counts = {};
  let satSum = 0;
  let briSum = 0;
  let samples = 0;
  let edgeish = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 30) continue;
      const { h, s, l } = rgbToHsl(r, g, b);
      const bucket = hueBucket(h, s, l);
      counts[bucket] = (counts[bucket] || 0) + 1;
      satSum += s;
      briSum += l;
      samples += 1;
      if (x + step < width) {
        const j = (y * width + (x + step)) * 4;
        const dr = Math.abs(r - data[j]);
        const dg = Math.abs(g - data[j + 1]);
        const db = Math.abs(b - data[j + 2]);
        if (dr + dg + db > 80) edgeish += 1;
      }
    }
  }

  if (!samples) {
    return {
      topHues: ["silver"],
      saturation: "mid",
      brightness: "mid",
      sizeBias: "medium",
      edgeRatio: 0.2,
    };
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const topHues = sorted.slice(0, 3).map(([k]) => k);
  const avgS = satSum / samples;
  const avgL = briSum / samples;
  const aspect = width / Math.max(height, 1);
  let sizeBias = "medium";
  if (aspect > 2.2 || aspect < 0.45) sizeBias = "small";
  if (width * height > 900_000 && aspect > 1.2 && aspect < 2.0) sizeBias = "large";

  return {
    topHues,
    saturation: avgS > 0.42 ? "high" : avgS > 0.2 ? "mid" : "low",
    brightness: avgL > 0.62 ? "high" : avgL > 0.35 ? "mid" : "low",
    sizeBias,
    edgeRatio: edgeish / samples,
    samples,
  };
}

function scoreFish(fish, features) {
  const v = fish.visual;
  let score = 0;
  const reasons = [];

  for (const hue of features.topHues) {
    if (v.hues.includes(hue)) {
      score += hue === features.topHues[0] ? 34 : 14;
      reasons.push(`${hue} ton eşleşmesi`);
    }
  }
  if (v.saturation === features.saturation) {
    score += 12;
    reasons.push("doygunluk uyumu");
  }
  if (v.brightness === features.brightness) {
    score += 12;
    reasons.push("parlaklık uyumu");
  }
  if (v.sizeBias === features.sizeBias) {
    score += 16;
    reasons.push("boyut profili");
  } else if (
    (v.sizeBias === "medium" && features.sizeBias !== "large") ||
    (features.sizeBias === "medium" && v.sizeBias !== "large")
  ) {
    score += 6;
  }

  // slight prior for common Turkish market fish
  if (["hamsi", "levrek", "cipura", "istavrit"].includes(fish.id)) score += 3;

  return { score: clamp(score, 0, 100), reasons };
}

async function identifyWithOpenAI(base64, mime) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const names = fishList.map((f) => f.name).join(", ");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Sen bir balık tanıma asistanısın. Sadece verilen Türk balık listesinden seç. JSON döndür: {idGuess:string|null, name:string, confidence:number, notes:string}",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Bu görseldeki balığı tanı. Adaylar: ${names}. Bilmiyorsan en yakınını seç.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function identifyFishFromBuffer(buffer, mime = "image/jpeg") {
  const started = Date.now();
  const base64 = buffer.toString("base64");

  let vision = null;
  try {
    vision = await identifyWithOpenAI(base64, mime);
  } catch {
    vision = null;
  }

  let decoded;
  try {
    decoded = decodeImage(buffer, mime);
  } catch (err) {
    return {
      ok: false,
      error: "Görüntü okunamadı. JPG veya PNG deneyin.",
      detail: String(err.message || err),
    };
  }

  const features = analyzePixels(decoded.width, decoded.height, decoded.data);
  const ranked = fishList
    .map((fish) => {
      const { score, reasons } = scoreFish(fish, features);
      return { fish, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  if (vision?.name) {
    const hit =
      fishList.find(
        (f) =>
          f.name.toLocaleLowerCase("tr-TR") ===
            String(vision.name).toLocaleLowerCase("tr-TR") ||
          f.id === vision.idGuess
      ) || null;
    if (hit) {
      const conf = clamp(Number(vision.confidence) || 78, 45, 98);
      return {
        ok: true,
        engine: "vision+local",
        confidence: conf,
        features,
        match: hit,
        alternatives: ranked
          .filter((r) => r.fish.id !== hit.id)
          .slice(0, 3)
          .map((r) => ({
            id: r.fish.id,
            name: r.fish.name,
            confidence: clamp(Math.round(r.score * 0.9), 10, 90),
          })),
        notes: vision.notes || "Bulut görüntü modeli ile doğrulandı.",
        ms: Date.now() - started,
      };
    }
  }

  const best = ranked[0];
  const second = ranked[1];
  const gap = best.score - (second?.score || 0);
  const confidence = clamp(
    Math.round(best.score * 0.85 + gap * 0.4 + 8),
    42,
    93
  );

  return {
    ok: true,
    engine: process.env.OPENAI_API_KEY ? "local-fallback" : "local-ai",
    confidence,
    features,
    match: best.fish,
    alternatives: ranked.slice(1, 4).map((r) => ({
      id: r.fish.id,
      name: r.fish.name,
      confidence: clamp(Math.round(r.score * 0.85), 10, 88),
    })),
    notes:
      best.reasons.slice(0, 3).join(" · ") ||
      "Renk ve şekil özelliklerine göre tahmin edildi.",
    ms: Date.now() - started,
  };
}
