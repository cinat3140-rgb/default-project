/* ==========================================================================
   OpenPlay — Site (bağımsız, temiz)
   Hiçbir başka dosyaya bağlı değildir.
   ========================================================================== */

const OP = (function () {
  'use strict';

  const $  = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  const sayi = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  };

  const OS = { Windows: '🪟', Linux: '🐧', macOS: '🍎', Android: '🤖', iOS: '📱' };
  const LS = { oyun: 'op_oyun', kat: 'op_kat', ayar: 'op_ayar', tema: 'op_tema' };

  let OYUN = [], KATEGORI = [], AYAR = {};
  let SIRA = 'tarih', ARAMA = '';

  /* ═══════════════ VERİ ═══════════════ */
  function oku(ls, varsayilan) {
    try {
      const r = localStorage.getItem(ls);
      return r ? JSON.parse(r) : varsayilan;
    } catch (e) { return varsayilan; }
  }
  function yaz(ls, v) {
    try { localStorage.setItem(ls, JSON.stringify(v)); } catch (e) {}
  }

  async function yukle() {
    OYUN = oku(LS.oyun, null);
    KATEGORI = oku(LS.kat, null);
    AYAR = oku(LS.ayar, null);

    // yerel yoksa dosyadan çek
    if (!OYUN)     OYUN = await cek('data/games.json', []);
    if (!KATEGORI) KATEGORI = await cek('data/categories.json', []);
    if (!AYAR)     AYAR = await cek('data/settings.json', {});

    yaz(LS.oyun, OYUN); yaz(LS.kat, KATEGORI); yaz(LS.ayar, AYAR);
  }

  async function cek(yol, varsayilan) {
    try {
      const r = await fetch(yol, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn('veri alınamadı:', yol, e.message);
      return varsayilan;
    }
  }

  const kaydet = () => { yaz(LS.oyun, OYUN); yaz(LS.kat, KATEGORI); };

  const katId  = (g) => KATEGORI.find(k => k.id === g.category);
  const katAd  = (g) => (katId(g) || {}).name || g.category || 'Diğer';
  const katIkon= (g) => (katId(g) || {}).icon  || '🎮';

  /* ═══════════════ BİLDİRİM ═══════════════ */
  function bildir(mesaj, tip) {
    const kap = $('#bildirimler');
    if (!kap) return;
    const d = document.createElement('div');
    d.className = 'bildirim' + (tip ? ' ' + tip : '');
    d.textContent = mesaj;
    kap.appendChild(d);
    setTimeout(() => { d.classList.add('gizle'); setTimeout(() => d.remove(), 300); }, 3400);
  }

  /* ═══════════════ KART ═══════════════ */
  function kart(g) {
    const slug = esc(g.slug || g.id);
    const rozet = g.featured ? '<div class="uygulama-rozet">★ Öne çıkan</div>'
      : (g.popular ? '<div class="uygulama-rozet">🔥 Popüler</div>' : '');
    return `<a class="uygulama" href="#/oyun/${slug}">
      <div class="uygulama-gorsel">
        <img loading="lazy" src="${esc(g.coverImage)}" alt="${esc(g.name)}"
             onerror="this.onerror=null;this.src='images/games/placeholder.svg'">
        ${rozet}
        <div class="uygulama-get">Ücretsiz</div>
      </div>
      <div class="uygulama-bilgi">
        <div class="uygulama-ad">${esc(g.name)}</div>
        <div class="uygulama-alt">
          <span>${esc(katIkon(g))} ${esc(katAd(g))}</span>
          <span>·</span><span>⬇ ${sayi(g.downloads)}</span>
        </div>
      </div>
    </a>`;
  }

  function bolum(bas, alt, liste, seritMi) {
    if (!liste.length) return '';
    const b = `<div class="bolum-bas"><div><h2>${esc(bas)}</h2>${alt ? `<p>${esc(alt)}</p>` : ''}</div></div>`;
    return `<section class="bolum gecikmeli">${b}
      <div class="${seritMi ? 'uygulama-serit' : 'uygulama-izgara'}">${liste.map(kart).join('')}</div>
    </section>`;
  }

  function bos(ikon, bas, alt, buton) {
    return `<div class="bos">
      <div class="bos-ikon">${ikon}</div>
      <h3>${esc(bas)}</h3><p>${esc(alt)}</p>${buton || ''}
    </div>`;
  }

  /* ═══════════════ SIRALAMA ═══════════════ */
  function sirala(liste) {
    const l = liste.slice();
    switch (SIRA) {
      case 'ad':          return l.sort((a,b) => a.name.localeCompare(b.name,'tr'));
      case 'ad-ters':     return l.sort((a,b) => b.name.localeCompare(a.name,'tr'));
      case 'indirme':     return l.sort((a,b) => (b.downloads||0) - (a.downloads||0));
      case 'indirme-az':  return l.sort((a,b) => (a.downloads||0) - (b.downloads||0));
      case 'puan':        return l.sort((a,b) => (b.rating||0) - (a.rating||0));
      case 'boyut':       return l.sort((a,b) => parseFloat(a.size||0) - parseFloat(b.size||0));
      case 'boyut-ters':  return l.sort((a,b) => parseFloat(b.size||0) - parseFloat(a.size||0));
      default:            return l.sort((a,b) => new Date(b.dateAdded||0) - new Date(a.dateAdded||0));
    }
  }

  /* ═══════════════ SAYFA: ANA ═══════════════ */
  function sayfaAna() {
    const s = AYAR;
    const one = OYUN.find(g => g.featured) || sirala([...OYUN].sort((a,b)=>(b.downloads||0)-(a.downloads||0)))[0];
    const yeni = sirala(OYUN).slice(0, 8);
    const pop  = OYUN.slice().sort((a,b) => (b.downloads||0)-(a.downloads||0)).slice(0, 8);

    let h = `<section class="store-hero"><div>
      <div class="store-hero-eyebrow">✨ Açık kaynak · Ücretsiz · Yasal</div>
      <h1>${esc(s.heroTitle || 'Açık Kaynak Oyunlar')}</h1>
      <p>${esc(s.heroSubtitle || 'Keşfet, indir, oyna. Tüm oyunlar ücretsiz ve yasaldır.')}</p>
      <div class="detay-eylem">
        <a class="btn btn-kahraman" style="background:#fff;color:#1A1A1A;border-color:transparent" href="#/oyunlar">🎮 Oyunları Gör</a>
        <a class="btn btn-kahraman" style="background:rgba(255,255,255,.18);color:#fff;border-color:rgba(255,255,255,.3)" href="#/kategori">📁 Kategoriler</a>
      </div>
    </div></section>`;

    if (one) {
      h += `<section class="one-cikan">
        <div class="one-cikan-gorsel"><img src="${esc(one.coverImage)}" alt="${esc(one.name)}"></div>
        <div class="one-cikan-bilgi">
          <span class="rozet rozet-vurgu">★ Bu haftanın seçimi</span>
          <h3>${esc(one.name)}</h3>
          <p>${esc(one.shortDescription || one.description || '')}</p>
          <div class="uygulama-alt"><span>${esc(katIkon(one))} ${esc(katAd(one))}</span>
            <span>·</span><span>${esc(one.license||'Ücretsiz')}</span>
            <span>·</span><span>⬇ ${sayi(one.downloads)}</span></div>
          <div class="one-cikan-eylem">
            <a class="btn btn-vurgu btn-kahraman" href="#/oyun/${esc(one.slug||one.id)}">Detaylar</a>
            <a class="btn btn-sade btn-kahraman" href="${esc(one.downloadUrl||'#')}" target="_blank" rel="noopener">İndir</a>
          </div>
        </div></section>`;
    }

    if (yeni.length) h += bolum('🆕 Yeni Eklenenler', 'Kütüphaneye son eklenenler', yeni, true);
    if (pop.length)  h += bolum('🔥 Popüler', 'En çok indirilen', pop, true);

    if (KATEGORI.length) {
      h += `<section class="bolum gecikmeli">
        <div class="bolum-bas"><div><h2>📁 Kategoriler</h2><p>Türüne göre keşfet</p></div>
          <a class="bolum-link" href="#/kategori">Tümü →</a></div>
        <div class="kategori-izgara">${KATEGORI.slice(0,6).map(k => `
          <a class="kategori-kart" href="#/kategori/${esc(k.id)}" style="--k-renk:${esc(k.color||'#0F6CBD')}">
            <div class="kategori-ikon">${esc(k.icon||'🎮')}</div>
            <h3>${esc(k.name)}</h3><p>${esc(k.description||'')}</p>
            <div style="margin-top:10px;font-size:11.5px;color:var(--metin-2)">
              ${OYUN.filter(g=>g.category===k.id).length} oyun</div>
          </a>`).join('')}</div></section>`;
    }

    if (!OYUN.length) {
      h += bos('🎮', 'Henüz oyun eklenmemiş',
        'Yönetim panelinden ilk oyunu ekleyerek başla.',
        `<a class="btn btn-vurgu btn-kahraman" href="admin.html">⚙️ Yönetim Panelini Aç</a>`);
    }
    return h;
  }

  /* ═══════════════ SAYFA: OYUNLAR ═══════════════ */
  function sayfaOyunlar(katFiltre) {
    const kat = KATEGORI.find(k => k.id === katFiltre);
    let liste = katFiltre ? OYUN.filter(g => g.category === katFiltre) : OYUN.slice();

    if (ARAMA) {
      const q = ARAMA.toLowerCase();
      liste = liste.filter(g =>
        (g.name + ' ' + (g.shortDescription||'') + ' ' + katAd(g) + ' ' + (g.tags||[]).join(' ')).toLowerCase().includes(q));
    }
    liste = sirala(liste);

    let h = `<div class="bolum-bas" style="margin-bottom:18px">
      <div><h2>${esc(kat ? kat.name : 'Tüm Oyunlar')}</h2>
      <p>${liste.length} oyun</p></div>
      <select class="girdi" id="siraSec" style="width:auto;min-width:180px">
        ${[['tarih','En yeniler'],['ad','İsme göre A-Z'],['ad-ters','İsme göre Z-A'],
           ['indirme','En çok indirilen'],['indirme-az','En az indirilen'],
           ['puan','En yüksek puan'],['boyut','Boyut: küçük→büyük'],['boyut-ters','Boyut: büyük→küçük']]
          .map(o => `<option value="${o[0]}"${SIRA===o[0]?' selected':''}>${o[1]}</option>`).join('')}
      </select></div>

    <div class="kategori-serit">
      <a class="kategori ${!katFiltre?'aktif':''}" href="#/oyunlar">🎮 Tümü (${OYUN.length})</a>
      ${KATEGORI.map(k => `<a class="kategori ${k.id===katFiltre?'aktif':''}" href="#/kategori/${esc(k.id)}">
        ${esc(k.icon||'🎮')} ${esc(k.name)} (${OYUN.filter(g=>g.category===k.id).length})</a>`).join('')}
    </div>`;

    h += liste.length
      ? `<div class="uygulama-izgara">${liste.map(kart).join('')}</div>`
      : bos(ARAMA ? '🔍' : '📦',
            ARAMA ? 'Sonuç bulunamadı' : 'Bu kategoride oyun yok',
            ARAMA ? `"${ARAMA}" için sonuç yok. Farklı bir kelime dene.`
                  : 'Yönetim panelinden oyun ekleyebilirsin.',
            `<a class="btn btn-vurgu" href="#/oyunlar">Tüm oyunlar</a>`);
    return h;
  }

  /* ═══════════════ SAYFA: KATEGORİLER ═══════════════ */
  function sayfaKategoriler() {
    return `<div class="bolum-bas"><div><h2>Kategoriler</h2>
        <p>${KATEGORI.length} kategori · ${OYUN.length} oyun</p></div></div>
      <div class="kategori-izgara">${KATEGORI.map(k => {
        const n = OYUN.filter(g => g.category === k.id).length;
        return `<a class="kategori-kart" href="#/kategori/${esc(k.id)}" style="--k-renk:${esc(k.color||'#0F6CBD')}">
          <div class="kategori-ikon">${esc(k.icon||'🎮')}</div>
          <h3>${esc(k.name)}</h3><p>${esc(k.description||'')}</p>
          <div style="margin-top:12px"><span class="rozet">${n} oyun</span></div></a>`;
      }).join('')}</div>`;
  }

  /* ═══════════════ SAYFA: DETAY ═══════════════ */
  function sayfaOyun(slug) {
    const g = OYUN.find(x => (x.slug || x.id) === slug);
    if (!g) return bos('🧭', 'Oyun bulunamadı', 'Bu oyun kaldırılmış veya adres değişmiş olabilir.',
      `<a class="btn btn-vurgu btn-kahraman" href="#/oyunlar">← Oyunlara Dön</a>`);

    const alan = (k, v) => v ? `<div class="ozellik-sira"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>` : '';
    const istek = (r) => Object.entries(r || {}).filter(([,v]) => v).map(([k,v]) =>
      `<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:12.5px">
        <span style="color:var(--metin-2)">${esc(k)}</span><b style="text-align:right">${esc(v)}</b></div>`).join('')
      || '<span style="color:var(--metin-3);font-size:12.5px">Belirtilmemiş</span>';

    const shots = (g.screenshots || []).filter(Boolean).slice(0, 6);

    return `
<a class="bolum-link" href="#/oyunlar" style="display:inline-flex;margin-bottom:14px">← Geri</a>

<section class="detay">
  <div class="detay-gorsel">
    <img src="${esc(g.coverImage)}" alt="${esc(g.name)}"
         onerror="this.onerror=null;this.src='images/games/placeholder.svg'">
    <div class="detay-ust">
      <h1>${esc(g.name)}</h1>
      <p>${esc(g.shortDescription || g.description || '')}</p>
      <div class="detay-eylem">
        <a class="btn btn-kahraman" href="${esc(g.downloadUrl || g.downloadLink || '#')}"
           target="_blank" rel="noopener">⬇ Ücretsiz İndir</a>
        ${g.website ? `<a class="btn btn-kahraman" style="background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.3)"
           href="${esc(g.website)}" target="_blank" rel="noopener">🌐 Site</a>` : ''}
      </div>
    </div>
  </div>
</section>

<div class="detay-izgara">
  <div>
    <div class="detay-panel"><h3>Hakkında</h3>
      <p>${esc(g.description || g.shortDescription || 'Açıklama eklenmemiş.')}</p></div>

    ${(g.tags||[]).length ? `<div class="detay-panel"><h3>Etiketler</h3>
      <div style="display:flex;gap:7px;flex-wrap:wrap">${g.tags.map(t=>`<span class="rozet">${esc(t)}</span>`).join('')}</div></div>` : ''}

    ${(Object.keys(g.minRequirements||{}).length || Object.keys(g.recRequirements||{}).length)
      ? `<div class="detay-panel"><h3>Sistem Gereksinimleri</h3><div class="istek-izgara">
          <div class="istek-kart"><h4>Minimum</h4>${istek(g.minRequirements)}</div>
          <div class="istek-kart"><h4>Önerilen</h4>${istek(g.recRequirements)}</div>
        </div></div>` : ''}

    ${g.installation ? `<div class="detay-panel"><h3>Kurulum</h3>
      <p style="white-space:pre-wrap">${esc(g.installation)}</p></div>` : ''}

    ${shots.length ? `<div class="detay-panel"><h3>Ekran Görüntüleri</h3>
      <div class="ekran-gorsel">${shots.map(s => `<figure><img loading="lazy" src="${esc(s)}" alt=""></figure>`).join('')}</div></div>` : ''}

    ${(g.changelog||[]).length ? `<div class="detay-panel"><h3>Sürüm Geçmişi</h3>
      ${g.changelog.map(c => `<div class="gunluk-kayit">
        <span class="gunluk-surum">${esc(c.version)}</span>
        <span class="gunluk-tarih">${esc(c.date||'')}</span>
        <ul class="gunluk-degisiklik">${(c.changes||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
      </div>`).join('')}</div>` : ''}
  </div>

  <aside>
    <div class="detay-panel"><h3>Bilgiler</h3><dl class="ozellik">
      ${alan('Kategori', katAd(g))}
      ${alan('Lisans', g.license)}
      ${alan('Sürüm', g.version)}
      ${alan('Boyut', g.size)}
      ${alan('Geliştirici', g.developer)}
      ${alan('Eklenme', g.dateAdded ? new Date(g.dateAdded).toLocaleDateString('tr-TR') : '')}
      ${alan('İndirme', sayi(g.downloads) + ' kez')}
      ${alan('Puan', g.rating ? Number(g.rating).toFixed(1) + ' / 5' : '')}
    </dl>
    ${(g.platform||[]).length ? `<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px">
      ${g.platform.map(p => `<span class="rozet">${OS[p]||'💻'} ${esc(p)}</span>`).join('')}</div>` : ''}
    </div>

    ${(g.language||[]).length ? `<div class="detay-panel"><h3>Diller</h3>
      <div style="display:flex;gap:7px;flex-wrap:wrap">${g.language.map(l=>`<span class="rozet">${esc(l)}</span>`).join('')}</div></div>` : ''}

    <div class="detay-panel"><h3>Kategori</h3>
      <a class="kategori" href="#/kategori/${esc(g.category)}">${esc(katIkon(g))} ${esc(katAd(g))}</a></div>
  </aside>
</div>`;
  }

  /* ═══════════════ SAYFA: ARA ═══════════════ */
  function sayfaAra() {
    return `<div class="bolum-bas"><div><h2>Arama</h2>
        <p>${ARAMA ? OYUN.length + ' oyun tarandı' : 'Oyun adı yazın'}</p></div></div>
      <div class="arama-cubuk" style="max-width:560px;height:42px;margin-bottom:24px">
        <span style="color:var(--metin-3)">🔍</span>
        <input type="search" id="sayfaArama" placeholder="Oyun ara…" value="${esc(ARAMA)}" autocomplete="off">
      </div>
      ${sayfaOyunlarBody()}`;
  }
  function sayfaOyunlarBody() {
    if (!ARAMA) return bos('🔍', 'Ne aramıştın?', 'Yukarıdaki kutuya oyun adı yaz.');
    let l = OYUN.filter(g =>
      (g.name + ' ' + (g.shortDescription||'') + ' ' + katAd(g) + ' ' + (g.tags||[]).join(' ')).toLowerCase().includes(ARAMA.toLowerCase()));
    if (!l.length) return bos('🤷', 'Sonuç yok', `"${ARAMA}" için oyun bulunamadı.`);
    return `<div class="uygulama-izgara">${sirala(l).map(kart).join('')}</div>`;
  }

  /* ═══════════════ SAYFA: HAKKINDA / ILETISIM ═══════════════ */
  function sayfaHakkinda() {
    return `<div class="bolum-bas"><div><h2>Hakkında</h2><p>OpenPlay nedir?</p></div></div>
      <div class="detay-panel"><h3>Açık Kaynak Oyunlar</h3>
        <p>OpenPlay, açık kaynak lisanslı oyunları tek bir yerde toplayan ücretsiz bir platformdur.
        Buradaki her oyun kendi açık lisansıyla dağıtılır, tamamen ücretsizdir ve yasaldır.
        Amacımız bağımsız geliştiricilerin emeğini görünür kılmak ve oyunculara yasal bir keşif alanı sunmaktır.</p></div>
      <div class="detay-panel"><h3>Özellikler</h3>
        <ul class="gunluk-degisiklik">
          <li>Tamamı açık kaynak ve ücretsiz</li>
          <li>Her oyun için lisans ve sistem gereksinimleri</li>
          <li>Kategoriye göre kolay keşif</li>
          <li>Hızlı arama ve sıralama</li>
          <li>Windows 11 arayüzü ile akıcı deneyim</li>
          <li>Mobil ve masaüstü uyumlu</li>
        </ul></div>`;
  }
  function sayfaIletisim() {
    return `<div class="bolum-bas"><div><h2>İletişim</h2><p>Soru ve önerilerin</p></div></div>
      <div class="detay-panel"><h3>Bize Ulaş</h3>
        <p>Görüş ve önerilerini paylaşmak istersen:</p>
        <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:14px">
          <a class="btn btn-vurgu" href="https://github.com" target="_blank" rel="noopener">GitHub</a>
          <a class="btn btn-sade" href="https://discord.gg" target="_blank" rel="noopener">Discord</a>
          <a class="btn btn-sade" href="https://twitter.com" target="_blank" rel="noopener">X / Twitter</a>
        </div></div>
      <div class="detay-panel"><h3>Oyun Öner</h3>
        <p>Listede olmasını istediğin bir oyun mu var?
        <a class="btn btn-vurgu" style="margin-left:8px" href="admin.html">Yönetim panelinden ekle</a></p></div>`;
  }

  /* ═══════════════ YÖNLENDİRME ═══════════════ */
  const BASLIK = {
    '': 'Ana Sayfa', oyunlar: 'Oyunlar', oyun: 'Oyun', kategori: 'Kategoriler',
    ara: 'Arama', hakkinda: 'Hakkında', iletisim: 'İletişim'
  };

  function yonlendir() {
    const ham = location.hash.replace(/^#\/?/, '');
    const [yol, sorgu] = ham.split('?');
    const parcalar = yol.split('/').filter(Boolean);
    const y = parcalar[0] || '';

    ARAMA = sorgu ? new URLSearchParams(sorgu).get('q') || '' : '';

    const kok = $('#icerik');
    let h;

    switch (y) {
      case 'oyunlar':    h = sayfaOyunlar(null); break;
      case 'oyun':       h = sayfaOyun(parcalar[1]); break;
      case 'kategori':   h = parcalar[1] ? sayfaOyunlar(parcalar[1]) : sayfaKategoriler(); break;
      case 'ara':        h = sayfaAra(); break;
      case 'hakkinda':   h = sayfaHakkinda(); break;
      case 'iletisim':   h = sayfaIletisim(); break;
      case '':           h = sayfaAna(); break;
      default:           h = bos('🧭', 'Sayfa bulunamadı', 'Aradığın sayfa yok.',
                                    `<a class="btn btn-vurgu btn-kahraman" href="#/">🏠 Ana Sayfa</a>`);
    }

    kok.innerHTML = h;
    $('#sayfaBaslik').textContent = BASLIK[y] || 'OpenPlay';

    // nav durumu
    $$('#navray .ray-link[data-y]').forEach(a => {
      const t = a.dataset.y.replace('#/','');
      a.classList.toggle('active',
        t === y || (y === 'oyun' && t === 'oyunlar') || (y === 'kategori' && t === 'kategori'));
    });

    // sıralama kutusu
    const ss = $('#siraSec');
    if (ss) ss.onchange = function () { SIRA = this.value; yonlendir(); };

    // arama kutusu
    const sa = $('#sayfaArama');
    if (sa) {
      sa.focus();
      sa.setSelectionRange(sa.value.length, sa.value.length);
      sa.onkeydown = e => {
        if (e.key === 'Enter' && sa.value.trim()) location.hash = '#/ara?q=' + encodeURIComponent(sa.value.trim());
      };
    }

    window.scrollTo(0, 0);
    animasyon();
  }

  function animasyon() {
    const h = $$('.gecikmeli');
    if (!h.length) return;
    if (!('IntersectionObserver' in window)) { h.forEach(e => e.classList.add('gorunur')); return; }
    const gz = new IntersectionObserver(g => g.forEach(x => {
      if (x.isIntersecting) { x.target.classList.add('gorunur'); gz.unobserve(x.target); }
    }), { threshold: .04, rootMargin: '0px 0px -24px 0px' });
    h.forEach(e => gz.observe(e));
  }

  /* ═══════════════ TEMA ═══════════════ */
  function tema(koyu) {
    document.body.classList.toggle('dark', koyu);
    yaz(LS.tema, koyu ? 'dark' : 'light');
    const b = $('#temaBtn');
    if (b) b.textContent = koyu ? '☀️' : '🌙';
  }

  /* ═══════════════ BAŞLAT ═══════════════ */
  async function baslat() {
    $('#yil').textContent = new Date().getFullYear();

    // tema
    if (oku(LS.tema, null) === 'dark') tema(true);
    $('#temaBtn').onclick = () => tema(!document.body.classList.contains('dark'));

    // üst arama
    const ua = $('#ustArama');
    ua.onkeydown = e => {
      if (e.key === 'Enter') location.hash = ua.value.trim() ? '#/ara?q=' + encodeURIComponent(ua.value.trim()) : '#/oyunlar';
    };
    // menü + kaplama
    const ray = $('#navray'), ov = $('#overlay');

    // menü genişletme (dar ↔ geniş)
    const gb = $('#rayGenislet');
    if (gb) {
      gb.onclick = () => {
        const a = ray.classList.toggle('acik');
        gb.innerHTML = a ? '&#9776;' : '&#9776;';
        gb.title = a ? 'Menüyü daralt' : 'Menüyü genişlet';
      };
    }

    // mobil menü
    const ac = a => {
      ray.classList.toggle('kaydir', a);
      ov.style.opacity = a ? '1' : '0';
      ov.style.pointerEvents = a ? 'auto' : 'none';
    };
    $('#menuBtn').onclick = () => ac(!ray.classList.contains('kaydir'));
    ov.onclick = () => ac(false);
    $$('#navray .ray-link').forEach(a => a.onclick = () => ac(false));

    // veri
    $('#icerik').innerHTML = '<div class="yukleme" style="position:static;padding:120px 0"><div class="yukleme-halka"></div></div>';
    await yukle();

    window.addEventListener('hashchange', yonlendir);
    yonlendir();

    // başka sekmede oyun eklendiyse güncelle
    window.addEventListener('storage', function (e) {
      if (e.key === LS.oyun) { OYUN = oku(LS.oyun, []); yonlendir(); }
      if (e.key === LS.kat)  { KATEGORI = oku(LS.kat, []); yonlendir(); }
    });
  }

  return { baslat, bildir, kaydet, get oyun(){return OYUN}, get kategori(){return KATEGORI} };
})();

document.addEventListener('DOMContentLoaded', OP.baslat);
