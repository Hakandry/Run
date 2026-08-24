# Koç — Kişisel Koşu & Yürüyüş Koçu (PWA)

Koşularını ve yürüyüşlerini kaydettiğin, nabız / mesafe / tempo değerlerini dönemler
arasında kıyaslayan küçük bir PWA. Derleme adımı yok: saf HTML + CSS + ES modülleri.
Veriler yalnızca cihazda (`localStorage`) tutulur, hiçbir yere gönderilmez.

**Sürüm:** v0.3.0

## Neler var

- **Kayıt:** tür (koşu/yürüyüş), tarih, mesafe, süre, ortalama & maksimum nabız,
  zorlanma (1–10) ve not. Form yazarken tempoyu ve nabız verimini canlı gösterir,
  gerçekçi olmayan girdileri (2 dk/km altı tempo, ortalamadan düşük maksimum nabız vb.) reddeder.
- **Özet:** koç notu, bu hafta vs. geçen hafta (mesafe, süre, tempo, nabız), haftalık
  hedef yüzdesi, son 12 aktivitenin grafiği ve kişisel rekorlar.
- **Antrenman puanı (0–10):** her kayıt, yaşın ve kilon referans alınarak puanlanır;
  puan ekranında renkli halka, kademe adı ve puanın nasıl oluştuğunun dökümü yer alır.
  Ayrıntı için aşağıdaki *Puanlama* bölümü.
- **Kalori ve adım:** her aktivitenin kalorisi kilonla otomatik hesaplanır; adım
  saatinden girilebilir, girilmezse boyundan tahmin edilir. Özette haftalık kalori
  ve adım kartları, toplam enerjinin kaç kiloya denk geldiğini gösteren motivasyon
  kartı yer alır.
- **Kıyas:** son 7/14/30 gün ile bir önceki eşit dönem, son aktivite vs. aynı türdeki
  bir önceki aktivite, koşu/yürüyüş ortalamaları.
- **Nabız verimi (atış/km):** `ortalama nabız × tempo`. Aynı mesafeyi kaç kalp atışıyla
  götürdüğünü söyler; düştükçe kondisyon iyileşiyor demektir.
- **Hız gösterimi:** varsayılan **km/sa** (araç göstergesi gibi); Ayarlar'dan dk/km
  temposuna çevrilebilir. Seçim; özet, liste, kıyas tabloları, rekorlar, grafik ve
  puan ekranının tamamına uygulanır. Fark yüzdeleri gösterilen büyüklüğe göre
  hesaplanır: km/sa'da artış, dk/km'de azalış iyileşme sayılır.
- **Liste:** düzenleme, silme, türe göre filtre.
- **Veri:** JSON dışa/içe aktarma (içe aktarma birleştirir), tümünü silme.
- **PWA:** ana ekrana eklenebilir, service worker ile çevrimdışı açılır.

Ok yönü değişimin işaretini (arttı/azaldı), renk ise iyileşme mi kötüleşme mi olduğunu
gösterir — tempo, nabız ve atış/km için düşük olan iyidir.

## Çalıştırma

Modüller ve service worker `file://` üzerinden çalışmaz, basit bir sunucu yeterli:

```bash
npx http-server -p 8080 -c-1 .
# http://localhost:8080
```

Yayınlamak için: depoyu GitHub Pages'e ver, ek yapılandırma gerekmiyor.

## Dosya düzeni

```
index.html              arayüz iskeleti (5 sekme)
css/styles.css          tema ve bileşen stilleri
js/app.js               yönlendirme, form, render, olaylar
js/storage.js           localStorage katmanı, doğrulama, dışa/içe aktarma
js/stats.js             türetilmiş metrikler, dönem/rekor hesapları, koç mesajı
js/chart.js             bağımlılıksız SVG grafik
js/format.js            tr-TR biçimlendiriciler
sw.js                   çevrimdışı önbellek
manifest.webmanifest    PWA manifesti
```

## Kalori, adım ve kilo ipucu

**Kalori** ACSM metabolik denklemlerinden gelir: hız → VO2 → MET, ardından
`kcal/dk = MET × 3,5 × kilo / 200`. İki değer tutulur:

- **Brüt kalori** — seans boyunca harcanan toplam enerji (listede ve çiplerde görünen).
- **Net kalori** — aynı sürede zaten harcayacağın dinlenme metabolizması (1 MET)
  düşülmüş hali. Kilo eşdeğeri hesabında bu kullanılır.

**Adım**, saatinden girilebilir. Girilmezse boydan tahmin edilir: adım uzunluğu
yürüyüşte ≈ `0,415 × boy`, koşuda ≈ `0,50 × boy` (cm); hıza göre ±%20 bandında
küçük bir düzeltme uygulanır. Boy girilmemişse yetişkin ortalaması kullanılır
(yürüyüş 0,72 m, koşu 0,95 m). Tahmini değerler listede `(~)` ile işaretlenir.

**Kilo ipucu** özet ekranındaki kartta: toplam net kalori ÷ 7.700 = kaba yağ
eşdeğeri; çubuk bir sonraki kiloya ne kadar kaldığını gösterir. 7.700 kcal/kg
kabulü Wishnofsky'nin 1958 tarihli hesabıdır — pratik bir kestirimdir, ölçüm
değildir; gerçek kilo değişimi beslenmeye, su dengesine ve metabolik uyuma bağlıdır.
Kart bunu kendi üzerinde de yazar.

## Renk sistemi

Her ölçünün sabit bir rengi var; aynı renk özet kartında, listede, kıyas tablosunda,
rekorlarda ve grafikte aynı şeyi gösteriyor:

