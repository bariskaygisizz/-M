const STEPS = [
  {
    id: 1,
    role: 'Müşteri',
    title: 'Uygulamayı aç ve paneli seç',
    screen: 'Ana giriş (Landing)',
    body: 'YakınMarket açılınca dört kapı görürsün: Müşteri, Satıcı, Profiller, Analitik. Alışveriş için Müşteri panelini seç. İlk kez kullanıyorsan bu Kılavuz ekranından adımları izle.',
    tips: ['Demo hesaplar hazırdır — giriş zorunlu değil.', 'Mobilde de aynı menü üstte yer alır.']
  },
  {
    id: 2,
    role: 'Müşteri',
    title: 'Konumunu aç',
    screen: 'Müşteri paneli → Konumumu aç',
    body: '“Konumumu aç”a bas. Tarayıcı izin ister. İzin verirsen gerçek konumun kullanılır; vermezsen Kadıköy demo konumu ile devam edilir. Bu an veri toplama olayına `location_open` olarak yazılır — abone yoğunluğu buradan belli olur.',
    tips: ['Sarı nokta haritada seni gösterir.', 'Her konum açılışı analitikte kayda geçer.']
  },
  {
    id: 3,
    role: 'Müşteri',
    title: 'Yakındaki mağaza ve ürünü bul',
    screen: 'Harita + Mağazalar / Ürünler',
    body: 'Haritada market (yeşil), bakkal (turuncu), sütçü (mavi) görünür. Solda mesafe, stokta ürün sayısı ve tahmini teslimat süresi (dk) listelenir. Üstte “süt”, “ekmek” gibi ara — hangi fiziksel mağazada malzeme var anında çıkar.',
    tips: ['Ürünler sekmesinde stok durumu renkli etiketlidir.', 'Stok yoksa “ne zaman gelir” tarihi gösterilir.']
  },
  {
    id: 4,
    role: 'Müşteri',
    title: 'Mağaza detayı, abonelik ve sipariş',
    screen: 'Mağaza detay yaprağı',
    body: 'Mağazaya tıkla: adres, mesafe, ETA, puan, ürün stokları açılır. “Mağazaya abone ol” ile takip et — stok ve kampanya için bağlanırsın. Sepete ekle → Sipariş ver. Siparişler sekmesinde hazırlanıyor / yolda / teslim durumunu takip et.',
    tips: ['Tek siparişte tek mağaza.', 'ETA mesafe + mağaza teslimat tabanına göre hesaplanır.']
  },
  {
    id: 5,
    role: 'Satıcı',
    title: 'Satıcı paneline geç',
    screen: 'Satıcı paneli',
    body: 'Üst menüden Satıcı’yı seç. Demo satıcıyı değiştirerek farklı işletmeleri dene (Güneş Market, Boğaz Sütçü vb.). Stok yönetimi, siparişler, aboneler ve işletme profili sekmeleri vardır.',
    tips: ['Stok sayısını güncelle, yoksa gelme tarihi gir.', 'Siparişi “Yola çıktı” / “Teslim edildi” yap.']
  },
  {
    id: 6,
    role: 'Satıcı',
    title: 'Abonelerini gör',
    screen: 'Satıcı → Aboneler',
    body: 'Kim abone, hangi ilçede, son ne zaman aktif — liste halinde. Bu liste Analitik’teki harita ile birleşince “abonelerim nerede yoğun?” sorusu cevaplanır.',
    tips: ['Abone sayısı mağaza kartında da görünür.', 'Doğrulanmış işletmeler rozetli görünür.']
  },
  {
    id: 7,
    role: 'Sistem',
    title: 'Profilleri incele',
    screen: 'Profiller',
    body: 'Müşteri profili: konum, tercihler, abone mağazalar, sipariş geçmişi. İşletme profili: adres, çalışma saati, satıcı bilgisi, abone sayısı, onay durumu. İki panel aynı ekosistemin iki yüzüdür.',
    tips: ['Müşteri listesinden birini seçerek detayı aç.', 'İşletme kartları tüm satıcıları yan yana gösterir.']
  },
  {
    id: 8,
    role: 'Sistem',
    title: 'Veri toplama ve abone haritası',
    screen: 'Analitik',
    body: 'Burada abonelerin / müşterilerin harita üzerindeki dağılımı, ilçe yoğunluk çubukları, olay türleri (konum, arama, görüntüleme, abone, sipariş) ve mağaza abone sıralaması vardır. Kullanıcı her önemli aksiyonda veri bırakır; işletmeler “nerede talep var?”ı görür.',
    tips: ['Müşteri panelinde konum aç / ara — olaylar buraya düşer.', 'Yeşil daire büyüdükçe abonelik artar.']
  }
];

export default function GuidePanel() {
  return (
    <div className="guide-layout">
      <header className="section-intro guide-hero">
        <p className="eyebrow">Kullanım kılavuzu</p>
        <h2>Adım adım ekranlar</h2>
        <p>
          YakınMarket, klasik e-ticaretten farklı olarak önce konum ve fiziksel mağaza stokunu gösterir.
          Aşağıda her ekranı sırayla anlatıyoruz.
        </p>
      </header>

      <div className="guide-flow">
        {STEPS.map((step, index) => (
          <article key={step.id} className="guide-step animate-in" style={{ animationDelay: `${index * 0.05}s` }}>
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

      <section className="soft-block guide-summary">
        <h3>Kısa özet</h3>
        <ol>
          <li>Konum aç → yakındaki fiziksel mağazalar</li>
          <li>Ürün / stok / kaç dk gelir gör</li>
          <li>Sipariş ver ve takip et</li>
          <li>Satıcı stok ve siparişi yönetir</li>
          <li>Abonelik + olaylar ile “nerede talep var” netleşir</li>
        </ol>
      </section>
    </div>
  );
}
