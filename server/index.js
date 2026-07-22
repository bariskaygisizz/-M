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
  deleteUser,
} from "./users.js";
import { IAP_PRODUCTS_SERVER } from "./iap-products.js";

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
    organs: [
      { id: "brain", label: "Beyin" },
      { id: "eye", label: "Göz" },
      { id: "heart", label: "Kalp" },
      { id: "bone", label: "Kemik" },
      { id: "skin", label: "Cilt" },
      { id: "immune", label: "Bağışıklık" },
      { id: "thyroid", label: "Tiroid" },
      { id: "muscle", label: "Kas" },
    ],
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
        features: ["Sınırsız AI tarama", "Reklamsız deneyim"],
      },
      {
        id: "premium_year",
        name: "Premium Yıllık",
        price: "₺499,99",
        period: "year",
        months: 12,
        features: ["Sınırsız AI tarama", "Reklamsız deneyim", "Yıllık avantajlı fiyat"],
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
  const productId = String(req.body?.productId || "");
  const plan = String(req.body?.plan || "premium_month");
  const source = String(req.body?.source || "appstore");
  const transactionId = req.body?.transactionId
    ? String(req.body.transactionId)
    : null;

  // Guideline 3.1.1 — Production'da Apple dışı ödeme ile premium AÇILMAZ
  const allowDev =
    process.env.ALLOW_DEV_IAP === "1" || process.env.NODE_ENV === "development";

  if (source === "dev") {
    if (!allowDev) {
      return res.status(403).json({
        ok: false,
        error:
          "Geliştirici satın alma kapalı. App Store / StoreKit üzerinden satın alın.",
      });
    }
  } else {
    // appstore / play: transactionId zorunlu (gerçek doğrulama EAS sonrası eklenir)
    if (!transactionId || transactionId.length < 8) {
      return res.status(400).json({
        ok: false,
        error: "Geçerli mağaza işlem numarası (transaction) gerekli.",
      });
    }
    if (productId && !IAP_PRODUCTS_SERVER[productId]) {
      return res.status(400).json({
        ok: false,
        error: "Bilinmeyen App Store ürün kimliği.",
      });
    }
  }

  const mapped = productId ? IAP_PRODUCTS_SERVER[productId] : null;
  const months = mapped?.months || (plan === "premium_year" ? 12 : 1);

  const result = activatePremium(req.user.id, {
    months,
    source,
    transactionId,
  });
  res.json(result);
});

app.post("/api/subscription/restore", authMiddleware, (req, res) => {
  // İleride: Apple transactions dizisi doğrulanır
  const transactions = Array.isArray(req.body?.transactions)
    ? req.body.transactions
    : [];
  if (!transactions.length) {
    return res.status(400).json({
      ok: false,
      error: "Geri yüklenecek App Store satın alma bulunamadı.",
    });
  }
  // Minimal güvenli yol: en uzun süreli geçerli ürünü işle
  let bestMonths = 0;
  let bestTx = null;
  for (const tx of transactions) {
    const meta = IAP_PRODUCTS_SERVER[tx.productId];
    if (!meta || !tx.transactionId) continue;
    if (meta.months > bestMonths) {
      bestMonths = meta.months;
      bestTx = tx;
    }
  }
  if (!bestTx) {
    return res.status(404).json({
      ok: false,
      error: "Hesaba bağlanacak geçerli abonelik yok.",
    });
  }
  const result = activatePremium(req.user.id, {
    months: bestMonths,
    source: "appstore_restore",
    transactionId: bestTx.transactionId,
  });
  res.json(result);
});

app.post("/api/account/delete", authMiddleware, (req, res) => {
  // Guideline 5.1.1(v) — hesap silme
  const result = deleteUser(req.user.id);
  if (!result.ok) return res.status(400).json(result);
  res.json({
    ok: true,
    message: "Hesabınız ve ilişkili veriler silindi.",
  });
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
      engine: undefined,
      ms: undefined,
      features: undefined,
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
