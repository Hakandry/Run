# Koç — Kişisel Koşu & Yürüyüş Koçu (PWA)

Koşularını ve yürüyüşlerini kaydettiğin, nabız / mesafe / tempo değerlerini dönemler
arasında kıyaslayan küçük bir PWA. Derleme adımı yok: saf HTML + CSS + ES modülleri.
Veriler yalnızca cihazda (`localStorage`) tutulur, hiçbir yere gönderilmez.

**Sürüm:** v0.0.2

## Neler var

- **Kayıt:** tür (koşu/yürüyüş), tarih, mesafe, süre, ortalama & maksimum nabız,
  zorlanma (1–10) ve not. Form yazarken tempoyu ve nabız verimini canlı gösterir,
  gerçekçi olmayan girdileri (2 dk/km altı tempo, ortalamadan düşük maksimum nabız vb.) reddeder.
- **Özet:** koç notu, bu hafta vs. geçen hafta (mesafe, süre, tempo, nabız), haftalık
  hedef yüzdesi, son 12 aktivitenin grafiği ve kişisel rekorlar.
- **Kıyas:** son 7/14/30 gün ile bir önceki eşit dönem, son aktivite vs. aynı türdeki
  bir önceki aktivite, koşu/yürüyüş ortalamaları.
- **Nabız verimi (atış/km):** `ortalama nabız × tempo`. Aynı mesafeyi kaç kalp atışıyla
  götürdüğünü söyler; düştükçe kondisyon iyileşiyor demektir.
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
