export function FishCard({ fish, onOpen }) {
  return (
    <button type="button" className="fish-card" onClick={() => onOpen(fish)}>
      <div className="fish-thumb-wrap">
        <img className="fish-thumb" src={fish.image || `/fish/${fish.id}.svg`} alt="" />
        <div className="fish-swim" />
      </div>
      <div className="tag">{fish.type}</div>
      <h3>{fish.name}</h3>
      <div className="sci">{fish.scientific}</div>
      <div className="meta">
        {fish.calories} kcal · {fish.avgWeight}
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: "0.85rem" }}>
        {fish.regions.join(" · ")}
      </div>
    </button>
  );
}

export function StatGrid({ fish }) {
  const items = [
    { label: "Kalori", value: `${fish.calories}`, unit: "kcal/100g" },
    { label: "Protein", value: `${fish.protein}g` },
    { label: "Yağ", value: `${fish.fat}g` },
    { label: "Omega-3", value: fish.omega3 },
  ];
  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div className="stat" key={item.label}>
          <div className="label">{item.label}</div>
          <div className="value">{item.value}</div>
          {item.unit && (
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              {item.unit}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FishDetail({ fish, onBack }) {
  if (!fish) return null;
  return (
    <div>
      <button type="button" className="btn" onClick={onBack}>
        ← Geri
      </button>
      <div className="detail-hero" style={{ marginTop: "1rem" }}>
        <img
          src={fish.image || `/fish/${fish.id}.svg`}
          alt={fish.name}
          className="detail-img"
        />
        <div className="tag" style={{ fontFamily: "var(--mono)", color: "var(--accent)" }}>
          {fish.type} · {fish.season}
        </div>
        <h2
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            margin: "0.4rem 0",
          }}
        >
          {fish.name}
        </h2>
        <p className="sci muted">{fish.scientific}</p>
        <p style={{ lineHeight: 1.55 }}>{fish.summary}</p>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Kimlik</h3>
        <div className="stat-grid">
          <div className="stat">
            <div className="label">Ağırlık</div>
            <div className="value" style={{ fontSize: "1rem" }}>
              {fish.avgWeight}
            </div>
          </div>
          <div className="stat">
            <div className="label">Boy</div>
            <div className="value" style={{ fontSize: "1rem" }}>
              {fish.avgLength}
            </div>
          </div>
          <div className="stat">
            <div className="label">Bölge</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {fish.regions.join(", ")}
            </div>
          </div>
          <div className="stat">
            <div className="label">Lezzet</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {fish.taste}
            </div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Besin (100 g)</h3>
        <StatGrid fish={fish} />
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Olası faydalar</h3>
        <ul className="listy good">
          {fish.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <h3 className="section-title">Dikkat / zararlar</h3>
        <ul className="listy warn">
          {fish.harms.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h3 className="section-title">İpucu</h3>
        <p>{fish.tip}</p>
        <p className="disclaimer">
          Bilgilendirme amaçlıdır; tıbbi teşhis veya diyet tedavisi değildir.
        </p>
      </div>
    </div>
  );
}

export function AuthPanel({ mode, onSubmit, onSwitch, error, busy }) {
  return (
    <form
      className="panel auth-panel"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSubmit(String(fd.get("username") || ""), String(fd.get("password") || ""));
      }}
    >
      <h2 className="section-title">{mode === "login" ? "Giriş Yap" : "Hesap Oluştur"}</h2>
      <p className="muted">
        Abonelik ve tarama hakların hesabına bağlanır. Kim ödedi / kim ücretsiz net görülür.
      </p>
      <label className="field">
        <span>Kullanıcı adı</span>
        <input name="username" autoComplete="username" required minLength={3} />
      </label>
      <label className="field">
        <span>Şifre</span>
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
        />
      </label>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Bekle…" : mode === "login" ? "Giriş" : "Kayıt Ol"}
      </button>
      <button type="button" className="btn" onClick={onSwitch}>
        {mode === "login" ? "Hesabın yok mu? Kayıt ol" : "Hesabın var mı? Giriş yap"}
      </button>
    </form>
  );
}

export function Paywall({ plans, user, onBuy, onClose, busy }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="section-title">Premium Abonelik</h2>
        <p className="muted">
          Merhaba <strong>{user?.username}</strong> — planın:{" "}
          <span className="meta">{user?.plan}</span>
          {user?.plan === "free" && user?.scansLeft != null
            ? ` · kalan tarama: ${user.scansLeft}`
            : ""}
        </p>
        <div className="plan-grid">
          {(plans || [])
            .filter((p) => p.id !== "free")
            .map((p) => (
              <div className="plan-card" key={p.id}>
                <div className="tag">{p.price}</div>
                <h3>{p.name}</h3>
                <ul className="listy good">
                  {(p.features || []).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || user?.plan === "premium"}
                  onClick={() => onBuy(p.id)}
                >
                  {user?.plan === "premium" ? "Aktif" : "Abone Ol"}
                </button>
              </div>
            ))}
        </div>
        <p className="disclaimer">
          App Store’da gerçek ödeme StoreKit / RevenueCat ile alınır. Bu sürümde
          test aboneliği hesabına işlenir; kim ödedi sunucuda kullanıcı adına bağlıdır.
        </p>
        <button type="button" className="btn" onClick={onClose}>
          Kapat
        </button>
      </div>
    </div>
  );
}

export function OceanSim() {
  return (
    <div className="ocean-sim" aria-hidden="true">
      <div className="wave w1" />
      <div className="wave w2" />
      <div className="wave w3" />
      <div className="bubble b1" />
      <div className="bubble b2" />
      <div className="bubble b3" />
      <div className="swim-fish f1" />
      <div className="swim-fish f2" />
      <div className="swim-fish f3" />
    </div>
  );
}
