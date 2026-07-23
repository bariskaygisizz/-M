import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  authMiddleware,
  requireAuth,
  register,
  login,
  signToken,
  publicUser,
  deleteUser,
  listInvitations,
  getInvitation,
  createInvitation,
  updateInvitation,
  deleteInvitation,
  setPlan,
  restorePurchases,
  TEMPLATES,
  PLANS,
} from "./users.js";
import { LOCALES, translations } from "../shared/i18n.js";
import { CATEGORIES } from "../shared/templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVITES_FILE = path.join(__dirname, "data", "invitations.json");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(authMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Davetly", version: "1.0.0" });
});

app.get("/api/locales", (_req, res) => {
  res.json({ locales: LOCALES, default: "tr" });
});

app.get("/api/i18n/:locale", (req, res) => {
  const locale = req.params.locale;
  res.json({
    locale,
    messages: translations[locale] || translations.en,
  });
});

app.get("/api/templates", (_req, res) => {
  res.json({ categories: CATEGORIES, templates: TEMPLATES });
});

app.get("/api/plans", (_req, res) => {
  const safe = Object.fromEntries(
    Object.entries(PLANS).map(([id, p]) => [
      id,
      {
        id: p.id,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        currency: p.currency || "TRY",
        productIds: p.productIds || {},
        limits: {
          ...p.limits,
          maxInvitations:
            p.limits.maxInvitations === Infinity
              ? null
              : p.limits.maxInvitations,
          maxEditsPerInvitation:
            p.limits.maxEditsPerInvitation === Infinity
              ? null
              : p.limits.maxEditsPerInvitation,
        },
      },
    ])
  );
  res.json({ plans: safe });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const user = await register(req.body || {});
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await login(req.body || {});
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.delete("/api/me", requireAuth, (req, res) => {
  deleteUser(req.user.id);
  res.json({ ok: true });
});

app.get("/api/invitations", requireAuth, (req, res) => {
  res.json({ invitations: listInvitations(req.user.id) });
});

app.get("/api/invitations/:id", requireAuth, (req, res) => {
  const invite = getInvitation(req.params.id, req.user.id);
  if (!invite) return res.status(404).json({ error: "notFound" });
  res.json({ invitation: invite });
});

app.post("/api/invitations", requireAuth, (req, res) => {
  try {
    const invite = createInvitation(req.user, req.body || {});
    res.status(201).json({ invitation: invite });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

app.patch("/api/invitations/:id", requireAuth, (req, res) => {
  try {
    const result = updateInvitation(req.user, req.params.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

app.delete("/api/invitations/:id", requireAuth, (req, res) => {
  try {
    deleteInvitation(req.user.id, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

/** Demo subscribe — production uses StoreKit / Play Billing / Stripe */
app.post("/api/subscribe", requireAuth, (req, res) => {
  try {
    const { planId = "plus", period = "monthly" } = req.body || {};
    const user = setPlan(req.user.id, planId, period);
    res.json({ user: publicUser(user) });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

app.post("/api/restore", requireAuth, (req, res) => {
  try {
    const user = restorePurchases(req.user.id, req.body?.planId);
    res.json({ user: publicUser(user) });
  } catch (e) {
    res.status(e.code || 500).json({ error: e.message || "generic" });
  }
});

/** Public share page data (no auth) */
app.get("/api/share/:id", (req, res) => {
  let all = [];
  try {
    all = JSON.parse(fs.readFileSync(INVITES_FILE, "utf8"));
  } catch {
    all = [];
  }
  const invite = all.find((i) => i.id === req.params.id);
  if (!invite) return res.status(404).json({ error: "notFound" });
  const { userId: _u, editCount: _e, ...publicInvite } = invite;
  res.json({ invitation: publicInvite });
});

app.listen(PORT, () => {
  console.log(`Davetly API http://localhost:${PORT}`);
});
