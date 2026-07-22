import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../data/users.json");
const JWT_SECRET =
  process.env.JWT_SECRET || "balikatlas-dev-secret-change-in-production";
const FREE_DAILY_SCANS = 3;
const TOKEN_DAYS = 30;

function ensureStore() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function publicUser(u) {
  const premium = isPremium(u);
  return {
    id: u.id,
    username: u.username,
    plan: premium ? "premium" : "free",
    premiumUntil: u.premiumUntil || null,
    scansToday: u.scanDate === todayKey() ? u.scansToday || 0 : 0,
    scanLimit: premium ? null : FREE_DAILY_SCANS,
    scansLeft: premium
      ? null
      : Math.max(0, FREE_DAILY_SCANS - (u.scanDate === todayKey() ? u.scansToday || 0 : 0)),
    createdAt: u.createdAt,
  };
}

export function isPremium(u) {
  if (!u) return false;
  if (u.plan === "premium" && u.premiumUntil) {
    return new Date(u.premiumUntil).getTime() > Date.now();
  }
  if (u.plan === "premium" && !u.premiumUntil) return true;
  return false;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: `${TOKEN_DAYS}d` }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function findUserById(id) {
  const store = readStore();
  return store.users.find((u) => u.id === id) || null;
}

export function findUserByUsername(username) {
  const store = readStore();
  const key = String(username || "").trim().toLocaleLowerCase("tr-TR");
  return store.users.find((u) => u.username.toLocaleLowerCase("tr-TR") === key) || null;
}

export async function registerUser(username, password) {
  const name = String(username || "").trim();
  const pass = String(password || "");
  if (name.length < 3 || name.length > 24) {
    return { ok: false, error: "Kullanıcı adı 3–24 karakter olmalı." };
  }
  if (!/^[a-zA-Z0-9._ğüşıöçĞÜŞİÖÇ]+$/u.test(name)) {
    return { ok: false, error: "Kullanıcı adında sadece harf, rakam . _ kullanılabilir." };
  }
  if (pass.length < 6) {
    return { ok: false, error: "Şifre en az 6 karakter olmalı." };
  }
  if (findUserByUsername(name)) {
    return { ok: false, error: "Bu kullanıcı adı alınmış." };
  }

  const store = readStore();
  const user = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    username: name,
    passwordHash: await bcrypt.hash(pass, 10),
    plan: "free",
    premiumUntil: null,
    scansToday: 0,
    scanDate: todayKey(),
    createdAt: new Date().toISOString(),
    appleOriginalTransactionId: null,
  };
  store.users.push(user);
  writeStore(store);
  const token = signToken(user);
  return { ok: true, token, user: publicUser(user) };
}

export async function loginUser(username, password) {
  const user = findUserByUsername(username);
  if (!user) return { ok: false, error: "Kullanıcı veya şifre hatalı." };
  const ok = await bcrypt.compare(String(password || ""), user.passwordHash);
  if (!ok) return { ok: false, error: "Kullanıcı veya şifre hatalı." };
  return { ok: true, token: signToken(user), user: publicUser(user) };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: "Giriş gerekli." });
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    return res.status(401).json({ ok: false, error: "Oturum geçersiz. Tekrar giriş yapın." });
  }
  const user = findUserById(payload.sub);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Kullanıcı bulunamadı." });
  }
  req.user = user;
  req.publicUser = publicUser(user);
  next();
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload?.sub) {
      const user = findUserById(payload.sub);
      if (user) {
        req.user = user;
        req.publicUser = publicUser(user);
      }
    }
  }
  next();
}

export function consumeScan(userId) {
  const store = readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Kullanıcı yok" };

  if (isPremium(user)) {
    return { ok: true, user: publicUser(user), limited: false };
  }

  const day = todayKey();
  if (user.scanDate !== day) {
    user.scanDate = day;
    user.scansToday = 0;
  }
  if ((user.scansToday || 0) >= FREE_DAILY_SCANS) {
    writeStore(store);
    return {
      ok: false,
      error: "Ücretsiz günlük tarama hakkın bitti. Premium’a geç.",
      code: "LIMIT",
      user: publicUser(user),
    };
  }
  user.scansToday = (user.scansToday || 0) + 1;
  writeStore(store);
  return { ok: true, user: publicUser(user), limited: true };
}

export function activatePremium(userId, { months = 1, source = "appstore", transactionId = null } = {}) {
  const store = readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Kullanıcı yok" };

  const base =
    user.premiumUntil && new Date(user.premiumUntil) > new Date()
      ? new Date(user.premiumUntil)
      : new Date();
  base.setMonth(base.getMonth() + Number(months || 1));
  user.plan = "premium";
  user.premiumUntil = base.toISOString();
  user.subscriptionSource = source;
  if (transactionId) user.appleOriginalTransactionId = transactionId;
  writeStore(store);
  return { ok: true, user: publicUser(user) };
}

export function cancelPremium(userId) {
  const store = readStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return { ok: false, error: "Kullanıcı yok" };
  user.plan = "free";
  user.premiumUntil = null;
  writeStore(store);
  return { ok: true, user: publicUser(user) };
}

export function listUsersAdmin() {
  return readStore().users.map(publicUser);
}

export { publicUser, FREE_DAILY_SCANS };
