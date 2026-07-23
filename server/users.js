import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { PLANS, resolveLimits } from "../shared/plans.js";
import { getTemplate as getTemplateSync, TEMPLATES } from "../shared/templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const INVITES_FILE = path.join(DATA_DIR, "invitations.json");

const JWT_SECRET = process.env.JWT_SECRET || "davetly-dev-secret-change-me";

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
  if (!fs.existsSync(INVITES_FILE)) fs.writeFileSync(INVITES_FILE, "[]");
}

function readJson(file) {
  ensureStore();
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  ensureStore();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function publicUser(user) {
  const limits = resolveLimits(user.plan || "free");
  return {
    id: user.id,
    email: user.email,
    plan: user.plan || "free",
    planExpiresAt: user.planExpiresAt || null,
    locale: user.locale || "tr",
    createdAt: user.createdAt,
    limits: {
      ...limits,
      maxEditsPerInvitation:
        limits.maxEditsPerInvitation === Infinity
          ? null
          : limits.maxEditsPerInvitation,
      maxInvitations:
        limits.maxInvitations === Infinity ? null : limits.maxInvitations,
    },
  };
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = readJson(USERS_FILE);
    req.user = users.find((u) => u.id === payload.sub) || null;
  } catch {
    req.user = null;
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "auth" });
  next();
}

export async function register({ email, password, locale = "tr" }) {
  const users = readJson(USERS_FILE);
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || !password || password.length < 6) {
    const err = new Error("invalid");
    err.code = 400;
    throw err;
  }
  if (users.some((u) => u.email === normalized)) {
    const err = new Error("exists");
    err.code = 409;
    throw err;
  }
  const user = {
    id: uuid(),
    email: normalized,
    passwordHash: await bcrypt.hash(password, 10),
    plan: "free",
    planExpiresAt: null,
    locale,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeJson(USERS_FILE, users);
  return user;
}

export async function login({ email, password }) {
  const users = readJson(USERS_FILE);
  const user = users.find(
    (u) => u.email === String(email).trim().toLowerCase()
  );
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const err = new Error("auth");
    err.code = 401;
    throw err;
  }
  return user;
}

export function deleteUser(userId) {
  const users = readJson(USERS_FILE).filter((u) => u.id !== userId);
  writeJson(USERS_FILE, users);
  const invites = readJson(INVITES_FILE).filter((i) => i.userId !== userId);
  writeJson(INVITES_FILE, invites);
}

export function listInvitations(userId) {
  return readJson(INVITES_FILE)
    .filter((i) => i.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getInvitation(id, userId) {
  return readJson(INVITES_FILE).find((i) => i.id === id && i.userId === userId);
}

export function createInvitation(user, payload) {
  const limits = resolveLimits(user.plan || "free");
  const existing = listInvitations(user.id);
  if (existing.length >= limits.maxInvitations) {
    const err = new Error("limitInvites");
    err.code = 402;
    throw err;
  }

  const template = getTemplateSync(payload.templateId);
  if (template.premium && !limits.premiumTemplates) {
    const err = new Error("premiumTemplate");
    err.code = 402;
    throw err;
  }

  const invite = {
    id: uuid(),
    userId: user.id,
    templateId: template.id,
    category: template.category,
    title: payload.title || "",
    hosts: payload.hosts || "",
    date: payload.date || "",
    time: payload.time || "",
    venue: payload.venue || "",
    address: payload.address || "",
    message: payload.message || "",
    locale: payload.locale || user.locale || "tr",
    editCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const all = readJson(INVITES_FILE);
  all.push(invite);
  writeJson(INVITES_FILE, all);
  return invite;
}

export function updateInvitation(user, id, payload) {
  const limits = resolveLimits(user.plan || "free");
  const all = readJson(INVITES_FILE);
  const idx = all.findIndex((i) => i.id === id && i.userId === user.id);
  if (idx < 0) {
    const err = new Error("notFound");
    err.code = 404;
    throw err;
  }
  const invite = all[idx];
  if (invite.editCount >= limits.maxEditsPerInvitation) {
    const err = new Error("limitReached");
    err.code = 402;
    throw err;
  }

  if (payload.templateId && payload.templateId !== invite.templateId) {
    const template = getTemplateSync(payload.templateId);
    if (template.premium && !limits.premiumTemplates) {
      const err = new Error("premiumTemplate");
      err.code = 402;
      throw err;
    }
    invite.templateId = template.id;
    invite.category = template.category;
  }

  for (const key of [
    "title",
    "hosts",
    "date",
    "time",
    "venue",
    "address",
    "message",
    "locale",
  ]) {
    if (payload[key] !== undefined) invite[key] = payload[key];
  }

  invite.editCount += 1;
  invite.updatedAt = new Date().toISOString();
  all[idx] = invite;
  writeJson(INVITES_FILE, all);

  const editsLeft =
    limits.maxEditsPerInvitation === Infinity
      ? null
      : Math.max(0, limits.maxEditsPerInvitation - invite.editCount);

  return { invite, editsLeft };
}

export function deleteInvitation(userId, id) {
  const all = readJson(INVITES_FILE);
  const next = all.filter((i) => !(i.id === id && i.userId === userId));
  if (next.length === all.length) {
    const err = new Error("notFound");
    err.code = 404;
    throw err;
  }
  writeJson(INVITES_FILE, next);
}

/** Demo subscription activation (replace with App Store / Stripe webhooks) */
export function setPlan(userId, planId, period = "monthly") {
  if (!PLANS[planId]) {
    const err = new Error("invalidPlan");
    err.code = 400;
    throw err;
  }
  const users = readJson(USERS_FILE);
  const idx = users.findIndex((u) => u.id === userId);
  if (idx < 0) {
    const err = new Error("notFound");
    err.code = 404;
    throw err;
  }
  const days = period === "yearly" ? 365 : 30;
  users[idx].plan = planId;
  users[idx].planExpiresAt =
    planId === "free"
      ? null
      : new Date(Date.now() + days * 86400000).toISOString();
  writeJson(USERS_FILE, users);
  return users[idx];
}

export function restorePurchases(userId, receiptPlanId) {
  // Production: validate App Store / Play receipt. Demo: honor claimed plan.
  if (receiptPlanId && PLANS[receiptPlanId] && receiptPlanId !== "free") {
    return setPlan(userId, receiptPlanId, "yearly");
  }
  const users = readJson(USERS_FILE);
  return users.find((u) => u.id === userId);
}

export { TEMPLATES, PLANS, resolveLimits };
