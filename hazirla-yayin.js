/* OpenPlay — yayın klasörü hazırlar (yalnızca site dosyaları) */
const fs = require('fs');
const path = require('path');

const KOK = __dirname;
const CIKTI = path.join(KOK, '_deploy');

const AL = [
  'index.html', 'admin.html', 'hub.html', 'robots.txt', 'sitemap.xml',
  '_headers', '_redirects', 'favicon.ico'
];
const KLASOR = ['css', 'js', 'data', 'images', 'ders'];

if (fs.existsSync(CIKTI)) fs.rmSync(CIKTI, { recursive: true, force: true });
fs.mkdirSync(CIKTI, { recursive: true });

let dosya = 0, toplam = 0;

for (const f of AL) {
  const k = path.join(KOK, f);
  if (fs.existsSync(k)) {
    fs.copyFileSync(k, path.join(CIKTI, f));
    dosya++; toplam += fs.statSync(k).size;
  }
}

for (const d of KLASOR) {
  const kaynak = path.join(KOK, d);
  if (!fs.existsSync(kaynak)) continue;
  fs.cpSync(kaynak, path.join(CIKTI, d), { recursive: true });
}

// say
(function say(b) {
  for (const e of fs.readdirSync(b, { withFileTypes: true })) {
    const p = path.join(b, e.name);
    if (e.isDirectory()) say(p);
    else { dosya++; toplam += fs.statSync(p).size; }
  }
})(CIKTI);

console.log('Klasor : ' + CIKTI);
console.log('Dosya  : ' + dosya);
console.log('Boyut  : ' + (toplam / 1024 / 1024).toFixed(2) + ' MB');

// 25 MiB uyarisi
(function uyari(b) {
  for (const e of fs.readdirSync(b, { withFileTypes: true })) {
    const p = path.join(b, e.name);
    if (e.isDirectory()) uyari(p);
    else {
      const s = fs.statSync(p).size;
      if (s > 25 * 1024 * 1024) console.log('  ⚠️ 25MB+: ' + p.replace(CIKTI, ''));
      if (s > 5 * 1024 * 1024) console.log('  ℹ️ 5MB+: ' + p.replace(CIKTI, '') + ' (' + (s/1024/1024).toFixed(1) + 'MB)');
    }
  }
})(CIKTI);
