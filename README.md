# OpenPlay + DersPark

OpenPlay: acik kaynak oyunlar platformu.
DersPark: PDF/gorsel yuklenen, kitap gibi okunup soru cozulen, zamanlayicili ve AI koclu calisma sitesi.

## Yapilar
- `index.html`, `admin.html`, `hub.html` - OpenPlay oyun sitesi
- `js/site.js`, `js/admin.js` - OpenPlay mantigi
- `css/styles.css`, `css/animations.css`, `css/responsive.css` - OpenPlay tasarimi
- `data/games.json` (bos), `data/categories.json`, `data/settings.json`
- `ders/` - DersPark calisma sitesi (index.html, css/desk.css, js/masa.js, images/logo.svg)
- `ders/js/kanallar.js` - dogrulanmis YouTube kanal listesi
- `images/` - logo, banner, favicon

## Gereksinimler
- Modern tarayici (Chrome/Edge/Firefox)
- Internet baglantisi (PDF.js, Tesseract.js, Google Fonts CDN)

## Yerel calistirma
Herhangi bir HTTP sunucusu ile:
```
python -m http.server 8080
```
Sonra http://localhost:8080/ adresini acin.

## GitHub Pages
- GitHub Pages'a yukleyin (root klasoru)
- SPA fallback icin `_redirects` veya `404.html` gerekebilir
- `ders/` alt klasoru `/ders/` olarak erisilebilir

## Veri saklama
- DersPark verileri tarayicida IndexedDB'de saklanir (PDF, OCR, sorular)
- Veri kaybi icin duzenli "Yedek Al" kullanin

## Admin
- Kullanici: openplay
- Sifre: OpenPlay#2026xk
- NOT: Production'da admin bilgisi guvenli backend'e tasinmali

## Lisans
MIT