| Renk | Anlamı |
|---|---|
| Turkuaz `--run` | Koşu |
| Yeşil `--walk` | Yürüyüş |
| Açık mavi `--dist` | Mesafe |
| Mor `--time` | Süre |
| Amber `--speed` | Hız / tempo |
| Mercan `--hr` | Nabız |
| Turuncu `--energy` | Enerji, nabız verimi |
| Zümrüt `--goal` | Haftalık hedef |

Puan ekranındaki renkler bundan bağımsızdır: orada renk kademeyi gösterir
(Çok hafif → Zirve). Liste kartlarının sol şeridi ve başlığı aktivite türünün,
puan rozeti ise kademenin rengini alır. Sekme çubuğunda her sekmenin kendi rengi vardır.

## Puanlama

Her aktivite 0–10 arası puanlanır. Puan beş bileşenin ağırlıklı ortalamasıdır;
hesaplanamayan bir bileşenin ağırlığı diğerlerine dağıtılır.

| Bileşen | Ağırlık | Neye bakar |
|---|---|---|
| Yük | %35 | Banister TRIMP — süre × nabız rezervi oranı × üstel şiddet katsayısı |
| Şiddet | %25 | Ortalama nabzın rezerv içindeki yeri; koşuda %60–85, yürüyüşte %40–65 bandı en yüksek puanı alır |
| Hacim | %20 | Şiddetle ağırlıklı dakika (WHO/ACSM mantığı) ve mesafe |
| Enerji | %10 | ACSM metabolik denklemlerinden MET ve kilo ile kalori |
| Verim | %10 | Nabız verimin (atış/km), aynı türdeki son 10 kaydının ortancasına göre |

Profil değerlerinin rolü:

- **Yaş** — maksimum nabız girilmemişse Tanaka denklemiyle tahmin edilir: `208 − 0,7 × yaş`.
- **Kilo** — kalori ve MET hesabına girer (`kcal/dk = MET × 3,5 × kg / 200`).
- **Boy** — adım tahmininde adım uzunluğunu belirler.
- **Dinlenme nabzı** — nabız rezervi oranının paydasında; girilmezse 60 varsayılır.
- **Cinsiyet** — TRIMP'in üstel katsayısını belirler (erkek 0,64·e^1,92x, kadın 0,86·e^1,67x).

Nabız girilmediğinde yük Foster'ın session-RPE yöntemine (zorlanma × süre), şiddet ise
zorlanma notuna göre tahmin edilir.

Kademeler ve renkleri: Çok hafif (0–2,9) · Hafif (3–4,9) · Dengeli (5–6,4) ·
Verimli (6,5–7,9) · Güçlü (8–8,9) · Zirve (9–10).

### Kaynaklar

- Tanaka H. ve ark. (2001), *J Am Coll Cardiol* — maksimum nabız denklemi (208 − 0,7 × yaş)
- Banister E.W. — TRIMP (training impulse), nabız rezervi tabanlı üstel yük modeli
- Foster C. ve ark. (2001) — session-RPE yöntemi (RPE × süre)
- ACSM metabolik denklemleri — yürüyüş/koşu VO2 ve MET hesabı
- ACSM şiddet sınıflaması (%HRR) ve WHO/ACSM haftalık 150 dakika orta şiddet önerisi
- Wishnofsky M. (1958) — 1 lb yağ ≈ 3.500 kcal (1 kg ≈ 7.700 kcal) kabulü
- Adım uzunluğu için boy katsayıları (yürüyüş ≈ 0,415 × boy, koşu ≈ 0,50 × boy)

> Bu puan bir sağlık ölçütü değil, antrenman geri bildirimidir. Nabız denklemleri
> ±7–10 atım hata payı taşır; rahatsızlık halinde hekime danış.

## Gizlilik

- Aktivite kayıtları yalnızca tarayıcının `localStorage` alanında, cihazda tutulur.
  Depoda veri yoktur; deponun public olması kayıtları görünür yapmaz.
- Uygulama hiçbir sunucuya veri göndermez. Koddaki tek ağ isteği, service worker'ın
  kendi dosyalarını (HTML/CSS/JS) önbelleğe almasıdır; farklı bir alan adına istek yok.
  Analitik, izleyici, harici font veya CDN kullanılmıyor.
- Linki bilen biri uygulamayı açabilir ama kendi boş kopyasını görür; veriler
  tarayıcı bazlıdır, paylaşılmaz.
- **Dışa aktar** ile alınan `koc-yedek-*.json` dosyası tüm kayıtlarını içerir;
  depoya eklenmemesi için `.gitignore`'a alındı. Yedeği paylaşırken dikkat et.
- Tarayıcı verilerini temizlemek kayıtları siler. Düzenli olarak dışa aktarıp
  yedek almak iyi olur.

## Güncelleme

Yeni sürüm `main` dalına gönderildiğinde GitHub Pages 1–2 dakika içinde yayınlar.
Ana ekrandaki uygulama bunu kendi yakalar: service worker güncellemeyi görünce
"Yeni sürüm hazır" der ve sayfayı bir kez yeniler. Uygulama açıkken saatte bir ve
uygulamaya her geri dönüldüğünde kontrol edilir. Her sürümde `sw.js` içindeki
`VERSION` sabiti yükseltilmelidir — eski önbellek o sayede temizlenir.

## Yol haritası (sonraki sürümler)

- v0.0.3 — hafta/ay bazlı takvim görünümü, aktivite başına etiket
- v0.0.4 — GPS ile canlı kayıt (mesafe/süre otomatik)
- v0.0.5 — nabız bölgeleri (dinlenme/maks. nabza göre) ve bölge dağılımı
- v0.0.6 — hedef planlama (5K/10K hazırlık) ve haftalık program önerisi
