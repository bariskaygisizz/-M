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
import {
  registerUser,
  loginUser,
  authMiddleware,
  optionalAuth,
  consumeScan,
  activatePremium,
  cancelPremium,
  publicUser,
  FREE_DAILY_SCANS,
  findUserById,
} from "./users.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(__dirname, "../web/dist");
const fishAssets = path.join(__dirname, "../web/public/fish");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use("/fish", express.static(fishAssets));

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
    freemium: true,
    freeDailyScans: FREE_DAILY_SCANS,
  });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    regions: REGIONS,
    count: fishList.length,
    brand: "BalıkAtlas",
    plans: [
      {
        id: "free",
        name: "Ücretsiz",
        price: "₺0",
        scans: `${FREE_DAILY_SCANS}/gün`,
        features: ["Atlas", "Favoriler", "Günlük sınırlı AI tarama"],
      },
      {
        id: "premium_month",
        name: "Premium Aylık",
        price: "₺79,99",
        period: "month",
        months: 1,
        features: ["Sınırsız AI tarama", "Reklamsız", "Öncelikli model"],
      },
      {
        id: "premium_year",
        name: "Premium Yıllık",
        price: "₺499,99",
        period: "year",
        months: 12,
        features: ["Sınırsız AI tarama", "Reklamsız", "2 ay hediye"],
      },
    ],
  });
});

app.post("/api/auth/register", async (req, res) => {
  const result = await registerUser(req.body?.username, req.body?.password);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/auth/login", async (req, res) => {
  const result = await loginUser(req.body?.username, req.body?.password);
  if (!result.ok) return res.status(401).json(result);
  res.json(result);
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.publicUser });
});

app.post("/api/subscription/activate", authMiddleware, (req, res) => {
  const plan = String(req.body?.plan || "premium_month");
  const months = plan === "premium_year" ? 12 : Number(req.body?.months) || 1;
  // Production: Apple App Store Server API ile receipt doğrula
  // Şimdilik giriş yapmış kullanıcı için abonelik kaydı (App Store IAP sonrası çağrılır)
  const source = req.body?.source || "appstore";
  const transactionId = req.body?.transactionId || null;

  // Güvenlik: gerçek yayında sadece doğrulanmış Apple receipt kabul edilmeli
  const allowDev = process.env.ALLOW_DEV_IAP !== "0";
  if (!allowDev && source === "dev") {
    return res.status(403).json({ ok: false, error: "Dev satın alma kapalı." });
  }

  const result = activatePremium(req.user.id, {
    months,
    source,
    transactionId,
  });
  res.json(result);
});

app.post("/api/subscription/cancel", authMiddleware, (req, res) => {
  res.json(cancelPremium(req.user.id));
});

app.get("/api/fish", optionalAuth, (req, res) => {
  const { q = "", region = "Tümü" } = req.query;
  const list = searchFish(String(q), String(region)).map((f) => ({
    ...publicFish(f),
    image: `/fish/${f.id}.svg`,
  }));
  res.json({ count: list.length, items: list });
});

app.get("/api/fish/:id", (req, res) => {
  const fish = publicFish(getFishById(req.params.id));
  if (!fish) return res.status(404).json({ error: "Balık bulunamadı" });
  res.json({ ...fish, image: `/fish/${fish.id}.svg` });
});

app.post("/api/identify", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const gate = consumeScan(req.user.id);
    if (!gate.ok) {
      return res.status(402).json({
        ok: false,
        error: gate.error,
        code: gate.code,
        user: gate.user,
        paywall: true,
      });
    }

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

    const fresh = findUserById(req.user.id);

    res.json({
      ...result,
      match: result.match
        ? { ...publicFish(result.match), image: `/fish/${result.match.id}.svg` }
        : null,
      user: publicUser(fresh),
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
  if (req.path.startsWith("/api") || req.path.startsWith("/fish")) return next();
  res.sendFile(path.join(webDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`BalıkAtlas http://0.0.0.0:${PORT}`);
  warmupClip().then((ok) => {
    console.log(ok ? "CLIP hazır" : "CLIP warmup bekleniyor");
  });
});
