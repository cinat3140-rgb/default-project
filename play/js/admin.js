/* ==========================================================================
   OpenPlay — Yönetim Paneli (bağımsız, temiz)
   ========================================================================== */

(function () {
  'use strict';

  const $  = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const LS = { oyun:'op_oyun', kat:'op_kat', ayar:'op_ayar', tema:'op_tema', oturum:'op_oturum' };

  let OYUN = [], KATEGORI = [], AYAR = {};
  let OTURUM = false;

  /* ---------- yardımcılar ---------- */
  function oku(k, v) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : v; } catch (e) { return v; } }
  function yaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function bildir(m, tip) {
    const kap = $('#bildirimler'); if (!kap) return;
    const d = document.createElement('div');
    d.className = 'bildirim' + (tip ? ' ' + tip : '');
    d.textContent = m; kap.appendChild(d);
    setTimeout(() => { d.classList.add('gizle'); setTimeout(() => d.remove(), 300); }, 3200);
  }
  const slugify = (s) => String(s||'').toLocaleLowerCase('tr')
    .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ı/g,'i').replace(/ö/g,'o')
    .replace(/ş/g,'s').replace(/ü/g,'u').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const bugun = () => new Date().toISOString().slice(0,10);

  function kaydet() {
    yaz(LS.oyun, OYUN); yaz(LS.kat, KATEGORI); yaz(LS.ayar, AYAR);
  }

  async function yukle() {
    OYUN = oku(LS.oyun, null) || await cek('data/games.json', []);
    KATEGORI = oku(LS.kat, null) || await cek('data/categories.json', []);
    AYAR = oku(LS.ayar, null) || await cek('data/settings.json', {});
    kaydet();
  }
  async function cek(y, v) {
    try { const r = await fetch(y, { cache:'no-store' }); return r.ok ? await r.json() : v; }
    catch (e) { return v; }
  }

  /* ---------- giriş ---------- */
  function girisEkrani() {
    $('#icerik').innerHTML = `
<div class="admin-giris">
  <div class="admin-kart">
    <img src="images/icons/logo.svg" alt="" style="width:56px;height:56px;border-radius:12px;margin:0 auto 18px">
    <h2 style="font-size:22px;font-weight:700;letter-spacing:-.6px;margin-bottom:6px">Yönetim Paneli</h2>
    <p style="font-size:13px;color:var(--metin-2);margin-bottom:26px">OpenPlay yönetim girişi</p>
    <div class="form-grup" style="text-align:left">
      <label>Kullanıcı Adı</label>
      <input class="girdi" id="gUser" value="openplay" autocomplete="username">
    </div>
    <div class="form-grup" style="text-align:left">
      <label>Şifre</label>
      <input class="girdi" id="gPass" type="password" autocomplete="current-password">
    </div>
    <div id="gHata" class="form-hata" style="text-align:left;margin-bottom:12px"></div>
    <button class="btn btn-vurgu btn-kahraman" style="width:100%" id="gBtn">Giriş Yap</button>
  </div>
</div>`;

    const gir = () => {
      const u = $('#gUser').value.trim();
      const p = $('#gPass').value;
      const c = AYAR.adminCredentials || {};
      if (u === (c.username || 'openplay') && p === (c.password || 'OpenPlay#2026xk')) {
        OTURUM = true; yaz(LS.oturum, true);
        ciz();
      } else {
        $('#gHata').textContent = 'Kullanıcı adı veya şifre yanlış.';
      }
    };
    $('#gBtn').onclick = gir;
    $('#gPass').onkeydown = e => { if (e.key === 'Enter') gir(); };
    $('#gPass').focus();
  }

  /* ---------- ortak ---------- */
  function baslik(ek) { $('#sayfaBaslik').textContent = 'Yönetim — ' + ek; }

  function menuDurum(s) {
    $$('#navray .ray-link[data-s]').forEach(a => a.classList.toggle('active', a.dataset.s === s));
  }

  /* ---------- PANEL ---------- */
  function sayfaPanel() {
    baslik('Panel'); menuDurum('panel');
    const toplamIndirme = OYUN.reduce((t,g) => t + (Number(g.downloads)||0), 0);
    const ort = OYUN.length
      ? (OYUN.reduce((t,g) => t + (Number(g.rating)||0), 0) / OYUN.length).toFixed(1) : '0';
    const son = OYUN.slice().sort((a,b) => new Date(b.dateAdded||0) - new Date(a.dateAdded||0)).slice(0,5);

    $('#icerik').innerHTML = `
<div class="bolum-bas"><div><h2>Panel</h2><p>Genel bakış</p></div>
  <a class="btn btn-vurgu" href="?s=yeni">➕ Yeni Oyun</a></div>

<div class="uygulama-izgara" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:28px">
  <div class="detay-panel" style="margin:0;text-align:center">
    <div style="font-size:30px;font-weight:700;color:var(--vurgu)">${OYUN.length}</div>
    <div style="font-size:12px;color:var(--metin-2);margin-top:4px">Toplam Oyun</div></div>
  <div class="detay-panel" style="margin:0;text-align:center">
    <div style="font-size:30px;font-weight:700;color:var(--vurgu)">${KATEGORI.length}</div>
    <div style="font-size:12px;color:var(--metin-2);margin-top:4px">Kategori</div></div>
  <div class="detay-panel" style="margin:0;text-align:center">
    <div style="font-size:30px;font-weight:700;color:var(--vurgu)">${(toplamIndirme/1000).toFixed(1)}K</div>
    <div style="font-size:12px;color:var(--metin-2);margin-top:4px">Toplam İndirme</div></div>
  <div class="detay-panel" style="margin:0;text-align:center">
    <div style="font-size:30px;font-weight:700;color:var(--vurgu)">${ort}</div>
    <div style="font-size:12px;color:var(--metin-2);margin-top:4px">Ortalama Puan</div></div>
</div>

<div class="detay-panel"><h3>Son Eklenenler</h3>
  ${son.length ? `<div class="tablo-kap"><table>
    <thead><tr><th>Oyun</th><th>Kategori</th><th>Tarih</th></tr></thead>
    <tbody>${son.map(g => `<tr><td>${esc(g.name)}</td>
      <td>${esc(g.category)}</td><td>${esc(g.dateAdded||'')}</td></tr>`).join('')}</tbody>
  </table></div>` : '<p style="color:var(--metin-2);font-size:13px">Henüz oyun eklenmemiş.</p>'}
</div>`;
  }

  /* ---------- OYUN LİSTESİ ---------- */
  function sayfaOyunlar() {
    baslik('Oyunlar'); menuDurum('oyunlar');
    $('#icerik').innerHTML = `
<div class="bolum-bas"><div><h2>Oyunlar</h2><p>${OYUN.length} oyun kayıtlı</p></div>
  <a class="btn btn-vurgu" href="?s=yeni">➕ Yeni Oyun</a></div>

<div class="detay-panel">
  ${OYUN.length ? `<div class="tablo-kap"><table>
    <thead><tr><th></th><th>Oyun</th><th>Kategori</th><th>Lisans</th><th>Boyut</th><th>İndirme</th><th></th></tr></thead>
    <tbody>${OYUN.map((g,i) => `<tr>
      <td style="width:56px"><img src="${esc(g.coverImage)}" alt=""
        style="width:40px;height:26px;object-fit:cover;border-radius:4px"
        onerror="this.style.visibility='hidden'"></td>
      <td><b>${esc(g.name)}</b></td>
      <td>${esc(g.category)}</td>
      <td>${esc(g.license||'—')}</td>
      <td>${esc(g.size||'—')}</td>
      <td>${(Number(g.downloads)||0).toLocaleString('tr-TR')}</td>
      <td style="white-space:nowrap">
        <a class="btn btn-kucuk" href="?s=duzenle&i=${i}">Düzenle</a>
        <button class="btn btn-kucuk" data-sil="${i}" style="color:#C42B1C">Sil</button>
      </td></tr>`).join('')}</tbody></table></div>`
  : '<p style="color:var(--metin-2)">Henüz oyun yok. "Yeni Oyun" ile başla.</p>'}
</div>`;

    $$('#icerik [data-sil]').forEach(b => b.onclick = () => {
      const i = b.dataset.sil;
      if (!confirm(`"${OYUN[i].name}" silinsin mi?`)) return;
      OYUN.splice(i, 1); kaydet(); bildir('Oyun silindi', 'basari'); ciz();
    });
  }

  /* ---------- OYUN FORMU ---------- */
  function sayfaOyunFormu(diziIndex) {
    const yeniMi = diziIndex === undefined;
    const g = yeniMi ? {} : OYUN[diziIndex];
    baslik(yeniMi ? 'Yeni Oyun' : 'Oyun Düzenle');
    menuDurum(yeniMi ? 'yeni' : 'oyunlar');

    const v = (k, d) => esc(g[k] !== undefined ? g[k] : (d || ''));
    const coklu = (arr) => esc(Array.isArray(arr) ? arr.join(', ') : (arr || ''));
    const opt = (id) => KATEGORI.map(k =>
      `<option value="${esc(k.id)}"${g.category===k.id?' selected':''}>${esc(k.icon||'')} ${esc(k.name)}</option>`).join('');

    $('#icerik').innerHTML = `
<div class="bolum-bas"><div><h2>${yeniMi ? 'Yeni Oyun Ekle' : esc(g.name) + ' — Düzenle'}</h2>
  <p>${yeniMi ? 'Formu doldur ve kaydet' : 'Bilgileri güncelle'}</p></div>
  <a class="btn btn-sade" href="?s=oyunlar">← Geri</a></div>

<form class="detay-panel" id="oyunForm">
  <div class="form-izgara">
    <div class="form-grup"><label>Oyun Adı *</label><input class="girdi" id="fName" required value="${v('name')}"></div>
    <div class="form-grup"><label>Kategori *</label><select class="girdi" id="fCat">${opt()}</select></div>
  </div>

  <div class="form-grup"><label>Kısa Açıklama</label>
    <input class="girdi" id="fShort" placeholder="Karta görünecek kısa metin" value="${v('shortDescription')}"></div>

  <div class="form-grup"><label>Uzun Açıklama</label>
    <textarea class="girdi" id="fDesc" placeholder="Detay sayfasında görünecek">${v('description')}</textarea></div>

  <div class="form-izgara">
    <div class="form-grup"><label>Kapak Görseli (yol veya URL)</label>
      <input class="girdi" id="fCover" placeholder="images/games/ornek-kapak.svg" value="${v('coverImage')}"></div>
    <div class="form-grup"><label>Logo (yol veya URL)</label>
      <input class="girdi" id="fLogo" placeholder="images/games/ornek-logo.svg" value="${v('logo')}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>İndirme Bağlantısı *</label>
      <input class="girdi" id="fUrl" type="url" required placeholder="https://..." value="${v('downloadUrl')}"></div>
    <div class="form-grup"><label>Resmî Site</label>
      <input class="girdi" id="fWeb" type="url" placeholder="https://..." value="${v('website')}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>Geliştirici</label><input class="girdi" id="fDev" value="${v('developer')}"></div>
    <div class="form-grup"><label>Lisans</label>
      <input class="girdi" id="fLic" placeholder="GPL-3.0" value="${v('license')}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>Sürüm</label><input class="girdi" id="fVer" value="${v('version')}"></div>
    <div class="form-grup"><label>Boyut</label><input class="girdi" id="fSize" placeholder="500 MB" value="${v('size')}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>Platformlar (virgülle)</label>
      <input class="girdi" id="fPlat" placeholder="Windows, Linux, macOS" value="${coklu(g.platform)}"></div>
    <div class="form-grup"><label>Diller (virgülle)</label>
      <input class="girdi" id="fLang" placeholder="İngilizce, Türkçe" value="${coklu(g.language)}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>Etiketler (virgülle)</label>
      <input class="girdi" id="fTags" placeholder="racing, 3d, aile" value="${coklu(g.tags)}"></div>
    <div class="form-grup"><label>İndirme Sayısı</label>
      <input class="girdi" id="fDl" type="number" min="0" value="${v('downloads','0')}"></div>
  </div>

  <div class="form-izgara">
    <div class="form-grup"><label>Puan (0-5)</label>
      <input class="girdi" id="fRate" type="number" step="0.1" min="0" max="5" value="${v('rating','0')}"></div>
    <div class="form-grup"><label>Eklenme Tarihi</label>
      <input class="girdi" id="fDate" type="date" value="${v('dateAdded', bugun())}"></div>
  </div>

  <div class="form-grup"><label>Kurulum Adımları (her satır bir adım)</label>
    <textarea class="girdi" id="fInst" placeholder="1. Dosyayı indirin&#10;2. Kurun&#10;3. Oynayın">${v('installation')}</textarea></div>

  <div class="form-izgara">
    <div class="form-grup"><label>Öne Çıkar (featured)</label>
      <select class="girdi" id="fFeat"><option value="0">Hayır</option>
        <option value="1"${g.featured?' selected':''}>Evet</option></select></div>
    <div class="form-grup"><label>Popüler (popular)</label>
      <select class="girdi" id="fPop"><option value="0">Hayır</option>
        <option value="1"${g.popular?' selected':''}>Evet</option></select></div>
  </div>

  <div class="detay-eylem" style="margin-top:22px">
    <button type="button" class="btn btn-vurgu btn-kahraman" id="kaydetBtn">
      ${yeniMi ? '➕ Oyunu Ekle' : '💾 Değişiklikleri Kaydet'}</button>
    <a class="btn btn-sade btn-kahraman" href="?s=oyunlar">Vazgeç</a>
  </div>
</form>`;

    $('#kaydetBtn').onclick = function () {
      const ad = $('#fName').value.trim();
      const url = $('#fUrl').value.trim();
      if (!ad)  { bildir('Oyun adı zorunlu', 'hata'); $('#fName').focus(); return; }
      if (!/^https?:\/\//i.test(url)) { bildir('Geçerli bir indirme bağlantısı gir', 'hata'); $('#fUrl').focus(); return; }

      const bol = s => s.split(',').map(x => x.trim()).filter(Boolean);
      const kayit = {
        id: g.id || slugify(ad),
        slug: g.slug || slugify(ad),
        name: ad,
        category: $('#fCat').value,
        shortDescription: $('#fShort').value.trim(),
        description: $('#fDesc').value.trim(),
        coverImage: $('#fCover').value.trim() || 'images/games/placeholder.svg',
        logo: $('#fLogo').value.trim(),
        downloadUrl: url,
        website: $('#fWeb').value.trim(),
        developer: $('#fDev').value.trim(),
        license: $('#fLic').value.trim() || 'Açık kaynak',
        version: $('#fVer').value.trim(),
        size: $('#fSize').value.trim(),
        platform: bol($('#fPlat').value),
        language: bol($('#fLang').value),
        tags: bol($('#fTags').value),
        downloads: Number($('#fDl').value) || 0,
        rating: Number($('#fRate').value) || 0,
        dateAdded: $('#fDate').value || bugun(),
        installation: $('#fInst').value.trim(),
        featured: $('#fFeat').value === '1',
        popular: $('#fPop').value === '1',
        screenshots: g.screenshots || [],
        changelog: g.changelog || [],
        minRequirements: g.minRequirements || {},
        recRequirements: g.recRequirements || {}
      };

      if (yeniMi) OYUN.unshift(kayit);
      else OYUN[diziIndex] = kayit;

      kaydet();
      bildir(yeniMi ? 'Oyun eklendi!' : 'Oyun güncellendi!', 'basari');
      setTimeout(() => location.search = '?s=oyunlar', 700);
    };
  }

  /* ---------- KATEGORİLER ---------- */
  function sayfaKategoriler() {
    baslik('Kategoriler'); menuDurum('kategori');
    $('#icerik').innerHTML = `
<div class="bolum-bas"><div><h2>Kategoriler</h2><p>${KATEGORI.length} kategori</p></div></div>
<div class="detay-panel">
  <div class="tablo-kap"><table>
    <thead><tr><th></th><th>İkon</th><th>Ad</th><th>ID</th><th>Açıklama</th><th>Oyun</th><th></th></tr></thead>
    <tbody>${KATEGORI.map((k,i) => `<tr>
      <td><input type="color" value="${esc(k.color||'#0078D4')}" data-renk="${i}" style="width:34px;height:26px;border:0;background:none;cursor:pointer"></td>
      <td><input class="girdi" value="${esc(k.icon||'')}" data-ikon="${i}" style="width:52px;padding:4px;text-align:center"></td>
      <td><input class="girdi" value="${esc(k.name)}" data-ad="${i}" style="min-width:140px"></td>
      <td><code style="font-size:12px;color:var(--metin-2)">${esc(k.id)}</code></td>
      <td><input class="girdi" value="${esc(k.description||'')}" data-aciklama="${i}"></td>
      <td>${OYUN.filter(g => g.category === k.id).length}</td>
      <td><button class="btn btn-kucuk" data-katsil="${i}" style="color:#C42B1C">Sil</button></td>
    </tr>`).join('')}</tbody></table></div>

  <div style="margin-top:18px;display:flex;gap:9px;flex-wrap:wrap">
    <button class="btn btn-vurgu" id="kategoriKaydet">💾 Kategorileri Kaydet</button>
    <button class="btn btn-sade" id="kategoriEkle">➕ Kategori Ekle</button>
  </div>
</div>`;

    $('#kategoriKaydet').onclick = () => {
      $$('#icerik [data-ad]').forEach(i => KATEGORI[i].name = i.value.trim());
      $$('#icerik [data-ikon]').forEach(i => KATEGORI[i].icon = i.value.trim());
      $$('#icerik [data-aciklama]').forEach(i => KATEGORI[i].description = i.value.trim());
      $$('#icerik [data-renk]').forEach(i => KATEGORI[i].color = i.value);
      kaydet(); bildir('Kategoriler kaydedildi', 'basari');
    };

    $('#kategoriEkle').onclick = () => {
      const ad = prompt('Yeni kategori adı:');
      if (!ad) return;
      const id = slugify(ad);
      if (KATEGORI.some(k => k.id === id)) { bildir('Bu kategori zaten var', 'uyari'); return; }
      KATEGORI.push({ id, name: ad.trim(), icon: '🎮', color: '#0078D4', description: '' });
      kaydet(); bildir('Kategori eklendi', 'basari'); ciz();
    };

    $$('#icerik [data-katsil]').forEach(b => b.onclick = () => {
      const i = b.dataset.katsil;
      const adet = OYUN.filter(g => g.category === KATEGORI[i].id).length;
      if (adet) { bildir(`Bu kategoride ${adet} oyun var. Önce onları taşı.`, 'uyari'); return; }
      if (!confirm(`"${KATEGORI[i].name}" silinsin mi?`)) return;
      KATEGORI.splice(i, 1); kaydet(); bildir('Kategori silindi', 'basari'); ciz();
    });
  }

  /* ---------- AYARLAR ---------- */
  function sayfaAyarlar() {
    baslik('Ayarlar'); menuDurum('ayarlar');
    const a = AYAR;
    $('#icerik').innerHTML = `
<div class="bolum-bas"><div><h2>Ayarlar</h2><p>Site ve yönetim ayarları</p></div></div>

<div class="detay-panel"><h3>Site Görünümü</h3>
  <div class="form-izgara">
    <div class="form-grup"><label>Hero Başlığı</label>
      <input class="girdi" id="sHeroTitle" value="${esc(a.heroTitle||'')}"></div>
    <div class="form-grup"><label>Hero Alt Başlık</label>
      <input class="girdi" id="sHeroSub" value="${esc(a.heroSubtitle||'')}"></div>
  </div>
  <div class="form-izgara">
    <div class="form-grup"><label>Site Adı</label>
      <input class="girdi" id="sName" value="${esc(a.siteName||'OpenPlay')}"></div>
    <div class="form-grup"><label>Logo Yolu</label>
      <input class="girdi" id="sLogo" value="${esc(a.logo||'images/icons/logo.svg')}"></div>
  </div>
  <div class="form-grup"><label>Alt Bilgi Metni</label>
    <input class="girdi" id="sFooter" value="${esc(a.footerText||'')}"></div>
  <button class="btn btn-vurgu" id="sKaydet">💾 Site Ayarlarını Kaydet</button>
</div>

<div class="detay-panel"><h3>Yönetim Girişi</h3>
  <div class="form-izgara">
    <div class="form-grup"><label>Kullanıcı Adı</label>
      <input class="girdi" id="sUser" value="${esc((a.adminCredentials||{}).username||'')}"></div>
    <div class="form-grup"><label>Şifre</label>
      <input class="girdi" id="sPass" value="${esc((a.adminCredentials||{}).password||'')}"></div>
  </div>
  <button class="btn btn-vurgu" id="sPassKaydet">🔑 Giriş Bilgilerini Kaydet</button>
</div>

<div class="detay-panel"><h3>Veri Yönetimi</h3>
  <p style="font-size:13px;color:var(--metin-2);margin-bottom:14px">
    Oyunlar tarayıcıda saklanır. Kalıcı yapmak için dışa aktarıp
    <code>data/games.json</code> dosyasına kopyala.</p>
  <div style="display:flex;gap:9px;flex-wrap:wrap">
    <button class="btn btn-vurgu" id="disaAktar">⬇ JSON İndir (games.json)</button>
    <button class="btn btn-sade" id="iceAktar">⬆ JSON Yükle</button>
    <input type="file" id="jsonDosya" accept="application/json" hidden>
    <button class="btn btn-sade" id="herSeyiSil" style="color:#C42B1C;border-color:#C42B1C">🗑 Her Şeyi Sıfırla</button>
  </div>
</div>`;

    $('#sKaydet').onclick = () => {
      AYAR.heroTitle = $('#sHeroTitle').value.trim();
      AYAR.heroSubtitle = $('#sHeroSub').value.trim();
      AYAR.siteName = $('#sName').value.trim();
      AYAR.logo = $('#sLogo').value.trim();
      AYAR.footerText = $('#sFooter').value.trim();
      kaydet(); bildir('Ayarlar kaydedildi', 'basari');
    };

    $('#sPassKaydet').onclick = () => {
      AYAR.adminCredentials = { username: $('#sUser').value.trim(), password: $('#sPass').value };
      kaydet(); bildir('Giriş bilgileri güncellendi', 'basari');
    };

    $('#disaAktar').onclick = () => {
      const b = new Blob([JSON.stringify(OYUN, null, 2)], { type:'application/json' });
      const a2 = document.createElement('a');
      a2.href = URL.createObjectURL(b);
      a2.download = 'games.json';
      a2.click();
      bildir('games.json indirildi', 'basari');
    };

    $('#iceAktar').onclick = () => $('#jsonDosya').click();
    $('#jsonDosya').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const ok = new FileReader();
      ok.onload = ev => {
        try {
          const d = JSON.parse(ev.target.result);
          if (!Array.isArray(d)) throw new Error('geçersiz');
          OYUN = d; kaydet(); bildir(`${d.length} oyun yüklendi`, 'basari'); ciz();
        } catch (err) { bildir('Geçersiz JSON dosyası', 'hata'); }
      };
      ok.readAsText(f);
    };

    $('#herSeyiSil').onclick = () => {
      if (!confirm('TÜM OYUNLAR SİLİNSİN Mİ? Bu geri alınamaz!')) return;
      if (!confirm('Emin misin? Son şans.')) return;
      OYUN = []; kaydet(); bildir('Tüm oyunlar silindi', 'basari'); ciz();
    };
  }

  /* ---------- ÇİZİM ---------- */
  function ciz() {
    if (!OTURUM) { girisEkrani(); return; }
    const s = new URLSearchParams(location.search).get('s') || 'panel';
    if (s === 'panel')              sayfaPanel();
    else if (s === 'oyunlar')       sayfaOyunlar();
    else if (s === 'yeni')         sayfaOyunFormu();
    else if (s === 'duzenle')       sayfaOyunFormu(Number(new URLSearchParams(location.search).get('i')));
    else if (s === 'kategori')      sayfaKategoriler();
    else if (s === 'ayarlar')       sayfaAyarlar();
    else                            sayfaPanel();
    window.scrollTo(0, 0);
  }

  /* ---------- TEMA ---------- */
  function tema(k) {
    document.body.classList.toggle('dark', k);
    yaz(LS.tema, k ? 'dark' : 'light');
    const b = $('#temaBtn'); if (b) b.textContent = k ? '☀️' : '🌙';
  }

  /* ---------- BAŞLAT ---------- */
  async function baslat() {
    if (oku(LS.tema, null) === 'dark') tema(true);
    $('#temaBtn').onclick = () => tema(!document.body.classList.contains('dark'));

    $('#cikisBtn').onclick = () => { OTURUM = false; yaz(LS.oturum, false); location.reload(); };

    const ray = $('#navray'), ov = $('#overlay');

    // menü genişletme (dar ↔ geniş)
    const gb = $('#rayGenislet');
    if (gb) {
      gb.onclick = () => {
        const a = ray.classList.toggle('acik');
        gb.title = a ? 'Menüyü daralt' : 'Menüyü genişlet';
      };
    }

    const ac = a => {
      ray.classList.toggle('kaydir', a);
      ov.style.opacity = a ? '1' : '0';
      ov.style.pointerEvents = a ? 'auto' : 'none';
    };
    $('#menuBtn').onclick = () => ac(!ray.classList.contains('kaydir'));
    ov.onclick = () => ac(false);
    $$('#navray .ray-link').forEach(a => a.onclick = () => ac(false));

    $('#icerik').innerHTML = '<div class="yukleme" style="position:static;padding:120px 0"><div class="yukleme-halka"></div></div>';
    await yukle();

    OTURUM = !!oku(LS.oturum, false);
    ciz();
  }

  document.addEventListener('DOMContentLoaded', baslat);
})();
