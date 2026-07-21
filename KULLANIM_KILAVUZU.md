# YakınMarket — Kullanım Kılavuzu

Bu kılavuz uygulamadaki ekranları **adım adım** anlatır. Uygulama içinde de **Kılavuz** menüsünden aynı akışı görebilirsin.

---

## 1) Ana sayfa (Landing)

**Ne görürsün:** Büyük marka adı **YakınMarket**, kısa vaat (“Yakınındaki stok, dakikalar içinde”), üç düğme ve dört kapı kartı.

**Ne yaparsın:**
1. Alışveriş için **Müşteri olarak başla**
2. İşletme için **Satıcı paneli**
3. Öğrenmek için **Kullanım kılavuzu**
4. Veya üst menüden **Profiller / Analitik**

---

## 2) Müşteri paneli — konum

**Ekran:** Sol liste + sağ harita

1. **Konumumu aç** düğmesine bas
2. Tarayıcı izin ister → ver → haritada sarı nokta senin konumun
3. İzin vermezsen Kadıköy demo konumu kullanılır
4. Bu işlem arka planda `location_open` olayı yazar (Analitik’te görünür)

---

## 3) Müşteri paneli — mağaza & ürün

1. **Mağazalar** sekmesinde mesafe, ~dk süre, stokta ürün sayısı listelenir
2. Haritada renkler: market yeşil, bakkal turuncu, sütçü mavi
3. Arama kutusuna örn. `süt` yaz → hangi fiziksel mağazada var filtreler
4. **Ürünler** sekmesinde stok etiketi:
   - yeşil: stokta
   - turuncu: az kaldı
   - mavi: yok, gelme tarihi var
   - kırmızı: yok, tarih belirsiz

---

## 4) Müşteri — detay, abone, sipariş

1. Mağazaya tıkla → altta detay yaprağı açılır (adres, ETA, puan, ürünler)
2. **Mağazaya abone ol** → o işletmeyi takip edersin
3. **Sepete** → **Sipariş ver**
4. **Siparişler** sekmesinde durum: Hazırlanıyor → Yolda → Teslim edildi

---

## 5) Satıcı paneli

1. Üstten **Satıcı** seç
2. Demo satıcıyı değiştir (farklı mağazalar)
3. **Stok yönetimi:** adet güncelle, yoksa “gelme tarihi” gir, Kaydet
4. **Siparişler:** Yola çıktı / Teslim edildi
5. **Aboneler:** kim, hangi ilçe, son aktiflik, koordinat
6. **İşletme profili:** adres, saat, satıcı bio, onay durumu

---

## 6) Profiller

- Sol: müşteri listesi
- Sağ: seçili müşterinin konumu, tercihleri, abone mağazaları
- Alt: tüm işletme / satıcı kartları

---

## 7) Analitik — aboneler nerede belli olur?

1. Haritada yeşil daireler = müşteri konumları (büyük = daha çok abonelik)
2. İlçe çubukları = talep / olay yoğunluğu
3. Olay türleri: `location_open`, `search`, `store_view`, `subscribe`, `order_placed`
4. Mağaza abone sıralaması
5. Son olay tablosu (canlı akış)

**Nasıl dolar?** Müşteri panelinde konum aç, ara, mağazaya bak, abone ol, sipariş ver — kayıtlar buraya düşer.

---

## Hızlı kontrol listesi

- [ ] Ana sayfadan Müşteri’ye gir
- [ ] Konum aç
- [ ] “süt” ara, en yakın stoklu mağazayı seç
- [ ] Abone ol + sipariş ver
- [ ] Satıcıda stok güncelle / siparişi ilerlet
- [ ] Analitik’te olay ve haritayı kontrol et
