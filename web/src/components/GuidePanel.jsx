const STEPS = [
  {
    id: 1,
    role: 'Misafir',
    title: 'Harita ilk ekran',
    screen: 'Misafir Keşif',
    body: 'YakınMarket açılır açılmaz tam ekran harita gelir. Mağazaları, ürün stoklarını, ETA bilgisini ve mağaza detayını giriş yapmadan görebilirsin.',
    tips: ['Stok görüntüleme misafire açık.', 'Konum vermezsen Kadıköy demo konumu kullanılır.']
  },
  {
    id: 2,
    role: 'Müşteri',
    title: 'Giriş gereken müşteri aksiyonları',
    screen: 'AuthModal',
    body: 'Sipariş vermek, yorum yapmak ve satıcıya mesaj göndermek için müşteri hesabı açılır. Misafir bu aksiyonlara tıklayınca müşteri giriş/kayıt modalı gelir.',
    tips: ['Demo: deniz@ornek.com / demo123.', 'Oturum ym_token ve ym_user ile saklanır.']
  },
  {
    id: 3,
    role: 'Satıcı',
    title: 'Satıcı kayıt zorunlu',
    screen: 'Satıcı Giriş/Kayıt',
    body: 'Satıcı haritası, ürün yükleme, stok/fiyat, reklam postu, sipariş yönetimi ve AI chatbot sadece satıcı hesabıyla açılır. Kayıtta mağaza adı, tür, ilçe ve adres alınır.',
    tips: ['Satıcı açılışında kayıt modu öne çıkar.', 'Demo: ayse@gunesmarket.tr / demo123.']
  },
  {
    id: 4,
    role: 'Keşfet',
    title: 'Feed akışı',
    screen: 'Keşfet',
    body: 'Mağaza postları Instagram benzeri dikey kartlarla görünür. Reklam rozeti, fotoğraf/video, beğeni, yorum ve mesaj aksiyonları vardır.',
    tips: ['Yorum ve mesaj auth gate ile korunur.', 'Satıcı panelinden yayınlanan post feed’e düşer.']
  },
  {
    id: 5,
    role: 'Satıcı',
    title: 'AI chatbot',
    screen: 'Satıcı haritası',
    body: 'Sağ alttaki AI Kılavuz stok, fiyat ve reklam önerileri verir. Backend varsa /api/market/chatbot çağrılır; demo modda yerel stok bağlamıyla cevap üretir.',
    tips: ['Azalan stokları sor.', 'Reklam metni için kısa prompt yaz.']
  },
  {
    id: 6,
    role: 'Analitik',
    title: 'Talep ve abone haritası',
    screen: 'Analitik',
    body: 'Konum, arama, mağaza görüntüleme, abonelik ve sipariş olayları yoğunluk haritasına dönüşür. Satıcılar hangi ilçede talep oluştuğunu görür.',
    tips: ['Teal daireler müşteri/abone yoğunluğunu gösterir.', 'İlçe barları canlı olay sayılarını özetler.']
  }
];

export default function GuidePanel() {
  return (
    <div className="overlay-page guide-layout">
      <header className="section-intro guide-hero glass-panel">
        <p className="eyebrow">Kullanım kılavuzu</p>
        <h2>Map-first YakınMarket akışı</h2>
        <p>
          İstanbul ulaşım haritalarındaki gibi önce canvas, sonra yüzen paneller. Misafir keşif serbest;
          satıcı araçları ve sosyal etkileşimler hesapla korunur.
        </p>
      </header>

      <div className="guide-flow">
        {STEPS.map((step, index) => (
          <article key={step.id} className="guide-step glass-panel animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="guide-num">{step.id}</div>
            <div className="guide-body">
              <div className="guide-tags">
                <span className="chip">{step.role}</span>
                <span className="screen-tag">{step.screen}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <ul>
                {step.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <div className="guide-mock" aria-hidden="true">
              <div className="mock-top">
                <span />
                <span />
                <span />
              </div>
              <div className="mock-content">
                <div className="mock-brand">YakınMarket</div>
                <div className="mock-line short" />
                <div className="mock-line" />
                <div className="mock-map" />
                <div className="mock-pills">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="soft-block guide-summary glass-panel">
        <h3>Kısa özet</h3>
        <ol>
          <li>Misafir haritada ürün/stok/ETA görür.</li>
          <li>Müşteri giriş yapınca sipariş, yorum ve mesaj açılır.</li>
          <li>Satıcı kayıt olmadan ürün, stok, reklam ve chatbot araçlarına giremez.</li>
          <li>Feed ve analitik harita üstü ekosistemi tamamlar.</li>
        </ol>
      </section>
    </div>
  );
}
