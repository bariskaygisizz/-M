import fs from "fs";
import os from "os";
import path from "path";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { fishList, getFishById } from "../data/fish.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/** CLIP için İngilizce görsel etiketler — tanıma isabetini artırır */
export const CLIP_LABELS = {
  hamsi: "a photo of a small silver European anchovy fish (hamsi)",
  levrek: "a photo of a European seabass fish (levrek) silver body",
  cipura: "a photo of a gilt-head bream fish (çipura) with gold spot",
  lufer: "a photo of a bluefish (lüfer) dark blue back silver belly",
  palamut: "a photo of an Atlantic bonito fish (palamut) with stripes",
  alabalik: "a photo of a rainbow trout fish (alabalık) with spots",
  somon: "a photo of a raw salmon fish fillet orange pink flesh",
  ton: "a photo of a tuna fish steak red meat (ton balığı)",
  sardalya: "a photo of sardines fish (sardalya) small oily silver",
  kalkan: "a photo of a turbot flatfish (kalkan) brown top",
  istavrit: "a photo of a horse mackerel fish (istavrit)",
  mezgit: "a photo of a whiting white fish (mezgit) pale body",
  uskumru: "a photo of an Atlantic mackerel fish (uskumru) wavy stripes",
  barbunya: "a photo of a red mullet fish (barbunya) reddish body",
  mercan: "a photo of a common pandora fish (mercan) pinkish",
  cinekop: "a photo of a young bluefish (çinekop) small bluefish",
};

const NOT_FISH = "a photo of something that is not a fish (plate, hand, table, phone)";

let clipPipelinePromise = null;

async function getClip() {
  if (!clipPipelinePromise) {
    clipPipelinePromise = (async () => {
      const { pipeline } = await import("@xenova/transformers");
      return pipeline(
        "zero-shot-image-classification",
        "Xenova/clip-vit-base-patch32"
      );
    })();
  }
  return clipPipelinePromise;
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

function writeTempImage(buffer, mime) {
  const ext = (mime || "").includes("png") ? "png" : "jpg";
  const file = path.join(
    os.tmpdir(),
    `balikatlas-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  );
  fs.writeFileSync(file, buffer);
  return file;
}

async function identifyWithOpenAI(base64, mime) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const names = fishList.map((f) => `${f.id}:${f.name}`).join(", ");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Balık tanı. Sadece bu listeden id seç: ${names}. JSON: {"id":"hamsi|null","confidence":0-100,"isFish":true|false,"notes":"..."}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Görseldeki balığı tanı. Balık değilse isFish:false." },
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
  try {
    return JSON.parse(json.choices?.[0]?.message?.content || "{}");
  } catch {
    return null;
  }
}

async function identifyWithClip(tmpFile) {
  const clip = await getClip();
  const candidateIds = Object.keys(CLIP_LABELS);
  const labels = [...candidateIds.map((id) => CLIP_LABELS[id]), NOT_FISH];
  const raw = await clip(tmpFile, labels);

  const scored = raw
    .map((row) => {
      const label = row.label;
      const id = candidateIds.find((cid) => CLIP_LABELS[cid] === label);
      return {
        id: id || null,
        notFish: label === NOT_FISH,
        score: Number(row.score) || 0,
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored;
}

function buildAlternatives(ranked, excludeId) {
  return ranked
    .filter((r) => r.id && r.id !== excludeId)
    .slice(0, 4)
    .map((r) => {
      const fish = getFishById(r.id);
      return {
        id: r.id,
        name: fish?.name || r.id,
        confidence: clamp(Math.round(r.score * 100), 1, 99),
      };
    });
}

export async function identifyFishFromBuffer(buffer, mime = "image/jpeg") {
  const started = Date.now();
  const base64 = buffer.toString("base64");
  let tmpFile = null;

  try {
    // Görüntü geçerli mi?
    try {
      decodeImage(buffer, mime);
    } catch (err) {
      return {
        ok: false,
        error: "Görüntü okunamadı. JPG veya PNG deneyin.",
        detail: String(err.message || err),
      };
    }

    // 1) OpenAI (opsiyonel)
    try {
      const vision = await identifyWithOpenAI(base64, mime);
      if (vision && vision.isFish === false) {
        return {
          ok: true,
          engine: "vision",
          confidence: clamp(Number(vision.confidence) || 70, 40, 99),
          isFish: false,
          needsConfirm: false,
          match: null,
          alternatives: [],
          notes: vision.notes || "Görselde balık bulunamadı.",
          ms: Date.now() - started,
        };
      }
      if (vision?.id && getFishById(vision.id)) {
        const fish = getFishById(vision.id);
        const conf = clamp(Number(vision.confidence) || 80, 50, 99);
        return {
          ok: true,
          engine: "vision",
          confidence: conf,
          isFish: true,
          needsConfirm: conf < 75,
          match: fish,
          alternatives: fishList
            .filter((f) => f.id !== fish.id)
            .slice(0, 3)
            .map((f) => ({ id: f.id, name: f.name, confidence: 20 })),
          notes: vision.notes || "Bulut görüntü modeli ile tanındı.",
          ms: Date.now() - started,
        };
      }
    } catch {
      // devam
    }

    // 2) CLIP zero-shot (asıl motor)
    tmpFile = writeTempImage(buffer, mime);
    const ranked = await identifyWithClip(tmpFile);
    const top = ranked[0];
    const second = ranked[1];

    if (!top || top.notFish || !top.id) {
      const bestFish = ranked.find((r) => r.id && !r.notFish);
      if (!bestFish || bestFish.score < 0.12) {
        return {
          ok: true,
          engine: "clip",
          confidence: clamp(Math.round((top?.score || 0) * 100), 5, 70),
          isFish: false,
          needsConfirm: true,
          match: null,
          alternatives: buildAlternatives(ranked, null),
          notes:
            "Balık net görünmüyor. Balığı yakından, iyi ışıkta, mümkünse düz zeminde tekrar çekin veya listeden seçin.",
          ms: Date.now() - started,
        };
      }
    }

    const best = ranked.find((r) => r.id && !r.notFish) || top;
    const fish = getFishById(best.id);
    if (!fish) {
      return {
        ok: false,
        error: "Eşleşme bulunamadı.",
        ms: Date.now() - started,
      };
    }

    const gap = best.score - (second && !second.notFish ? second.score : 0);
    let confidence = Math.round(best.score * 100);
    if (gap > 0.08) confidence += 6;
    if (gap < 0.03) confidence -= 8;
    confidence = clamp(confidence, 20, 96);

    const needsConfirm = confidence < 72 || gap < 0.045;

    return {
      ok: true,
      engine: "clip",
      confidence,
      isFish: true,
      needsConfirm,
      match: fish,
      alternatives: buildAlternatives(ranked, fish.id),
      notes: needsConfirm
        ? "Birden fazla tür mümkün. Doğru olanı seçin."
        : `En olası eşleşme: ${fish.name}`,
      ms: Date.now() - started,
    };
  } catch (err) {
    console.error("identify error", err);
    return {
      ok: false,
      error:
        "AI modeli yüklenemedi veya analiz başarısız. Sunucuyu yeniden başlatıp tekrar deneyin.",
      detail: String(err.message || err),
      ms: Date.now() - started,
    };
  } finally {
    if (tmpFile) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        /* ignore */
      }
    }
  }
}

/** İlk istekte modeli ısıt */
export async function warmupClip() {
  try {
    await getClip();
    return true;
  } catch (err) {
    console.error("CLIP warmup failed", err);
    return false;
  }
}
