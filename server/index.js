import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  fishList,
  getFishById,
  searchFish,
  publicFish,
  REGIONS,
} from "../data/fish.js";
import { identifyFishFromBuffer, warmupClip } from "./identify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(__dirname, "../web/dist");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "BalıkAtlas API",
    fishCount: fishList.length,
    vision: Boolean(process.env.OPENAI_API_KEY),
  });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    regions: REGIONS,
    count: fishList.length,
    brand: "BalıkAtlas",
  });
});

app.get("/api/fish", (req, res) => {
  const { q = "", region = "Tümü" } = req.query;
  const list = searchFish(String(q), String(region)).map(publicFish);
  res.json({ count: list.length, items: list });
});

app.get("/api/fish/:id", (req, res) => {
  const fish = publicFish(getFishById(req.params.id));
  if (!fish) return res.status(404).json({ error: "Balık bulunamadı" });
  res.json(fish);
});

app.post("/api/identify", upload.single("image"), async (req, res) => {
  try {
    let buffer = req.file?.buffer || null;
    let mime = req.file?.mimetype || "image/jpeg";

    if (!buffer && req.body?.imageBase64) {
      const raw = String(req.body.imageBase64);
      const m = raw.match(/^data:(.+?);base64,(.+)$/);
      if (m) {
        mime = m[1];
        buffer = Buffer.from(m[2], "base64");
      } else {
        buffer = Buffer.from(raw, "base64");
      }
    }

    if (!buffer?.length) {
      return res.status(400).json({
        ok: false,
        error: "Görüntü gerekli. Kamera veya galeri ile fotoğraf gönderin.",
      });
    }

    const result = await identifyFishFromBuffer(buffer, mime);
    if (!result.ok) return res.status(422).json(result);

    res.json({
      ...result,
      match: publicFish(result.match),
      disclaimer:
        "AI tahmini bilgilendirme amaçlıdır; kesin tür teşhisi veya tıbbi tavsiye değildir.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Tanıma sırasında hata oluştu." });
  }
});

app.use(express.static(webDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(webDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BalıkAtlas http://0.0.0.0:${PORT}`);
  warmupClip().then((ok) => {
    console.log(ok ? "CLIP modeli hazır" : "CLIP warmup başarısız — ilk taramada inecek");
  });
});
