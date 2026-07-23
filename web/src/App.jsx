import { useEffect, useMemo, useState } from "react";
import {
  api,
  setSession,
  clearSession,
  getStoredUser,
} from "./api.js";
import { t, LOCALES, loadLocale, saveLocale, translations } from "./i18n.js";
import { getTemplate } from "../../shared/templates.js";
import { PLANS } from "../../shared/plans.js";

function featureList(locale, key) {
  const list = translations[locale]?.pricing?.[key] || translations.en.pricing[key];
  return Array.isArray(list) ? list : [];
}

const PAGES = null; // navigation is explicit below

export default function App() {
  const [page, setPage] = useState("home");
  const [locale, setLocale] = useState(loadLocale());
  const [user, setUser] = useState(getStoredUser());
  const [templates, setTemplates] = useState([]);
  const [category, setCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("wedding-garden");
  const [period, setPeriod] = useState("monthly");
  const [invitations, setInvitations] = useState([]);
  const [activeInvite, setActiveInvite] = useState(null);
  const [editsLeft, setEditsLeft] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    title: "",
    hosts: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    message: "",
  });

  const dir = LOCALES.find((l) => l.code === locale)?.dir || "ltr";
  const tt = (path, vars) => t(locale, path, vars);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  useEffect(() => {
    api.templates().then((d) => setTemplates(d.templates || [])).catch(() => {});
    if (localStorage.getItem("davetly_token")) {
      api
        .me()
        .then((d) => {
          setUser(d.user);
          setSession(localStorage.getItem("davetly_token"), d.user);
        })
        .catch(() => {
          clearSession();
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    if (user && page === "account") {
      api.invitations().then((d) => setInvitations(d.invitations || [])).catch(() => {});
    }
  }, [user, page]);

  const filtered = useMemo(() => {
    if (category === "all") return templates;
    return templates.filter((x) => x.category === category);
  }, [templates, category]);

  const previewTemplate = getTemplate(selectedTemplate);
  const showWatermark = !user?.limits || user.limits.watermark !== false;

  function go(next) {
    setError("");
    setPage(next);
  }

  function changeLocale(code) {
    setLocale(code);
    saveLocale(code);
  }

  async function ensureAuth() {
    if (user && localStorage.getItem("davetly_token")) return true;
    setError(tt("errors.auth"));
    go("account");
    return false;
  }

  async function handleAuth(mode) {
    setBusy(true);
    setError("");
    try {
      const fn = mode === "register" ? api.register : api.login;
      const data = await fn({
        email: form.email,
        password: form.password,
        locale,
      });
      setSession(data.token, data.user);
      setUser(data.user);
    } catch (e) {
      setError(tt(`errors.${e.message}`) || tt("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function startInvite(templateId) {
    setSelectedTemplate(templateId);
    const tpl = getTemplate(templateId);
    if (tpl.premium && user && !user.limits?.premiumTemplates) {
      setError(tt("errors.premiumTemplate"));
      go("pricing");
      return;
    }
    if (!(await ensureAuth())) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.createInvitation({
        templateId,
        locale,
        title: form.title || tt("editor.inviteGuest"),
        hosts: form.hosts,
        date: form.date,
        time: form.time,
        venue: form.venue,
        address: form.address,
        message: form.message,
      });
      setActiveInvite(data.invitation);
      setSelectedTemplate(data.invitation.templateId);
      setForm((f) => ({
        ...f,
        title: data.invitation.title,
        hosts: data.invitation.hosts,
        date: data.invitation.date,
        time: data.invitation.time,
        venue: data.invitation.venue,
        address: data.invitation.address,
        message: data.invitation.message,
      }));
      const max = user?.limits?.maxEditsPerInvitation;
      setEditsLeft(max == null ? null : max);
      go("create");
    } catch (e) {
      if (e.message === "limitInvites" || e.message === "premiumTemplate") {
        setError(tt(`errors.${e.message}`));
        go("pricing");
      } else {
        setError(tt("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveInvite() {
    if (!activeInvite) {
      await startInvite(selectedTemplate);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api.updateInvitation(activeInvite.id, {
        templateId: selectedTemplate,
        title: form.title,
        hosts: form.hosts,
        date: form.date,
        time: form.time,
        venue: form.venue,
        address: form.address,
        message: form.message,
        locale,
      });
      setActiveInvite(data.invite);
      setEditsLeft(data.editsLeft);
      const me = await api.me();
      setUser(me.user);
      setSession(localStorage.getItem("davetly_token"), me.user);
    } catch (e) {
      if (e.message === "limitReached") {
        setError(tt("editor.limitReached"));
        go("pricing");
      } else {
        setError(tt("errors.generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function subscribe(planId) {
    if (!(await ensureAuth())) return;
    setBusy(true);
    try {
      const data = await api.subscribe({ planId, period });
      setUser(data.user);
      setSession(localStorage.getItem("davetly_token"), data.user);
    } catch {
      setError(tt("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (!(await ensureAuth())) return;
    setBusy(true);
    try {
      const data = await api.restore({ planId: user?.plan === "free" ? "plus" : user?.plan });
      setUser(data.user);
      setSession(localStorage.getItem("davetly_token"), data.user);
    } catch {
      setError(tt("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    clearSession();
    setUser(null);
    setInvitations([]);
    setActiveInvite(null);
  }

  async function deleteAccount() {
    if (!confirm(tt("account.deleteConfirm"))) return;
    await api.deleteMe();
    await logout();
    go("home");
  }

  const categories = [
    "all",
    "wedding",
    "engagement",
    "henna",
    "circumcision",
    "ballet",
    "graduation",
    "birthday",
    "baby",
    "opening",
  ];

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")} type="button">
          Davet<em>ly</em>
        </button>
        <nav className="nav">
          {["home", "templates", "pricing", "create", "account"].map((p) => (
            <button
              key={p}
              type="button"
              className={page === p ? "active" : ""}
              onClick={() => go(p)}
            >
              {tt(
                p === "home"
                  ? "navHome"
                  : p === "templates"
                    ? "navTemplates"
                    : p === "pricing"
                      ? "navPricing"
                      : p === "create"
                        ? "navCreate"
                        : "navAccount"
              )}
            </button>
          ))}
          <label className="lang">
            <span className="sr-only">{tt("common.language")}</span>
            <select
              value={locale}
              onChange={(e) => changeLocale(e.target.value)}
              aria-label={tt("common.language")}
            >
              {LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </header>

      <main>
        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-visual" aria-hidden="true" />
              <div className="hero-copy">
                <h1 className="brand-hero">Davetly</h1>
                <p>{tt("tagline")}</p>
                <div className="cta-row">
                  <button className="btn btn-primary" type="button" onClick={() => go("create")}>
                    {tt("heroCta")}
                  </button>
                  <button className="btn btn-ghost" type="button" onClick={() => go("templates")}>
                    {tt("heroSecondary")}
                  </button>
                </div>
              </div>
            </section>
            <section className="section">
              <h2>{tt("templates.title")}</h2>
              <p className="lead">{tt("pricing.subtitle")}</p>
              <div className="grid">
                {templates.slice(0, 6).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="template-tile"
                    style={{
                      background: `linear-gradient(160deg, ${tpl.palette.bg}, ${tpl.palette.accent}55)`,
                      color: tpl.palette.text,
                    }}
                    onClick={() => startInvite(tpl.id)}
                  >
                    <span className="badge">
                      {tpl.premium ? tt("templates.premium") : tt("templates.free")}
                    </span>
                    <strong>{tt(`categories.${tpl.category}`)}</strong>
                    <span>{tt("templates.use")}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {page === "templates" && (
          <section className="section">
            <h2>{tt("templates.title")}</h2>
            <div className="filters">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? "active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c === "all" ? tt("templates.title") : tt(`categories.${c}`)}
                </button>
              ))}
            </div>
            <div className="grid">
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="template-tile"
                  style={{
                    background: `linear-gradient(160deg, ${tpl.palette.bg}, ${tpl.palette.accent}66)`,
                    color: tpl.palette.text,
                  }}
                  onClick={() => startInvite(tpl.id)}
                >
                  <span className="badge">
                    {tpl.premium ? tt("templates.premium") : tt("templates.free")}
                  </span>
                  <strong>{tt(`categories.${tpl.category}`)}</strong>
                  <span>{tpl.premium ? tt("templates.locked") : tt("templates.use")}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === "pricing" && (
          <section className="section">
            <h2>{tt("pricing.title")}</h2>
            <p className="lead">{tt("pricing.subtitle")}</p>
            <div className="filters">
              <button
                type="button"
                className={`chip ${period === "monthly" ? "active" : ""}`}
                onClick={() => setPeriod("monthly")}
              >
                {tt("pricing.monthly")}
              </button>
              <button
                type="button"
                className={`chip ${period === "yearly" ? "active" : ""}`}
                onClick={() => setPeriod("yearly")}
              >
                {tt("pricing.yearly")}
              </button>
            </div>
            <div className="pricing-grid">
              {["free", "plus", "pro"].map((id) => {
                const plan = PLANS[id];
                const price =
                  id === "free"
                    ? 0
                    : period === "yearly"
                      ? plan.priceYearly
                      : plan.priceMonthly;
                const features = featureList(
                  locale,
                  id === "free" ? "featuresFree" : id === "plus" ? "featuresPlus" : "featuresPro"
                );
                return (
                  <article key={id} className={`plan ${id === "plus" ? "featured" : ""}`}>
                    <h3>{tt(`pricing.${id}`)}</h3>
                    <div className="price">
                      {price === 0
                        ? "0 ₺"
                        : `${price} ₺ ${period === "yearly" ? tt("pricing.perYear") : tt("pricing.perMonth")}`}
                    </div>
                    <ul>
                      {features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {user?.plan === id ? (
                      <button className="btn btn-outline" type="button" disabled>
                        {tt("pricing.current")}
                      </button>
                    ) : (
                      <button
                        className="btn btn-sage"
                        type="button"
                        disabled={busy || id === "free"}
                        onClick={() => subscribe(id)}
                      >
                        {tt("pricing.choose")}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="hint" style={{ marginTop: "1.5rem" }}>
              {tt("pricing.autoRenew")}
            </p>
            <p className="hint">{tt("pricing.trialNote")}</p>
            <button className="btn btn-outline" type="button" onClick={restore} style={{ marginTop: "1rem" }}>
              {tt("pricing.restore")}
            </button>
          </section>
        )}

        {page === "create" && (
          <div className="editor-layout">
            <div className="panel">
              <h2 style={{ fontFamily: "var(--display)", marginTop: 0 }}>{tt("editor.title")}</h2>
              {editsLeft != null && (
                <p className="hint">{tt("editor.editsLeft", { n: editsLeft })}</p>
              )}
              {showWatermark && <p className="hint">{tt("editor.watermarkNote")}</p>}
              {[
                ["title", "titleLabel"],
                ["hosts", "hostsLabel"],
                ["date", "dateLabel"],
                ["time", "timeLabel"],
                ["venue", "venueLabel"],
                ["address", "addressLabel"],
              ].map(([key, label]) => (
                <div className="field" key={key}>
                  <label htmlFor={key}>{tt(`editor.${label}`)}</label>
                  <input
                    id={key}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="field">
                <label htmlFor="message">{tt("editor.messageLabel")}</label>
                <textarea
                  id="message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <div className="cta-row">
                <button className="btn btn-sage" type="button" disabled={busy} onClick={saveInvite}>
                  {tt("editor.save")}
                </button>
                {activeInvite && (
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/?share=${activeInvite.id}`;
                      navigator.clipboard?.writeText(url);
                      alert(url);
                    }}
                  >
                    {tt("editor.share")}
                  </button>
                )}
              </div>
            </div>
            <div
              className="invite-card"
              style={{
                background: `linear-gradient(165deg, ${previewTemplate.palette.bg}, ${previewTemplate.palette.accent}40)`,
                color: previewTemplate.palette.text,
              }}
            >
              <span style={{ opacity: 0.75 }}>{tt("editor.preview")}</span>
              <h3>{form.title || tt("editor.inviteGuest")}</h3>
              <div className="hosts">{form.hosts}</div>
              <div className="meta">
                {[form.date, form.time].filter(Boolean).join(" · ")}
                <br />
                {form.venue}
                <br />
                {form.address}
                <br />
                <br />
                {form.message}
              </div>
              {showWatermark && <div className="watermark">Davetly</div>}
            </div>
          </div>
        )}

        {page === "account" && (
          <div className="panel account-box">
            <h2 style={{ fontFamily: "var(--display)", marginTop: 0 }}>{tt("account.title")}</h2>
            {user ? (
              <>
                <p>
                  <strong>{tt("account.email")}:</strong> {user.email}
                </p>
                <p>
                  <strong>{tt("account.plan")}:</strong> {tt(`pricing.${user.plan || "free"}`)}
                </p>
                <div className="cta-row" style={{ margin: "1rem 0" }}>
                  <button className="btn btn-outline" type="button" onClick={logout}>
                    {tt("account.logout")}
                  </button>
                  <button className="btn btn-outline" type="button" onClick={deleteAccount}>
                    {tt("account.deleteAccount")}
                  </button>
                </div>
                <h3>{tt("account.invites")}</h3>
                {invitations.length === 0 ? (
                  <p className="hint">{tt("account.empty")}</p>
                ) : (
                  <div className="invite-list">
                    {invitations.map((inv) => (
                      <div className="invite-row" key={inv.id}>
                        <div>
                          <strong>{inv.title || tt("editor.inviteGuest")}</strong>
                          <div className="hint">{tt(`categories.${inv.category}`)}</div>
                        </div>
                        <button
                          className="btn btn-outline"
                          type="button"
                          onClick={() => {
                            setActiveInvite(inv);
                            setSelectedTemplate(inv.templateId);
                            setForm((f) => ({
                              ...f,
                              title: inv.title,
                              hosts: inv.hosts,
                              date: inv.date,
                              time: inv.time,
                              venue: inv.venue,
                              address: inv.address,
                              message: inv.message,
                            }));
                            go("create");
                          }}
                        >
                          {tt("common.continue")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="email">{tt("account.email")}</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">{tt("account.password")}</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <div className="cta-row">
                  <button className="btn btn-sage" type="button" disabled={busy} onClick={() => handleAuth("login")}>
                    {tt("account.login")}
                  </button>
                  <button className="btn btn-outline" type="button" disabled={busy} onClick={() => handleAuth("register")}>
                    {tt("account.register")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {page === "privacy" && (
          <article className="legal">
            <h1>{tt("legal.privacyTitle")}</h1>
            <p>
              {tt("legal.lastUpdated")}: 2026-07-23
            </p>
            <p>
              Davetly collects account email, invitation content you create, language preference,
              and subscription status to provide the service. We do not sell personal data.
              On iOS, subscriptions are processed by Apple. You may delete your account in the app
              (Account → Delete account), which removes your invitations from our servers.
            </p>
            <p>
              Contact: kaygisizbaris9@gmail.com
            </p>
          </article>
        )}

        {page === "terms" && (
          <article className="legal">
            <h1>{tt("legal.termsTitle")}</h1>
            <p>
              {tt("legal.lastUpdated")}: 2026-07-23
            </p>
            <p>
              By using Davetly you agree to create lawful invitation content only. Free plan
              includes limited invitations and edits with watermark. Paid subscriptions unlock
              higher limits as described on the Pricing page and renew automatically until cancelled
              in App Store, Google Play, or your web account. Payments are final subject to
              platform refund rules. EULA: Standard Apple Licensed Application End User License
              Agreement applies for iOS where required.
            </p>
          </article>
        )}

        {error && (
          <p className="warn" style={{ textAlign: "center", padding: "0 1rem 1.5rem" }}>
            {error}
          </p>
        )}
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Davetly</span>
        <div className="nav">
          <button type="button" onClick={() => go("privacy")}>
            {tt("navPrivacy")}
          </button>
          <button type="button" onClick={() => go("terms")}>
            {tt("navTerms")}
          </button>
        </div>
      </footer>
    </div>
  );
}
