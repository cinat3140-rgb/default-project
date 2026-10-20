/* ==========================================================================
   DersPark — Uygulama mantığı (düzenli yapı)
   panel · kitaplık · masa · soru çöz · koç
   ========================================================================== */

const MASA = (function () {
  'use strict';

  const $  = (s, k) => (k || document).querySelector(s);
  const $$ = (s, k) => Array.from((k || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /* ═════════ VERİ TABANI ═════════ */
  const KONULAR = {
    'Matematik': ['türev','integral','denklem','eşitsizlik','fonksiyon','üçgen','çember',
      'olasılık','istatistik','cebir','köklü','üslu','logaritma','trigonometri','sayı',
      'oran','yüzde','kesir','geometri','permütasyon','kombinasyon'],
    'Fizik': ['kuvvet','enerji','hız','ivme','elektrik','dalga','ışık','ses','madde','ısı',
      'basınç','optik','yerçekimi','momentum','akım','volt'],
    'Kimya': ['atom','molekül','element','bileşik','asit','baz','ph','çözelti','periyodik',
      'oksijen','karbon','reaksiyon','çekirdek','izotop'],
    'Biyoloji': ['hücre','doku','organ','sistem','bitki','hayvan','genetik','ekoloji',
      'mitokondri','fotosentez','nefes','dna','rna','protein','enzim'],
    'Türkçe': ['paragraf','cümle','fiil','isim','sıfat','zamir','edat','ünlem','noktalama',
      'imge','ses','hece','özet','deneme','soyut','somut'],
    'Türk Dili ve Edebiyatı': ['şiir','divan','halk','roman','dram','edebi','sanatçı','dize','mısra','tiyatro'],
    'Tarih': ['savaş','antik','orta','osmanlı','cumhuriyet','devlet','hanedan','inkılap','kültür'],
    'Coğrafya': ['iklim','nüfus','yer şekilleri','kıta','harita','relief','akarsu','toprak','deniz'],
    'Felsefe': ['varlık','bilgi','düşünce','etik','ahlak','özgürlük','mantık','argüman','özne'],
    'Fen Bilimleri': ['madde','enerji','kuvvet','hücre','bitki','ışık','ses','atmosfer'],
    'İngilizce': ['verb','present','past','future','pronoun','adjective','vocabulary','tense'],
    'Sosyal Bilgiler': ['devlet','ekonomi','toplum','kültür','hak','demokrasi']
  };
  /* Kanal listesi js/kanallar.js içinde (doğrulanmış GERÇEK handle'lar) */
  const KANALLAR = {};
  const KANAL_DERS_ESLESTIR = {
    'Türk Dili ve Edebiyatı':'Edebiyat',
    'Sosyal Bilgiler':'Coğrafya',
    'Fen Bilimleri':'Biyoloji'
  };
  function kanalGetir(ders) {
    const K = window.DERS_KANALLARI || {};
    return K[ders] || K[KANAL_DERS_ESLESTIR[ders]] || [];
  }
  function kanalUrl(ad, ders, konu) {
    const k = kanalGetir(ders).find(x => x[1] === ad);
    if (k) return 'https://www.youtube.com/' + k[0];
    const q = [ad, konu, ders, 'konu anlatım'].filter(Boolean).join(' ');
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  }

  const RENK = {
    'Matematik':'#3B82F6','Fizik':'#8B5CF6','Kimya':'#F59E0B','Biyoloji':'#10B981',
    'Türkçe':'#EF4444','Türk Dili ve Edebiyatı':'#DC2626','Tarih':'#A16207',
    'Coğrafya':'#0D9488','Felsefe':'#7C3AED','İngilizce':'#14B8A6',
    'Fen Bilimleri':'#06B6D4','Sosyal Bilgiler':'#EC4899'
  };
  const rengi = (d) => RENK[d] || 'var(--ana)';

  const LS = 'dp_v2';

  /* ══════════════════════════════════════════════════════════════════
     IndexedDB — PDF / görsel / soru verisi (sınırsız, ~GB)
     localStorage artık sadece küçük ayar bilgisi tutar.
     ══════════════════════════════════════════════════════════════════ */
  const DB = (() => {
    const AD = 'derspark', MA = 'dosya';
    let ac = null;
    function db() {
      if (ac) return ac;
      ac = new Promise((ok, hata) => {
        let r;
        try { r = indexedDB.open(AD, 1); }
        catch (e) { return hata(e); }
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains(MA)) d.createObjectStore(MA);
        };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => hata(r.error || new Error('IndexedDB açılamadı'));
        r.onblocked = () => hata(new Error('IndexedDB kilitli'));
      });
      return ac;
    }
    function tx(tip, islem) {
      return db().then(d => new Promise((ok, hata) => {
        const t = d.transaction(MA, tip);
        islem(t.objectStore(MA));
        t.oncomplete = () => ok(true);
        t.onerror = () => hata(t.error);
        t.onabort = () => hata(t.error || new Error('İşlem iptal'));
      })).catch(() => false);
    }
    return {
      hazir: () => db().then(() => true).catch(() => false),
      yaz: (id, kayit) => tx('readwrite', s => s.put(kayit, id)),
      oku: (id) => db().then(d => new Promise(ok => {
        const q = d.transaction(MA, 'readonly').objectStore(MA).get(id);
        q.onsuccess = () => ok(q.result || null);
        q.onerror = () => ok(null);
      })).catch(() => null),
      sil: (id) => tx('readwrite', s => s.delete(id)),
      hepsi: () => db().then(d => new Promise(ok => {
        const t = d.transaction(MA, 'readonly');
        const s = t.objectStore(MA);
        const a = s.getAllKeys(), b = s.getAll();
        t.oncomplete = () => {
          const m = {};
          (a.result || []).forEach((k, i) => m[k] = b.result[i]);
          ok(m);
        };
        t.onerror = () => ok({});
      })).catch(() => ({})),
      bosalt: () => tx('readwrite', s => s.clear())
    };
  })();
  let ikiliVar = false;

  async function ikiliYaz(id, kayit) {
    if (!ikiliVar) ikiliVar = await DB.hazir();
    if (!ikiliVar) return false;
    return await DB.yaz(id, kayit);
  }
  async function ikiliOku(id) {
    if (!ikiliVar) ikiliVar = await DB.hazir();
    if (!ikiliVar) return null;
    return await DB.oku(id);
  }
  function ikiliSil(id) { if (ikiliVar) DB.sil(id); }
  /* ArrayBuffer <-> base64 (yedekleme için) */
  function bufB64(buf) {
    if (!buf) return null;
    const b = new Uint8Array(buf);
    let s = '', CH = 0x8000;
    for (let i = 0; i < b.length; i += CH) {
      s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
    }
    return btoa(s);
  }
  function b64Buf(s) {
    if (!s) return null;
    const t = atob(s), b = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
    return b.buffer;
  }
  async function ikiliYol(ornek) {
    const k = await ikiliOku(ornek);
    return k || null;
  }
  function kotaYaz() {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(e => {
        if (!e.usage) return;
        const mb = e.usage / 1048576;
        const bilgi = $('#aKota');
        if (bilgi) bilgi.textContent = 'Kullanılan: ' + mb.toFixed(1) + ' MB';
      }).catch(() => {});
    }
  }
  function kotaIzin() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }

  let V = {
    dosya: [], zayif: {}, not: '', yanlislar: [],
    ayar: { aiAnahtar:'', aiUrl:'https://api.openai.com/v1/chat/completions', aiModel:'gpt-4o-mini' },
    ist: { soru:0, dogru:0, yanlis:0, dakika:0, seri:0, sonGun:'', bugun:0 }
  };
  async function yukle() {
    try {
      const r = localStorage.getItem(LS);
      if (r) V = Object.assign(V, JSON.parse(r));
      const eski = localStorage.getItem('masa_v1');
      if (eski && !V.dosya.length) {
        const o = JSON.parse(eski);
        V.dosya = o.dosya || [];
        V.zayif = o.zayif || V.zayif;
        V.ist = Object.assign(V.ist, o.ist || {});
      }
    } catch (e) {}
    /* eski localStorage kayıtlarından taşı */
    const tasinacak = V.dosya.filter(d => d.veri || d.resim || d.sorular);
    if (tasinacak.length) {
      ikiliVar = await DB.hazir();
      if (ikiliVar) {
        for (const d of tasinacak) {
          if (d.veri || d.resim || d.sorular) {
            await DB.yaz(d.id, { veri: d.veri || null, resim: d.resim || null,
                                 sorular: d.sorular || [] });
          }
          delete d.veri; delete d.resim; delete d.sorular;
        }
        kaydet();
      }
    } else {
      ikiliVar = await DB.hazir();
      if (ikiliVar) {
        const hepsi = await DB.hepsi();
        for (const d of V.dosya) {
          const k = hepsi[d.id];
          if (k) d.sorular = k.sorular || [];
        }
      }
    }
    const b = new Date().toDateString();
    if (V.ist.sonGun !== b) {
      const d = V.ist.sonGun ? Math.round((new Date(b) - new Date(V.ist.sonGun)) / 864e5) : 99;
      V.ist.seri = d === 1 ? (V.ist.seri || 0) + 1 : 1;
      V.ist.sonGun = b; V.ist.bugun = 0; kaydet();
    }
  }
  function kaydet() { sorularKaydet();
    try {
      const kopya = Object.assign({}, V);
      kopya.dosya = V.dosya.map(d => {
        const o = Object.assign({}, d);
        delete o.veri; delete o.resim; delete o.sorular;
        return o;
      });
      localStorage.setItem(LS, JSON.stringify(kopya));
    } catch (e) {}
  }
  /* soruları IndexedDB'ye yaz (localStorage dolmasın) */
  let soruYaz = null;
  function sorularKaydet() {
    if (!ikiliVar) return;
    clearTimeout(soruYaz);
    soruYaz = setTimeout(async () => {
      for (const d of V.dosya) {
        if (d.sorular) {
          const k = (await DB.oku(d.id)) || {};
          await DB.yaz(d.id, { veri: k.veri || null, resim: k.resim || null, sorular: d.sorular });
        }
      }
    }, 700);
  }

  /* ═════════ TÜM SİTEYİ KAPLAYAN İŞLEM KATMANI ═════════ */
  let perdeSayac = 0, perdeZaman = null;
  const PERDE = {
    ac(bas, alt) {
      perdeSayac++;
      const p = $('#perde'); if (!p) return;
      p.classList.remove('cikis', 'perde-cikis');
      p.hidden = false;
      $('#perdeBas').textContent = bas || 'İşleniyor…';
      $('#perdeAlt').textContent = alt || 'Lütfen bekle';
      $('#perdeCubuk').style.width = '8%';
      let v = 8;
      clearInterval(perdeZaman);
      perdeZaman = setInterval(() => {
        v += (88 - v) * .12;
        $('#perdeCubuk').style.width = v.toFixed(1) + '%';
      }, 220);
    },
    ilerle(y) { const b = $('#perdeCubuk'); if (b) b.style.width = Math.min(96, y) + '%'; },
    kapat() {
      perdeSayac = Math.max(0, perdeSayac - 1);
      if (perdeSayac > 0) return;
      clearInterval(perdeZaman); perdeZaman = null;
      const p = $('#perde'); if (!p || p.hidden) return;
      $('#perdeCubuk').style.width = '100%';
      p.classList.add('cikis');
      setTimeout(() => { p.hidden = true; p.classList.remove('cikis'); }, 200);
    },
    async calis(bas, alt, is) {
      PERDE.ac(bas, alt);
      try { return await is(); }
      finally { PERDE.kapat(); }
    }
  };

  const bildir = (m, t) => {
    const k = $('#bildirimler'); if (!k) return;
    const d = document.createElement('div');
    d.className = 'bildirim' + (t ? ' ' + t : '');
    d.textContent = m; k.appendChild(d);
    setTimeout(() => d.remove(), 3600);
  };

  /* ═════════ METİN / SORU ═════════ */
  function konuBul(m, ders) {
    const l = KONULAR[ders] || []; const t = m.toLowerCase();
    let en = null, cok = 1;
    for (const k of l) {
      const kk = k.toLowerCase(); let n = 0, i = t.indexOf(kk);
      while (i !== -1) { n++; i = t.indexOf(kk, i + kk.length); }
      if (n > cok) { cok = n; en = k.charAt(0).toUpperCase() + k.slice(1); }
    }
    return en;
  }
  function dersTahmin(m) {
    const t = m.toLowerCase(); let en = null, cok = 2;
    for (const d in KONULAR) {
      let n = 0;
      for (const k of KONULAR[d]) if (t.includes(k.toLowerCase())) n++;
      if (n > cok) { cok = n; en = d; }
    }
    return en;
  }
    /* ═════════ SORU ÇIKARMA — çöp sonuçları engeller ═════════ */
    /* başlık / sayfa numarası / cevap anahtarı gibi satırlar soru DEĞİLDİR */
    const SORU_DEGIL = [
      /^\s*sayfa\s*\d+/i,
      /^\s*page\s*\d+/i,
      /^\s*\d{1,4}\s*$/,                        // tek başına sayı
      /cevap\s*anahtar/i,
      /çözüm|cozum\s*:/i,
      /^\s*(ünite|bölüm|bolum|konu|test|deneme|fasikül)\s*[:\-–]/i,
      /^\s*[ivxlc]+\s*[\.\-–]\s*(ünite|bölüm|konu)/i,
      /^\s*[-–—•●○*_]{3,}\s*$/,                // yatay çizgi
      /^\s*\d{4}\s*[-–]\s*\d{4}\s*(yalıtım|sonbahar|ilk|ikinci)?/i, // 2023-2024
      /^\s*ders\s*(kitabı|notu)/i,
      /^\s*(türkçe|matematik|fizik|kimya|biyoloji|edebiyat|tarih|coğrafya|felsefe|ingilizce)\s+\d+/i
    ];
    function copMu(s) {
      const t = s.trim();
      if (t.length < 12) return true;                      // çok kısa
      if (/^[\s\W\d]+$/.test(t)) return true;              // sadece noktalama/rakam
      if ((t.match(/\d/g) || []).length > t.length * .35) return true; // sayıdan ibaret
      for (const r of SORU_DEGIL) if (r.test(t)) return true;
      return false;
    }
    /* A) ... B) ... biçiminde tek satırda seçenekleri ayır */
    function secenekleriAyir(satir) {
      const parca = satir.split(/(?=\(?[A-Fa-f]\)\s)/).map(s => s.trim()).filter(Boolean);
      if (parca.length < 2) return [];
      const c = [];
      for (const p of parca) {
        const m = p.match(/^\(?([A-Fa-f])\)\s*(.+)$/);
        if (!m || !m[2]) return [];
        c.push({ harf:m[1].toUpperCase(), metin:m[2].trim() });
      }
      return c;
    }
    function soruCikar(metin, ders, kid) {
      const sat = metin.split(/\n/).map(s => s.trim()).filter(Boolean);
      /* Cevap anahtarı: "1) B  2) C  3) A" (herhangi bir yerde olabilir) */
      const cevapHaritasi = {};
      for (const s of sat) {
        if (s.length > 300) continue;
        if (!/cevap|anahtar|\bşık\b/i.test(s)) continue;
        const pairs = s.match(/\d{1,3}\s*[:.)\-–]?\s*\(?([A-Fa-f])\)?(?![a-zçğıöşü])/g) || [];
        if (pairs.length < 2) continue;
        for (const pp of pairs) {
          const q = pp.match(/(\d{1,3})/)[1];
          const h = pp.match(/([A-Fa-f])/)[1].toUpperCase();
          cevapHaritasi[q] = h;
        }
      }
      const c = [];
      let cur = null, sec = [];
      const kapat = () => {
        if (!cur) { sec = []; return; }
        const soruMetin = cur.trim();
        const secimler = sec.filter(s => s.metin && s.metin.length > 0).slice(0, 6);
        /* geçerlilik kontrolü — çöpü at */
        const soruBitisMi = /\?\s*$/.test(soruMetin) || secimler.length >= 2;
        const enAz = soruBitisMi ? 8 : 15;
        if (soruMetin.length >= enAz && !copMu(soruMetin)) {
          const secimli = secimler.length >= 2;
          if (soruBitisMi || soruMetin.split(/\s+/).length >= 5) {
            let cevap = curCevap;
            if (!cevap && cevapHaritasi[curNo]) cevap = cevapHaritasi[curNo];
            const harfler = secimler.map(s => s.harf).join('');
            if (cevap && harfler.indexOf(cevap) === -1) cevap = null;
            c.push({
              id: Math.random().toString(36).slice(2,10),
              kutupId: kid, ders, metin: soruMetin,
              secenekler: secimler, cevap: cevap || null,
              tip: secimli ? 'secimli' : 'serbest',
              konu: konuBul(soruMetin, ders),
              no: curNo
            });
          }
        }
        cur = null; sec = []; curCevap = null;
      };
      /* "Soru 12)" / "12." / "12)" ile başlayan gerçek soru satırı */
      const basRe = /^\s*(\d{1,3})\s*(?:[.)\-:]\s*|\s+)(?:soru\s*)?(.+)$/i;
      const basReGuclu = /^\s*(?:soru|test\s*sorusu)\s*(\d{1,3})\s*[.)\-:]?\s*(.+)$/i;
      let curNo = null, curCevap = null, seriNo = 0;
      for (const s of sat) {
        const guclu = s.match(basReGuclu);
        const normal = s.match(basRe);
        const bas = guclu || normal;
        const govd = 2;   // her iki regex'te de gövde 2. grup (1 = numara)
        /* şüpheli: sadece rakamla başlayan ama aslında başlık olan satır */
        if (bas && bas[govd] && bas[govd].trim().length > 2) {
          const no = parseInt(bas[1], 10);
          const govde = bas[govd].trim();
          if (!copMu(govde)) {
            kapat();
            seriNo++;
            curNo = no || seriNo;
            curCevap = null;
            /* aynı satırda seçenek varsa */
            const inline = secenekleriAyir(govde);
            if (inline.length >= 2) {
              cur = inline.map(x => x.metin).join(' ');
              sec = inline;
            } else {
              const cm = govde.match(/^(.*?)(?:\s*(?:doğru\s*cevap|cevap)\s*[:\-]?\s*([A-Fa-f])\b.*)$/i);
              if (cm && cm[1]) { cur = cm[1].trim(); curCevap = cm[2].toUpperCase(); }
              else cur = govde;
            }
            continue;
          }
        }
        /* seçenek satırı: "A) ..." */
        const sc = s.match(/^\(?([A-Fa-f])\)\s*(.+)$/);
        if (sc && cur) {
          const t = sc[2].trim();
          if (t.length > 0 && t.length < 300) sec.push({ harf:sc[1].toUpperCase(), metin:t });
          continue;
        }
        /* soruya devam satırı */
        if (cur && !sc && !copMu(s) && s.length < 400) {
          const g = s.match(/^(?:doğru\s*cevap|cevap)\s*[:\-]?\s*([A-Fa-f])\b/i);
          if (g) { curCevap = g[1].toUpperCase(); continue; }
          cur += ' ' + s;
        }
      }
      kapat();
      return c;
    }

  function dosyaVeri(f) {
    return new Promise((res, rej) => {
      const o = new FileReader(); o.onerror = rej;
      o.onload = e => res(new Uint8Array(e.target.result));
      o.readAsArrayBuffer(f);
    });
  }
  function zayifGuncelle(ders, konu, dogru) {
    const a = ders + '|' + (konu || 'Genel');
    if (!V.zayif[a]) V.zayif[a] = { dogru:0, hata:0 };
    V.zayif[a][dogru ? 'dogru' : 'hata']++;
    kaydet();
  }
  function zayifListe() {
    const l = [];
    for (const a in V.zayif) {
      const d = V.zayif[a], t = d.dogru + d.hata;
      if (!t) continue;
      const o = d.hata / t;
      if (o >= .3 || d.hata >= 2) { const p = a.split('|');
        l.push({ ders:p[0], konu:p[1], dogru:d.dogru, hata:d.hata, oran:o, toplam:t }); }
    }
    return l.sort((a,b) => b.oran - a.oran || b.hata - a.hata);
  }

  /* ═════════ OCR ═════════ */
  let OCR_W = null;
  async function ocrMetin(f, ilerle) {
    if (typeof Tesseract === 'undefined') throw new Error('OCR yüklenemedi (internet kontrolü)');
    if (!OCR_W) {
      ilerle('Türkçe dil dosyası indiriliyor…', 5);
      OCR_W = await Tesseract.createWorker('tur', 1, { logger: m => {
        if (m.status === 'recognizing text') ilerle('Yazılar okunuyor…', 15 + m.progress * 80);
      }});
    }
    ilerle('Görsel taranıyor…', 20);
    const { data } = await OCR_W.recognize(f);
    return (data.text || '').trim();
  }

  /* ═════════ DOSYA EKLEME ═════════ */
    async function ekle(dosyalar) {
      if (typeof pdfjsLib === 'undefined') {
        bildir('PDF.js yüklenemedi — internet bağlantısını kontrol et', 'hata');
        return;
      }
      PERDE.ac('Dosyalar işleniyor…', dosyalar.length + ' dosya hazırlanıyor');
      await new Promise(r => setTimeout(r, 60));
      let x = 400, y = 120, n = 0, hata = 0;
      const gor = [];


      for (const f of dosyalar) {
        const uz = (f.name.split('.').pop() || '').toLowerCase();
        if (uz === 'pdf') {
          try {
            const veri = await dosyaVeri(f);
            const ad = f.name.replace(/\.[^.]+$/, '');
            const pdf = await pdfjsLib.getDocument({ data: veri.slice(0) }).promise;
            let metin = '';
            for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
              const s = await pdf.getPage(i);
              const tc = await s.getTextContent();
              let t = '';
              tc.items.forEach(it => { t += it.str; if (it.hasEOL) t += '\n'; });
              metin += t + '\n';
            }
            if (metin.replace(/\s/g, '').length < 320) {
              PERDE.ac('Yazısız PDF — OCR taranıyor…', f.name + ' · görselden yazı okunuyor');
              let ocr = '';
              const sonSayfa = Math.min(pdf.numPages, 5);
              for (let i = 1; i <= sonSayfa; i++) {
                PERDE.ac('Yazısız PDF — OCR taranıyor…', f.name + ' · sayfa ' + i + '/' + sonSayfa);
                const s2 = await pdf.getPage(i);
                const vp2 = s2.getViewport({ scale: 1.6 });
                const cnv = document.createElement('canvas');
                cnv.width = vp2.width; cnv.height = vp2.height;
                await s2.render({ canvasContext: cnv.getContext('2d'), viewport: vp2 }).promise;
                const blb = await new Promise(r => cnv.toBlob(r, 'image/png'));
                ocr += await ocrMetin(blb, () => {}) + '\n';
              }
              if (ocr.replace(/\s/g, '').length >= 320) metin = ocr;
            }
            const ders = dersTahmin(metin) || ad.split(/[-_\s(]/)[0] || 'Genel';
            const kid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
            const sorular = soruCikar(metin, ders, kid);
            V.dosya.push({ id:kid, no:V.dosya.length+1, ad, ders, tur:'pdf',
                           sayfa:pdf.numPages, adet:sorular.length, tarih:Date.now(),
                           x, y, sorular });
            await ikiliYaz(kid, { veri, resim:null, sorular });
            n++;
            if (!sorular.length) bildir(f.name + ': soru çıkarılamadı (yazı okunamadı) — kitap yine de masada', 'uyari');
            x = 60 + (V.dosya.length % 3) * 330;
            y = 70 + Math.floor(V.dosya.length / 3) * 232;
          } catch (e) { bildir(f.name + ': ' + e.message, 'hata'); hata++; }
        } else if (['png','jpg','jpeg','webp'].includes(uz)) {
          gor.push(f);
        }
      }


      for (const f of gor) {
        const bar = $('#ocrBar');
        $('#ocrAd').textContent = f.name;
        $('#ocrDurum').textContent = 'Hazırlanıyor…';
        $('#ocrCubuk').style.width = '0%';
        bar.hidden = false;
        try {
          const metin = await ocrMetin(f, (t, y) => {
            $('#ocrDurum').textContent = t; $('#ocrCubuk').style.width = y + '%';
          });
          bar.hidden = true;
          if (!metin || metin.length < 20) {
            bildir(f.name + ': yazı bulunamadı', 'uyari'); hata++; continue;
          }
          const ad = f.name.replace(/\.[^.]+$/, '');
          const ders = dersTahmin(metin) || ad.split(/[-_\s(]/)[0] || 'Genel';
          const kid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
          const sorular = soruCikar(metin, ders, kid);
          const veri = await dosyaVeri(f);
          V.dosya.push({ id:kid, no:V.dosya.length+1, ad, ders, tur:'gorsel', ocr:true,
                         metin, sayfa:1, adet:sorular.length, tarih:Date.now(),
                         x, y, sorular });
          await ikiliYaz(kid, { veri, resim:null, sorular });
          n++; x += 44; y += 32;
          bildir(f.name + ': ' + sorular.length + ' soru çıkarıldı', 'basari');
        } catch (e) {
          bar.hidden = true;
          bildir(f.name + ': ' + e.message, 'hata'); hata++;
        }
      }


    kaydet(); ciz();
    PERDE.kapat();
    if (n) {
      bildir(n + ' dosya eklendi — kitap masada', 'basari');
      ekran('masa');
    }
    else if (!hata) bildir('PDF veya görsel seç', 'uyari');
  }

  /* ═════════ PANEL ═════════ */
  const POMO = {
    odak: 25, mola: 5, durum: 'odak',
    toplam: 25 * 60, kalan: 25 * 60,
    kosu: false, tim: null, son: 0,
    bugun: 0
  };
  function pomoYukle() {
    try {
      const s = JSON.parse(localStorage.getItem('dp_pomo') || '{}');
      if (s.bugun && s.tarih === new Date().toDateString()) POMO.bugun = s.bugun;
    } catch (e) {}
  }
  function pomoKaydet() {
    try {
      localStorage.setItem('dp_pomo', JSON.stringify({ bugun: POMO.bugun, tarih: new Date().toDateString() }));
    } catch (e) {}
  }
  function pomoHero() {
    const t4 = POMO.bugun % 4;
    return `<div class="pomo-kutu">
      <div class="pomo-ring">
        <svg viewBox="0 0 200 200">
          <circle class="pr-bg" cx="100" cy="100" r="88"></circle>
          <circle class="pr-il" id="pomoRing" cx="100" cy="100" r="88"
            stroke-dasharray="${(2 * Math.PI * 88).toFixed(1)}"
            stroke-dashoffset="0" stroke-linecap="round"></circle>
        </svg>
        <div class="pomo-merkez"><b class="pomo-sure" id="pomoSure">${bicim(POMO.kalan)}</b>
          <small id="pomoDurum">${POMO.durum === 'odak' ? 'Odak' : POMO.durum === 'mola' ? 'Kısa Mola' : 'Uzun Mola'}</small></div>
      </div>
      <div class="pomo-yan">
        <div class="pomo-efsa">
          <button class="pz-btn${POMO.odak === 25 ? ' aktif' : ''}" data-odak="25" data-mola="5">25/5</button>
          <button class="pz-btn${POMO.odak === 50 ? ' aktif' : ''}" data-odak="50" data-mola="10">50/10</button>
          <button class="pz-btn${POMO.odak === 90 ? ' aktif' : ''}" data-odak="90" data-mola="20">90/20</button>
        </div>
        <div class="pomo-kontrol">
          <button class="u-btn ana" id="pomoBas">${POMO.kosu ? '⏸ Duraklat' : '▶ Başlat'}</button>
          <button class="u-btn" id="pomoSifir" title="Sıfırla">↺</button>
        </div>
        <div class="pomo-stat">
          <span>🍅 Döngü: <b id="pomoTur">${t4}</b>/4</span>
          <span>Bugün: <b id="pomoBugun">${POMO.bugun}</b> odak</span>
        </div>
      </div>
    </div>`;
  }
  function pomoRingGuncelle() {
    const c = $('#pomoRing');
    if (!c) return;
    const C = 2 * Math.PI * 88;
    const kesir = POMO.toplam ? (POMO.toplam - POMO.kalan) / POMO.toplam : 0;
    c.style.strokeDashoffset = (C * (1 - kesir)).toFixed(1);
    c.classList.toggle('mola', POMO.durum !== 'odak');
  }
  function pomoYaziGuncelle() {
    const s = $('#pomoSure');
    if (s) s.textContent = bicim(POMO.kalan);
    const d = $('#pomoDurum');
    if (d) d.textContent = POMO.durum === 'odak' ? 'Odak' : POMO.durum === 'mola' ? 'Kısa Mola' : 'Uzun Mola';
    pomoRingGuncelle();
    if (POMO.kosu) {
      const f = $('#saatFabYazi');
      if (f) {
        f.textContent = bicim(POMO.kalan);
        $('#saatFab').classList.add('calisiyor');
      }
    }
  }
  function pomoTick() {
    const simdi = Date.now();
    const fark = Math.round((simdi - POMO.son) / 1000);
    if (fark > 0) { POMO.kalan -= fark; POMO.son = simdi; }
    if (POMO.kalan <= 0) { POMO.kalan = 0; pomoBitti(); return; }
    pomoYaziGuncelle();
  }
  function pomoBaslat() {
    clearInterval(POMO.tim);
    POMO.kosu = true; POMO.son = Date.now();
    POMO.tim = setInterval(pomoTick, 1000);
  }
  function pomoDuraklat() {
    clearInterval(POMO.tim); POMO.kosu = false; POMO.son = 0;
    document.body.classList.remove('pomo-odakta');
  }
  function pomoSifirla(hedef) {
    clearInterval(POMO.tim); POMO.kosu = false; POMO.son = 0;
    document.body.classList.remove('pomo-odakta');
    if (hedef) Object.assign(POMO, hedef);
    POMO.kalan = POMO.toplam;
  }
  function pomoBitti() {
    clearInterval(POMO.tim);
    POMO.kosu = false; POMO.son = 0;
    bip();
    const tur = $('#pomoTur'), bugun = $('#pomoBugun');
    if (POMO.durum === 'odak') {
      POMO.bugun++; pomoKaydet();
      V.ist.dakika = (V.ist.dakika || 0) + POMO.odak;
      kaydet(); istCiz();
      if (bugun) bugun.textContent = POMO.bugun;
      if (tur) tur.textContent = POMO.bugun % 4;
      if (POMO.bugun % 4 === 0) {
        POMO.durum = 'uzunmola'; POMO.toplam = POMO.mola * 180; POMO.kalan = POMO.toplam;
        bildir('🍅 4 odak tamam! Uzun mola başladı (' + POMO.mola * 3 + ' dk).');
      } else {
        POMO.durum = 'mola'; POMO.toplam = POMO.mola * 60; POMO.kalan = POMO.toplam;
        bildir('🍅 Odak bitti! ' + POMO.mola + ' dk mola başladı.');
      }
      pomoBaslat();
    } else {
      POMO.durum = 'odak'; POMO.toplam = POMO.odak * 60; POMO.kalan = POMO.toplam;
      bildir('☀️ Mola bitti. hazır mısın? Başlat\'a bas.', 'basari');
    }
    document.body.classList.remove('pomo-odakta');
    pomoYaziGuncelle();
    pomoCizTum();
  }
  function pomoCizTum() {
    const kutu = $('#pomoKut');
    if (kutu) {
      kutu.innerHTML = pomoHero();
      pomoBagla();
    }
    pomoYaziGuncelle();
  }
  function pomoBagla() {
    const b = $('#pomoBas');
    if (!b) return;
    b.onclick = () => {
      if (POMO.kosu) pomoDuraklat();
      else {
        if (POMO.kalan <= 0) POMO.kalan = POMO.toplam;
        pomoBaslat();
      }
      b.textContent = POMO.kosu ? '⏸ Duraklat' : '▶ Başlat';
    };
    $('#pomoSifir').onclick = () => { pomoSifirla(); pomoCizTum(); };
    $$('[data-odak]').forEach(x => x.onclick = () => {
      const o = +x.dataset.odak, m = +x.dataset.mola;
      pomoSifirla({ odak: o, mola: m, durum: 'odak', toplam: o * 60 });
      $$('[data-odak]').forEach(y => y.classList.toggle('aktif', y === x));
      pomoCizTum();
    });
  }
  function sayfaPanel() {
    const z = zayifListe();
    const ders = z.length ? [...new Set(z.slice(0,2).map(k => k.ders))] : ['Matematik'];

    $('#icerik').innerHTML = `<div class="ekran">
      <div class="pomo" id="pomoKut">${pomoHero()}</div>

      <div class="ist">
        <div class="ist-k"><b>${V.ist.bugun||0}</b><small>Bugün Çözülen</small></div>
        <div class="ist-k"><b>${V.ist.soru}</b><small>Toplam Soru</small></div>
        <div class="ist-k"><b>${V.ist.dakika}</b><small>Dakika</small></div>
        <div class="ist-k"><b>🔥 ${V.ist.seri||0}</b><small>Gün Serisi</small></div>
      </div>

      <div class="izgara iz-4" style="margin-bottom:32px">
        <button class="eylem" data-git="yukle"><b>📤 PDF Ekle</b><small>Kitabını yükle — kitaplığa kaydolur, 3D defterde okunur</small></button>
        <button class="eylem" data-git="coz"><b>📝 Soru Çöz</b><small>Seç, çöz, puanını gör</small></button>
        <button class="eylem" data-git="masa"><b>🖥️ Masam</b><small>Kitapları yan yana gör</small></button>
        <button class="eylem" data-koc><b>🤖 Koç</b><small>Konu anlat, plan yap</small></button>
      </div>

      <div class="izgara iz-2">
        <div class="kart">
          <div class="k-bas"><div><h2>📚 Kitaplık</h2>
            <p>${V.dosya.length} dosya · ${V.dosya.reduce((t,d)=>t+d.adet,0)} soru</p></div></div>
          ${V.dosya.length ? `<div class="izgara iz-auto">${V.dosya.slice(0,4).map(dosyaKarti).join('')}</div>`
            : bosKutu('📚','Kitaplık boş','PDF veya soru fotoğrafı ekle', 'yukle')}
        </div>

        <div class="kart">
          <div class="k-bas"><div><h2>🎯 Zayıf Konular</h2>
            <p>${z.length ? 'Üzerine çalış' : 'Veri bekleniyor'}</p></div></div>
          ${z.length ? z.slice(0,6).map(k => {
            const y = Math.round(k.oran*100);
            const c = y>=60?'var(--hata)':y>=40?'var(--uyari)':'var(--ana)';
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--cizgi)">
              <span style="width:8px;height:8px;border-radius:50%;background:${rengi(k.ders)}"></span>
              <div style="flex:1;min-width:0"><b style="font-size:13.5px">${esc(k.konu||'Genel')}</b>
                <small style="display:block;font-size:11.5px;color:var(--metin-3)">${esc(k.ders)} · ${k.hata}/${k.toplam} yanlış</small></div>
              <span style="font-size:12.5px;font-weight:700;padding:3px 9px;border-radius:6px;background:${c}22;color:${c}">%${y}</span>
            </div>`;
          }).join('') : bosKutu('🎯','Zayıf konu yok','Soru çöz, buraya listelensin', null)}
        </div>
      </div>

      <div class="kart">
        <div class="k-bas"><div><h2>📺 Önerilen Kanallar</h2>
          <p>${z.length ? esc(z[0].ders) : 'Matematik'} için gerçek YouTube kanalları</p></div></div>
        <div class="izgara iz-3">
          ${ders.slice(0,6).map(d => {
            const kk = kanalGetir(d)[0];
            if (!kk) return '';
            return `<a class="eylem" target="_blank" rel="noopener" style="text-decoration:none"
               href="${kanalUrl(kk[1], d, z[0] ? z[0].konu : '')}">
               <b>▶ ${esc(kk[1])}</b><small>${esc(d)} · kanala git</small></a>`;
          }).join('')}
        </div>
      </div>
    </div>`;
    pomoBagla();
  }

  function bosKutu(ikon, bas, alt, ekran) {
    return `<div class="bos">
      <div class="bos-ikon">${ikon}</div>
      <h3>${esc(bas)}</h3><p>${esc(alt)}</p>
      ${ekran ? `<button class="p-btn ana" data-git="${ekran}">Başla</button>` : ''}
    </div>`;
  }

  function dosyaKarti(d) {
    const c = rengi(d.ders);
    return `<div class="dosya">
      <div class="dosya-ust">
        <span style="font-size:15px">${d.tur==='gorsel'?'🖼️':'📄'}</span>
        <span class="dosya-ad">${esc(d.ad)}</span>
        <span class="dosya-no">#${String(d.no).padStart(2,'0')}</span>
      </div>
      <div class="dosya-govde"><div class="dosya-ozet">${esc(d.ders)} · ${d.sayfa} sayfa · ${d.adet} soru</div></div>
        <div class="dosya-alt">
          <span class="et" style="background:${c}">${esc(d.ders)}</span>
          <span class="et" style="background:var(--ok)">${d.adet} soru</span>
          <button class="mini-btn duz" data-ac="${d.id}">Aç</button>
          <button class="mini-btn tehlike" data-sil="${d.id}" title="Sil">✕</button>
        </div></div>`;
    }


  /* ═════════ KİTAPLIK ═════════ */
  function sayfaKutup() {
    $('#icerik').innerHTML = `<div class="ekran">
      <div class="k-bas"><div><h2>Kitaplık</h2>
        <p>${V.dosya.length} dosya · toplam ${V.dosya.reduce((t,d)=>t+d.adet,0)} soru</p></div>
        <button class="p-btn ana" data-git="yukle">📤 PDF Ekle</button></div>
      ${V.dosya.length ? `<div class="izgara iz-auto">${V.dosya.map(dosyaKarti).join('')}</div>`
        : bosKutu('📭','Kitaplık boş','PDF veya soru fotoğrafı ekle', 'yukle')}
    </div>`;
    baglaDosyalar();
  }

  function baglaDosyalar() {
    $$('[data-ac]').forEach(e => e.onclick = () => {
      const d = V.dosya.find(x => x.id === e.dataset.ac);
      if (!d) return;
      kitapAc(d);
      setTimeout(() => ekran('masa'), 0);
      setTimeout(() => masaVurgula(d.id), 150);
    });
      $$('[data-sil]').forEach(e => e.onclick = () => {
        const d = V.dosya.find(x => x.id === e.dataset.sil);
        if (!d) return;
        if (!confirm('"' + d.ad + '" silinsin mi?')) return;
        V.dosya = V.dosya.filter(x => x.id !== e.dataset.sil);
        V.dosya.forEach((x, i) => x.no = i + 1);
        ikiliSil(e.dataset.sil);
        kaydet(); ciz(); ekran('kutup');
        bildir('Silindi', 'basari');
      });

    $$('[data-git]').forEach(e => e.onclick = () => {
      if (e.dataset.git === 'yukle') kaydirAc();
      else ekran(e.dataset.git);
    });
    $$('[data-koc]').forEach(e => e.onclick = kocAc);
  }

  /* ═════════ SORU ÇÖZME ═════════ */
  function sayfaCoz() {
    const dersler = [...new Set(V.dosya.flatMap(d => (d.sorular || []).map(s => s.ders)))];
    const z = zayifListe();
    $('#icerik').innerHTML = `<div class="ekran">
      <div class="k-bas"><div><h2>Soru Çöz</h2>
        <p>${V.dosya.reduce((t,d)=>t+d.adet,0)} soru hazır</p></div></div>

      ${V.dosya.length ? `
      <div class="izgara iz-2">
        <div class="kart"><h3>📚 Dosyadan seç</h3>
          <p style="margin-bottom:16px">Hangi dosyanın sorularını çözeceksin?</p>
          <div class="izgara" style="gap:8px">
            ${V.dosya.map(d => `<button class="p-btn" data-coz="${d.id}" style="justify-content:space-between">
              <span>${esc(d.ad)}</span><span style="color:var(--metin-3)">${d.adet} soru</span>
            </button>`).join('')}
          </div>
        </div>
        <div class="kart"><h3>⚡ Hızlı test</h3>
          <p style="margin-bottom:16px">Otomatik seçimle hemen başla.</p>
          <div class="izgara" style="gap:8px">
            <button class="p-btn" data-hizli="10">🎲 Rastgele 10 soru</button>
            <button class="p-btn" data-hizli="20">🎲 Rastgele 20 soru</button>
            ${z.length ? `<button class="p-btn ana" data-zayif>🎯 Zayıf konu (${esc(z[0].konu||'')})</button>` : ''}
          </div>
        </div>
      </div>`
      : bosKutu('📝','Soru yok','Önce PDF veya görsel ekle', 'yukle')}
    </div>`;

    baglaDosyalar();
    $$('[data-coz]').forEach(e => e.onclick = () =>
      soruSec(V.dosya.find(x => x.id === e.dataset.coz)));
    $$('[data-hizli]').forEach(b => b.onclick = () => {
      const tum = V.dosya.flatMap(d => d.sorular || []).sort(() => Math.random() - .5);
      testBasla(tum.slice(0, +b.dataset.hizli));
    });
    const zy = $('[data-zayif]');
    if (zy) zy.onclick = () => {
      const havuz = V.dosya.flatMap(d => d.sorular || [])
        .filter(s => s.ders === z[0].ders && s.konu === z[0].konu);
      if (havuz.length) testBasla(havuz.sort(() => Math.random() - .5).slice(0,15));
      else bildir('Bu konuda soru yok', 'uyari');
    };
  }

  /* ═════════ SORU SEÇİM ═════════ */
  const SS = { dosya:null, secili:new Set() };
  function soruSec(d) {
    const s = (d && d.sorular && d.sorular.length) ? d.sorular : V.dosya.flatMap(x => x.sorular || []);
    if (!s.length) { bildir('Soru yok', 'uyari'); return; }
    SS.dosya = d; SS.secili = new Set(s.map(x => x.id));
    $('#suru').hidden = false;
    $('#suruAd').textContent = (d ? d.ad : 'Tüm Sorular');
    $('#suruSayi').textContent = s.length + ' soru bulundu';
    $('#suruListe').innerHTML = s.map((x,i) =>
      `<label class="ss secili"><input type="checkbox" checked value="${esc(x.id)}">
        <span class="ss-no">${i+1}</span>
        <span class="ss-yazi">${esc(x.metin.slice(0,120))}${x.metin.length>120?'…':''}</span>
        <span class="s-et" style="background:${rengi(x.ders)}">${esc(x.ders.slice(0,12))}</span>
      </label>`).join('');
    ssYazi();
    $$('#suruListe .ss').forEach(el => el.onclick = ev => {
      if (ev.target.tagName === 'INPUT') return;
      const cb = el.querySelector('input'); cb.checked = !cb.checked;
      el.classList.toggle('secili', cb.checked); ssYazi();
    });
    $$('#suruListe input').forEach(cb => cb.onchange = () => {
      cb.closest('.ss').classList.toggle('secili', cb.checked); ssYazi();
    });
  }
  function ssYazi() {
    $$('#suruListe input').forEach(cb => {
      cb.checked ? SS.secili.add(cb.value) : SS.secili.delete(cb.value);
    });
    $('#suruSecilen').textContent = SS.secili.size + ' soru seçildi';
  }
  function ssUygula(fn) {
    $$('#suruListe input').forEach((cb,i) => {
      cb.checked = fn(i); cb.closest('.ss').classList.toggle('secili', cb.checked);
    });
    ssYazi();
  }
  $('#suruTumu').onclick = () => ssUygula(() => true);
  $('#suruYok').onclick = () => ssUygula(() => false);
  $('#suruIlk10').onclick = () => ssUygula(i => i < 10);
  $('#suruRastgele').onclick = () => ssUygula(() => Math.random() < .3);
  $('#suruKapat').onclick = $('#suruKapat2').onclick = () => { $('#suru').hidden = true; };
  $('#suru').onclick = e => { if (e.target.id === 'suru') $('#suru').hidden = true; };
  $('#suruBasla').onclick = () => {
    const kaynak = (SS.dosya && SS.dosya.sorular && SS.dosya.sorular.length) ? SS.dosya.sorular
      : V.dosya.flatMap(x => x.sorular || []);
    const sec = kaynak.filter(x => SS.secili.has(x.id));
    if (!sec.length) { bildir('En az 1 soru seç', 'uyari'); return; }
    $('#suru').hidden = true;
    testBasla(sec);
  };

  /* ═════════ TEST ═════════ */
  const T = { sorular:[], i:0, cevap:{}, bitis:false };
  function testBasla(sorular) {
    if (!sorular.length) { bildir('Soru yok', 'uyari'); return; }
    Object.assign(T, { sorular, i:0, cevap:{}, bitis:false });
    if (!$('#test')) {
      const d = document.createElement('div');
      d.id = 'test'; d.className = 'test';
      d.innerHTML = '<div class="test-i"></div>';
      document.body.appendChild(d);
    }
    testCiz();
  }
  function testKapat() { const t = $('#test'); if (t) t.remove(); T.bitis = false; }

  function testCiz() {
    const s = T.sorular[T.i];
    const secili = T.cevap[T.i];
    $('#test .test-i').innerHTML = `
      <div class="k-bas"><div><h2>${esc(s.ders)}${s.konu?' · '+esc(s.konu):''}</h2>
        <p>${T.i+1} / ${T.sorular.length} soru</p></div>
        <button class="p-btn" id="tKapat">✕ Bitir</button></div>

      <div class="soru-k">
        <div class="soru-no">${T.i+1}</div>
        <div class="soru-m">${esc(s.metin)}</div>
        ${s.secenekler.length
          ? s.secenekler.map(o => `<label class="sec${secili===o.harf?' secili':''}">
              <input type="radio" name="ts" value="${o.harf}" ${secili===o.harf?'checked':''}>
              <b>${o.harf}</b><span>${esc(o.metin)}</span></label>`).join('')
          : `<textarea class="a-girdi" id="tSerbest" style="min-height:130px;margin-top:16px"
               placeholder="Cevabını yaz…">${esc(T.cevap[T.i]||'')}</textarea>`}
      </div>

      <div style="display:flex;justify-content:space-between;gap:12px">
        <button class="p-btn" id="tGeri" ${T.i===0?'disabled':''}>← Önceki</button>
        <button class="p-btn ana" id="tIleri">${T.i===T.sorular.length-1?'Bitir ve Değerlendir':'Sonraki →'}</button>
      </div>`;

    $('#tKapat').onclick = testBitti;
    $('#tIleri').onclick = () => { T.i < T.sorular.length-1 ? (T.i++, testCiz()) : testBitti(); };
    $('#tGeri').onclick = () => { if (T.i>0) { T.i--; testCiz(); } };
    $$('input[name="ts"]').forEach(r => r.onchange = () => {
      T.cevap[T.i] = r.value;
      $$('input[name="ts"]').forEach(x => x.closest('.sec').classList.toggle('secili', x.checked));
    });
    const ta = $('#tSerbest');
    if (ta) ta.oninput = () => { T.cevap[T.i] = ta.value; };
  }

  function testBitti() {
    if (T.bitis) return;
    T.bitis = true;
    let dogru = 0; const detay = [];
    for (let i = 0; i < T.sorular.length; i++) {
      const s = T.sorular[i], c = T.cevap[i] || '';
      const ok = !!(s.secenekler.length && s.cevap && c.toUpperCase() === String(s.cevap).toUpperCase());
      if (ok) dogru++;
      zayifGuncelle(s.ders, s.konu, ok);
      detay.push({ s, c, ok });
    }
    V.ist.soru += T.sorular.length;
    V.ist.dogru += dogru;
    V.ist.yanlis += T.sorular.length - dogru;
    V.ist.bugun = (V.ist.bugun||0) + T.sorular.length;
    V.yanlislar = V.yanlislar || [];
    for (const x of detay) {
      if (!x.ok) {
        V.yanlislar.unshift({
          m: x.s.metin, d: x.s.ders, k: x.s.konu || '',
          c: x.s.cevap || '', s: x.c || '', t: Date.now()
        });
      }
    }
    V.yanlislar = V.yanlislar.slice(0, 40);
    kaydet(); istCiz();

    const puan = Math.round(dogru / T.sorular.length * 100);
    $('#test .test-i').innerHTML = `
      <div style="text-align:center;margin-bottom:32px">
        <div style="font-size:56px;font-weight:800;letter-spacing:-2px;
          color:${puan>=70?'var(--ok)':puan>=40?'var(--uyari)':'var(--hata)'}">%${puan}</div>
        <p style="color:var(--metin-2);margin-top:6px">${dogru} / ${T.sorular.length} doğru</p>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;margin-bottom:32px;flex-wrap:wrap">
        <button class="p-btn" id="sKapat">✓ Tamam</button>
        <button class="p-btn" id="sYine">🔁 Tekrar</button>
        <button class="p-btn ana" id="sKoc2">🤖 Koça Anlat</button>
      </div>
      <div class="izgara" style="gap:10px">
        ${detay.map((x,i) => `<div class="soru-k" style="margin:0;cursor:pointer" data-son="${i}">
          <b style="font-size:13.5px;display:block;margin-bottom:8px">
            ${i+1}. ${esc(x.s.metin.slice(0,100))}${x.s.metin.length>100?'…':''}</b>
          <div style="display:flex;gap:7px;flex-wrap:wrap">
            <span class="et" style="background:${x.ok?'var(--ok)':'var(--hata)'}">${x.ok?'✓ Doğru':'✗ Yanlış'}</span>
            <span class="et" style="background:var(--yuzey-3)">Senin: ${esc(x.c||'—')}</span>
            ${x.s.cevap ? `<span class="et" style="background:var(--ok)">Doğru: ${esc(x.s.cevap)}</span>` : ''}
          </div></div>`).join('')}
      </div>`;

    $('#sKapat').onclick = testKapat;
    $('#sYine').onclick = () => { testKapat(); testBasla(T.sorular.sort(()=>Math.random()-.5)); };
    $('#sKoc2').onclick = () => {
      testKapat();
      const y = detay.filter(x => !x.ok);
      kocAc();
      kocMesaj('%'+puan+' aldım. ' + (y.length
        ? 'Şu konularda takıldım: ' + [...new Set(y.map(x=>x.s.konu).filter(Boolean))].join(', ')
        : 'Hepsi doğru!'), 's');
    };
    $$('[data-son]').forEach(e => e.onclick = () => {
      const x = detay[+e.dataset.son];
      kocAc(); degerlendir(x.s, x.c, x.ok);
    });
  }

  /* ═════════ MASA — yatay/dikey kaydırma + akıcı yakınlaştırma ═════════ */
  const masa = { x:40, y:40, z:1, hedefZ:1, raf:null };
  const MASA_MIN = .15, MASA_MAX = 4;

  function masaUygula() {
    const ic = $('#masaIc');
    if (ic) ic.style.transform = `translate(${masa.x}px,${masa.y}px) scale(${masa.z})`;
    const y = $('#masaYuzde');
    if (y) y.textContent = Math.round(masa.z*100) + '%';
    const s = $('#mKaydirici');
    if (s && Math.abs((s.value/100) - masa.z) > .005) s.value = Math.round(masa.z*100);
  }
  /* imlecin altındaki noktayı sabit tutarak yakınlaştır */
  function yakin(yon, imlec) {
    const r = $('#masa');
    if (!r) return;
    const kutu = r.getBoundingClientRect();
    const ox = imlec ? imlec.x - kutu.left : kutu.width/2;
    const oy = imlec ? imlec.y - kutu.top  : kutu.height/2;
    let y = masa.z * Math.pow(1.18, yon);
    y = Math.max(MASA_MIN, Math.min(MASA_MAX, y));
    masa.x -= (ox - masa.x) * (1 - y/masa.z);
    masa.y -= (oy - masa.y) * (1 - y/masa.z);
    masa.z = y;
    masaUygula();
  }
  /* yumuşak animasyonla hedef ölçeğe git */
  function yakinYumusak(z) {
    z = Math.max(MASA_MIN, Math.min(MASA_MAX, z));
    const bas = masa.z, fark = z - bas, t0 = performance.now(), sure = 240;
    if (masa.raf) cancelAnimationFrame(masa.raf);
    const adim = (t) => {
      const o = Math.min(1, (t - t0)/sure);
      const g = 1 - Math.pow(1-o, 3);
      masa.z = bas + fark * g;
      masaUygula();
      if (o < 1) masa.raf = requestAnimationFrame(adim);
      else masa.raf = null;
    };
    masa.raf = requestAnimationFrame(adim);
  }
  function masaSifirla() {
    const m = $('#masa'), ic = $('#masaIc');
    if (!m || !ic) return;
    const r = m.getBoundingClientRect();
    const z = Math.min(r.width/ic.offsetWidth, r.height/ic.offsetHeight) * .88;
    masa.z = Math.max(MASA_MIN, Math.min(MASA_MAX, z));
    masa.x = (r.width  - ic.offsetWidth  *masa.z)/2;
    masa.y = (r.height - ic.offsetHeight *masa.z)/2;
    masaUygula();
  }
  function masaSigtar() { yakinYumusak(Math.max(MASA_MIN, Math.min(1, masa.z))); }

  function sayfaMasa() {
    $('#icerik').innerHTML = `<div class="ekran" style="padding:0">
      <div class="masa" id="masa">
        <div class="masa-ic" id="masaIc"></div>
        <div class="masa-arac">
          <button class="u-btn" id="mUzak" title="Uzaklaştır (Ctrl −)">&#8722;</button>
          <span class="masa-yuzde" id="masaYuzde">100%</span>
          <button class="u-btn" id="mYakin" title="Yakınlaştır (Ctrl +)">&#43;</button>
          <input class="masa-cubuk" id="mKaydirici" type="range" min="15" max="400" value="100"
                 title="Yakınlaştırma seviyesi">
          <span class="masa-ayrac"></span>
          <button class="u-btn" id="mSifirla" title="Ekrana sığdır (0)">&#9974;</button>
          <button class="u-btn" id="mYuzde100" title="%100">1:1</button>
          <button class="u-btn" id="mKoy">&#128196; Ekle</button>
        </div>
      </div></div>`;

    $('#mKoy').onclick = kaydirAc;
    $('#mUzak').onclick = () => yakin(-1);
    $('#mYakin').onclick = () => yakin(1);
    $('#mSifirla').onclick = masaSifirla;
    $('#mYuzde100').onclick = () => yakinYumusak(1);
    $('#mKaydirici').oninput = function () {
      if (masa.raf) { cancelAnimationFrame(masa.raf); masa.raf = null; }
      const y = Math.max(MASA_MIN, Math.min(MASA_MAX, this.value/100));
      const r = $('#masa').getBoundingClientRect();
      const ox = r.width/2, oy = r.height/2;
      masa.x -= (ox - masa.x) * (1 - y/masa.z);
      masa.y -= (oy - masa.y) * (1 - y/masa.z);
      masa.z = y;
      masaUygula();
    };

    const m = $('#masa');
    /* Ctrl+tekerlek = yakınlaştır, tekerlek = kaydır */
    m.addEventListener('wheel', e => {
      if (e.ctrlKey) {
        e.preventDefault();
        yakin(e.deltaY < 0 ? 1 : -1, { x:e.clientX, y:e.clientY });
      } else {
        e.preventDefault();
        masa.x -= e.deltaX; masa.y -= e.deltaY;
        masaUygula();
      }
    }, { passive:false });
    /* dokunmatik: tek parmak kaydır, iki parmak yakınlaştır */
    let kay = null, sonMesafe = null;
    m.addEventListener('touchstart', e => {
      if (e.target.closest('.ka')) return;
      if (e.touches.length === 1)
        kay = { x:e.touches[0].clientX, y:e.touches[0].clientY, ox:masa.x, oy:masa.y };
      else if (e.touches.length === 2)
        sonMesafe = mesafe(e.touches);
    }, { passive:true });
    m.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && kay) {
        masa.x = kay.ox + (e.touches[0].clientX - kay.x);
        masa.y = kay.oy + (e.touches[0].clientY - kay.y);
        masaUygula();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const d = mesafe(e.touches);
        if (sonMesafe && d) {
          yakin(d/sonMesafe > 1 ? 1 : -1, {
            x:(e.touches[0].clientX + e.touches[1].clientX)/2,
            y:(e.touches[0].clientY + e.touches[1].clientY)/2
          });
        }
        sonMesafe = d;
      }
    }, { passive:false });
    m.addEventListener('touchend', () => { kay = null; sonMesafe = null; });
    const mesafe = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    m.addEventListener('mousedown', e => {
      if (e.target.closest('.ka')) return;
      kay = { x:e.clientX, y:e.clientY, ox:masa.x, oy:masa.y };
    });
    const hareket = e => {
      if (!kay) return;
      masa.x = kay.ox + (e.clientX - kay.x);
      masa.y = kay.oy + (e.clientY - kay.y);
      masaUygula();
    };
    const birak = () => { kay = null; };
    document.addEventListener('mousemove', hareket);
    document.addEventListener('mouseup', birak);

    masaCiz();
    setTimeout(masaSifirla, 30);
  }

  function masaVurgula(id) {
    const el = document.querySelector(`#masaIc [data-ac="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'center', inline:'center' });
    el.classList.remove('ka-vurgu');
    void el.offsetWidth;
    el.classList.add('ka-vurgu');
    setTimeout(() => el.classList.remove('ka-vurgu'), 2800);
  }

  function masaSaat3HTML(sx, sy) {
    const c = [...Array(12)].map((_, i) => `<i style="transform:rotate(${i*30}deg)"></i>`).join('');
    return `<div class="sa3" style="--x:${sx}px;--y:${sy}px">
      <div class="sa3-uc">
        <div class="sa3-kas">
          <div class="sa3-kadran">
            <div class="sa3-cz">${c}</div>
            <div class="sa3-ibree s3-saat" id="s3Sa"></div>
            <div class="sa3-ibree s3-dk" id="s3Dk"></div>
            <div class="sa3-ibree s3-sn" id="s3Sn"></div>
            <div class="sa3-ort"></div>
          </div>
          <div class="sa3-dijital" id="s3Diji">--:--:--</div>
          <div class="sa3-tarih" id="s3Tarih"></div>
        </div>
        <div class="sa3-taban"></div>
      </div>
      <div class="sa3-mini">
        <div class="s3-satir">
          <span class="et s3-rozet">⏱ Kronometre</span>
          <b id="s3Kron">00:00</b>
          <button class="mini-btn" id="s3KaBas" title="Başlat/Duraklat">▶</button>
          <button class="mini-btn" id="s3KaSifir" title="Sıfırla">↺</button>
        </div>
        <div class="s3-satir">
          <span class="et s3-rozet s3-sari">⏳ Zamanlayıcı</span>
          <b id="s3Zam">25:00</b>
          <button class="mini-btn" id="s3ZaBas" title="Başlat/Duraklat">▶</button>
          <button class="mini-btn" id="s3ZaSifir" title="Sıfırla">↺</button>
        </div>
        <div class="s3-dk-s">
          <input class="s3-girdi" id="s3Dk" type="number" min="1" max="240"
            value="${SAAT.zaman.kosu ? '' : SAAT.zaman.hedef}"
            placeholder="dk" ${SAAT.zaman.kosu ? 'disabled' : ''}>
          <span>dk kendin seç</span>
        </div>
      </div>
    </div>`;
  }
  function masaSaat3Ciz() {
    const d = new Date();
    const sn = d.getSeconds(), dk = d.getMinutes(), sr = (d.getHours() % 12) * 30 + dk * .5;
    const el = $('#s3Sn'); if (!el) return;
    el.style.transform = `translateY(-100%) rotate(${sn*6}deg)`;
    $('#s3Dk').style.transform = `translateY(-100%) rotate(${dk*6}deg)`;
    $('#s3Sa').style.transform = `translateY(-100%) rotate(${sr}deg)`;
    $('#s3Diji').textContent = saatS(d.getHours()) + ':' + saatS(d.getMinutes()) + ':' + saatS(d.getSeconds());
    $('#s3Tarih').textContent = d.getDate() + ' ' + SAAT_AYLAR[d.getMonth()] + ' ' + d.getFullYear();
    $('#s3Kron').textContent = bicim(SAAT.kron.sn);
    $('#s3Zam').textContent = bicim(SAAT.zaman.kalan);
    $('#s3KaBas').textContent = SAAT.kron.kosu ? '⏸' : '▶';
    $('#s3ZaBas').textContent = SAAT.zaman.kosu ? '⏸' : '▶';
  }
  let masa3Tim = null;
  function masaSaat3Bagla() {
    $('#s3KaBas').onclick = () => kronToggle();
    $('#s3ZaBas').onclick = () => zamanToggle();
    $('#s3KaSifir').onclick = () => {
      const k = SAAT.kron; clearInterval(k.tim); k.kosu = false; k.son = 0; k.sn = 0; saatCiz(); masaSaat3Ciz();
    };
    $('#s3ZaSifir').onclick = () => {
      const z = SAAT.zaman; clearInterval(z.tim); z.kosu = false; z.son = 0; z.kalan = z.hedef * 60; saatCiz(); masaSaat3Ciz();
    };
    $('#s3Dk').onchange = function () {
      let m = parseInt(this.value, 10);
      if (!m || m < 1) return;
      m = Math.min(240, m);
      const z = SAAT.zaman;
      clearInterval(z.tim); z.kosu = false; z.son = 0;
      z.hedef = m; z.kalan = m * 60;
      saatCiz(); masaSaat3Ciz();
    };
    $('.sa3-kadran').onclick = () => $('#saatFab').click();
    if (masa3Tim) clearInterval(masa3Tim);
    masaSaat3Ciz();
    masa3Tim = setInterval(masaSaat3Ciz, 1000);
  }

  function masaBosHTML() {
    return `<div class="masa-bos" style="--x:430px;--y:120px">
      <div class="mb-ikon">📚</div>
      <b>Kitaplıktan PDF seç, öyle gel!</b>
      <p>Masanda kitap yok. Kitaplığa git, oradaki PDF'in üstüne bas — kitap masaya oturur, seni buraya getirir.</p>
      <div class="mb-ekle">
        <button class="p-btn ana" id="mBosKitap">📚 Kitaplıdan PDF Seç</button>
        <button class="p-btn" id="mBosEkle">📤 Hiç yoksa PDF Ekle</button>
      </div>
    </div>`;
  }

  function masaCiz() {
    const ic = $('#masaIc');
    if (!ic) return;
    const sx = 60 + (V.dosya.length % 3) * 330;
    const sy = 70 + Math.floor(V.dosya.length / 3) * 232;
    ic.innerHTML = (V.dosya.length ? V.dosya.map(d => {
      const c = rengi(d.ders);
      return `<div class="ka" style="--x:${d.x}px;--y:${d.y}px;--w:280px">
        <div class="ka-kutu" data-ac="${d.id}" style="cursor:pointer">
          <div class="ka-ust"><span style="font-size:14px">${d.tur==='gorsel'?'🖼️':'📄'}</span>
            <span class="ka-ad">${esc(d.ad)}</span>
            <span class="ka-no">#${String(d.no).padStart(2,'0')}</span></div>
          <div class="ka-govde">${(d.sorular || []).slice(0,4).map((s,i) =>
            `<div class="ka-sat"><i>${i+1}</i>${esc(s.metin.slice(0,34))}…</div>`).join('')
            || '<div class="ka-sat"><i>1</i>'+esc(d.ad)+'</div>'}</div>
          <div class="ka-alt">
            <span class="et" style="background:${c}">${esc(d.ders)}</span>
            <span class="et" style="background:var(--ok)">${d.adet} soru</span>
          </div></div></div>`;
    }).join('') : masaBosHTML()) + masaSaat3HTML(sx, sy);
    $$('#masaIc [data-ac]').forEach(e => e.onclick = ev => {
      kitapAc(V.dosya.find(x => x.id === e.dataset.ac));
    });
    const mBosEkle = $('#mBosEkle');
    if (mBosEkle) mBosEkle.onclick = () => kaydirAc();
    const mBosKitap = $('#mBosKitap');
    if (mBosKitap) mBosKitap.onclick = () => ekran('kutup');
    masaSaat3Bagla();
  }

  /* ═════════ KİTAP ═════════ */
  const OKU = { veri:null, z:1, tip:'kitap3d', cift:true, no:1, toplam:1, pdf:null, isaret:{} };
  try { localStorage.removeItem('dp_ok_tip'); } catch (e) {}

  /* kitap yakınlaştırma — %25 – %400 */
  function okYakinla(yon) {
    const eski = OKU.z;
    let y = eski * Math.pow(1.25, yon);
    y = Math.max(.25, Math.min(4, y));
    if (Math.abs(y - eski) < .001) return;
    OKU.z = y;
    $('#okYuzde').textContent = Math.round(y*100) + '%';
    sayfaCiz();
  }
  function okSifirla() {
    OKU.z = 1; $('#okYuzde').textContent = '100%'; sayfaCiz();
  }
  /* sayfayı ekrana sığdır */
  function okSigar() {
    const gov = $('#okGovde'); if (!gov) return;
    const sayfa = gov.querySelector('.sk, .kp-yuz');
    if (!sayfa) return;
    const w = sayfa.querySelector('div');
    if (!w) return;
    const taban = 620;
    const en = gov.clientWidth - 40;
    const z = Math.max(.25, Math.min(2, en / (taban * (OKU.cift ? 2 : 1))));
    OKU.z = z;
    $('#okYuzde').textContent = Math.round(z*100) + '%';
    sayfaCiz();
  }
  function okSayfayaGit(n) {
    n = Math.max(1, Math.min(OKU.toplam, n));
    OKU.no = n;
    const g = $('#okNo'); if (g) g.value = n;
    sayfaCiz(); seritCiz();
    const gv = $('#okGovde'); if (gv) gv.scrollTop = 0;
  }
  async function kitapAc(d) {
    if (!d) return;
    $('#okuyucu').hidden = false;
    $('#okAd').textContent = d.ad;
    Object.assign(OKU, { veri:d, no:1, z:1, isaret:{} });
    if (OKU.pen) { OKU.pen.acik = false; OKU.pen.cizimler = {}; OKU.pen.cnv = null; }
    penYukle();
    $('#okYuzde').textContent = '100%';
    $('#okSol').disabled = false; $('#okSag').disabled = false;

    if (d.tur === 'gorsel') {
      OKU.toplam = 1;
      $('#okToplam').textContent = '/1';
      $('#okNo').value = 1; $('#okNo').max = 1;
      $('#okSerit').innerHTML = '';
      $('#okGovde').innerHTML = `<div class="sk"><div class="sk-yazi">${esc(d.metin||'')}</div></div>`;
      return;
    }

      $('#okGovde').innerHTML = '<div class="soru-k" style="margin:auto"><p style="color:var(--metin-3)">Kitap açılıyor…</p></div>';
      try {
        let ham = d.veri;
        if (!ham) {
          const kayit = await ikiliOku(d.id);
          ham = kayit && kayit.veri;
        }
        if (!ham) throw new Error('Dosya içeriği bulunamadı (yedekten geri yükle)');
        OKU.pdf = await pdfjsLib.getDocument({ data: ham.slice(0) }).promise;
        OKU.toplam = OKU.pdf.numPages;
        $('#okToplam').textContent = '/' + OKU.toplam;
        $('#okNo').max = OKU.toplam; $('#okNo').value = 1;
        seritCiz(); sayfaCiz();
      } catch (e) {
        $('#okGovde').innerHTML = `<div class="soru-k" style="margin:auto">
          <p style="color:var(--hata)">Açılamadı: ${esc(e.message)}</p></div>`;
      }
    }

  function seritCiz() {
    const k = $('#okSerit'); k.innerHTML = '';
    for (let i = 1; i <= OKU.toplam; i++) {
      const d = document.createElement('div');
      d.className = 'sp' + (i === OKU.no ? ' aktif' : '');
      d.textContent = i;
        d.onclick = () => okSayfayaGit(i);
      k.appendChild(d);
    }
  }
  async function sayfaCiz() {
    const gov = $('#okGovde');
    gov.classList.add('k3d');
    gov.innerHTML = '';
    const ilerleme = document.createElement('div');
    ilerleme.className = 'ok-ilerleme';
    ilerleme.innerHTML = '<i id="okIlerleme"></i>';
    gov.appendChild(ilerleme);
    OKU.cift = true;
    await kitap3dCiz(gov);
    gov.onscroll = () => {
      const y = gov.scrollTop, en = gov.scrollHeight - gov.clientHeight;
      const b = $('#okIlerleme');
      if (b) b.style.width = (en > 0 ? (y/en*100) : 100) + '%';
    };
    gov.classList.toggle('pan-ol',
      gov.scrollWidth > gov.clientWidth || gov.scrollHeight > gov.clientHeight);
  }

  /* sayfa tuvali cache — taze gör */
  OKU.tuval = new Map();
  function tuvalAl(n) {
    if (OKU.tuval.has(n)) return OKU.tuval.get(n);
    return null;
  }
  function tuvalDus() {
    while (OKU.tuval.size > 14) OKU.tuval.delete(OKU.tuval.keys().next().value);
  }
  async function sayfaTuval(n) {
    if (!OKU.pdf) return null;
    if (OKU.tuval.has(n)) return OKU.tuval.get(n);
    const sf = await OKU.pdf.getPage(n);
    const vp = sf.getViewport({ scale: 2 });
    const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    await sf.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    OKU.tuval.set(n, cv);
    tuvalDus();
    return cv;
  }
  function tuvalOncu(liste) {
    liste.forEach(n => {
      if (OKU.tuval.has(n) || n < 1 || n > OKU.toplam) return;
      sayfaTuval(n).catch(() => {});
    });
  }

    async function kitap3dCiz(gov) {
      if (!OKU.pdf) {
        const k = document.createElement('div');
        k.className = 'kitap';
        const s = document.createElement('div');
        s.className = 'sk';
        s.innerHTML = `<div class="sk-yazi">${esc(OKU.veri ? OKU.veri.metin : '')}</div>`;
        k.appendChild(s);
        gov.appendChild(k);
        return;
      }
      const GENISLIK = 620;
      const z = Math.min(Math.max(OKU.z, .25), 4);
      let base = OKU.no;
      if (!(base % 2)) base -= 1;
      if (base < 1) base = 1;
      const liste = [base];
      if (OKU.toplam > base) liste.push(base + 1);
      const tek = liste.length === 1;

      const sahne = document.createElement('div');
      sahne.className = 'kp-sahne';
      const kitap = document.createElement('div');
      kitap.className = 'kp-kitap';
      sahne.appendChild(kitap);
      const golge = document.createElement('div');
      golge.className = 'kp-golge';
      kitap.appendChild(golge);
      gov.appendChild(sahne);

      let ilkYukseklik = 800;
      const sirt = tek ? null : document.createElement('div');
      if (sirt) sirt.className = 'kp-sirt';

      for (let i = 0; i < liste.length; i++) {
        const n = liste[i];
        const yuz = document.createElement('div');
        yuz.className = 'kp-yuz ' + (i === 0 ? (tek ? 'kp-sag' : 'kp-sol') : 'kp-sag');
        yuz.dataset.sayfa = n;
        if (OKU.isaret[n]) yuz.style.outline = '3px solid var(--uyari)';
        yuz.style.width = Math.round(GENISLIK * z) + 'px';
        const goz = document.createElement('div');
        goz.className = 'kp-goz';
        yuz.appendChild(goz);
        const w = document.createElement('div');
        w.style.position = 'relative';
        try {
          const kln = tuvalAl(n);
          if (kln) {
            /* cache hit — anında */
            if (i === 0) ilkYukseklik = (kln.height / 2) * z;
            const cv = document.createElement('canvas');
            cv.width = kln.width; cv.height = kln.height;
            cv.getContext('2d').drawImage(kln, 0, 0);
            cv.style.width = '100%'; cv.style.height = 'auto';
            w.appendChild(cv);
            yuz.appendChild(w);
          } else {
            const sf = await OKU.pdf.getPage(n);
            const vp = sf.getViewport({ scale: 2 });
            if (i === 0) ilkYukseklik = (vp.height / 2) * z;
            const cv = document.createElement('canvas');
            cv.width = vp.width; cv.height = vp.height;
            cv.style.width = '100%'; cv.style.height = 'auto';
            w.appendChild(cv);
            yuz.appendChild(w);
            await sf.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
            OKU.tuval.set(n, cv);
            tuvalDus();
          }
        } catch (e) {
          const hataK = document.createElement('div');
          hataK.className = 'sk-yazi';
          hataK.textContent = 'Açılamadı';
          yuz.appendChild(hataK);
        }
        const no = document.createElement('div');
        no.className = 'sk-no';
        no.textContent = n;
        yuz.appendChild(no);
        yuz.onclick = () => {
          OKU.isaret[n] = !OKU.isaret[n];
          yuz.style.outline = OKU.isaret[n] ? '3px solid var(--uyari)' : '';
        };
        if (i === 0 && sirt) kitap.appendChild(sirt);
        kitap.appendChild(yuz);
      }

      if (sirt) {
        const g = Math.max(780, ilkYukseklik);
        const adet = Math.max(6, Math.min(26, Math.floor((g - 38) / 40)));
        for (let i = 0; i < adet; i++) {
          const h = document.createElement('div');
          h.className = 'kp-halka';
          h.style.top = ((i + .55) / adet * 100) + '%';
          sirt.appendChild(h);
        }
      }
      gov.onscroll = () => {
        const y = gov.scrollTop, en = gov.scrollHeight - gov.clientHeight;
        const b = $('#okIlerleme');
        if (b) b.style.width = (en > 0 ? (y/en*100) : 100) + '%';
      };
      gov.classList.add('pan-ol');
      tuvalOncu([base + 2, base + 3, base - 2, base - 1]);
    }

  let kitapDoniyor = false;
  function kitapCevir(yon) {
    if (!OKU.pdf || kitapDoniyor) return;
    const kitap = $('#okGovde .kp-kitap');
    if (!kitap) return;
    const kaynak = kitap.querySelector(yon > 0 ? '.kp-sag' : '.kp-sol');
    if (!kaynak || sayfadaSon(yon)) { return; }
    kitapDoniyor = true;
    const kr = kaynak.getBoundingClientRect();
    const kn = kitap.getBoundingClientRect();
    const pf = document.createElement('div');
    pf.className = 'kp-don';
    pf.style.cssText = 'position:absolute;top:' + Math.round(kr.top - kn.top) + 'px;left:' +
      Math.round(kr.left - kn.left) + 'px;width:' + Math.round(kr.width) + 'px;height:' +
      Math.round(kr.height) + 'px;transform-origin:' + (yon > 0 ? '0 50%' : '100% 50%');
    kitap.appendChild(pf);
    void pf.offsetWidth;
    pf.style.transform = yon > 0 ? 'rotateY(-168deg)' : 'rotateY(168deg)';
    pf.style.opacity = '.97';
    kitap.style.transition = 'transform .3s var(--e)';
    kitap.style.transform = 'rotateX(13deg)';
    setTimeout(() => {
      kitap.style.transform = '';
      pf.remove();
      kitapDoniyor = false;
      sayfaGit(yon);
    }, 320);
  }
  function sayfadaSon(yon) {
    const b = OKU.no; const sal = b % 2 === 0 ? b - 1 : b;
    if (yon > 0) return sal + 2 > OKU.toplam;
    return sal <= 1;
  }
  function sayfaGit(yon) {
    let b = OKU.no; if (b%2===0) b--;
    let y = yon > 0 ? b+2 : b-2;
    y = Math.max(1, Math.min(OKU.toplam, y));
    if (y === OKU.no) return;
    okSayfayaGit(y);
  }
  $('#okSol').onclick = () => kitapCevir(-1);
  $('#okSag').onclick = () => kitapCevir(1);
  $('#okIlk').onclick = () => okSayfayaGit(1);
  $('#okSon').onclick = () => okSayfayaGit(OKU.toplam);
  $('#okYakin').onclick = () => okYakinla(1);
  $('#okUzak').onclick = () => okYakinla(-1);
  $('#okNo').onchange = function () { okSayfayaGit(parseInt(this.value, 10) || 1); };

  $('#okTam').onclick = function () {
    const u = $('#okuyucu');
    if (!document.fullscreenElement) (u.requestFullscreen||u.webkitRequestFullscreen).call(u);
    else (document.exitFullscreen||document.webkitExitFullscreen).call(document);
  };
  $('#okSigar').onclick = () => okSigar();
  $('#okYuzde100').onclick = () => okSifirla();

  /* PDF içinde: Ctrl+tekerlek = yakınlaştır, düz tekerlek = kaydır */
  $('#okGovde').addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    okYakinla(e.deltaY < 0 ? 1 : -1);
  }, { passive:false });

  /* sol tık basılı + sürükle = görünümü kaydır (masa gibi pan) */
  (function panTak() {
    const gov = $('#okGovde');
    let pan = null, yol = 0;
    gov.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (OKU.pen && OKU.pen.acik) return;
      pan = { x: e.clientX, y: e.clientY };
      yol = 0;
      gov.classList.add('pan-tut');
    });
    document.addEventListener('mousemove', e => {
      if (!pan) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      yol += Math.abs(dx) + Math.abs(dy);
      gov.scrollLeft -= dx;
      gov.scrollTop -= dy;
      pan = { x: e.clientX, y: e.clientY };
    });
    document.addEventListener('mouseup', () => {
      if (!pan) return;
      pan = null;
      gov.classList.remove('pan-tut');
      if (yol > 6) {
        const sus = ev => { ev.stopPropagation(); ev.preventDefault(); };
        gov.addEventListener('click', sus, { capture:true, once:true });
        setTimeout(() => gov.removeEventListener('click', sus, { capture:true }), 0);
      }
    });
    /* sayfaya tıkla: sol yarı = geri, sağ yarı = ileri (sürüklemeye sayılmaz) */
    gov.addEventListener('click', e => {
      if (OKU.pen && OKU.pen.acik) return;
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.toString()) return;
      const r = gov.getBoundingClientRect();
      kitapCevir(e.clientX < r.left + r.width / 2 ? -1 : 1);
    });
    /* dokunmatik: sola/sağa kaydır = sayfa çevir */
    let dok = null;
    gov.addEventListener('touchstart', e => {
      if (OKU.pen && OKU.pen.acik) { dok = null; return; }
      if (e.touches.length === 1) dok = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
    }, { passive: true });
    gov.addEventListener('touchend', e => {
      if (!dok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - dok.x, dy = Math.abs(t.clientY - dok.y);
      const sure = Date.now() - dok.t;
      dok = null;
      if (sure > 650 || dy > 70) return;
      if (dx < -55) { kitapCevir(1); e.preventDefault(); }
      else if (dx > 55) { kitapCevir(-1); e.preventDefault(); }
    }, { passive: false });
  })();

  document.addEventListener('fullscreenchange', () => setTimeout(sayfaCiz, 140));
  document.addEventListener('keydown', e => {
    if ($('#okuyucu').hidden) return;
    if (/input|textarea/i.test(e.target.tagName) && e.target.id !== 'okNo') return;
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      if (k === '+' || k === '=') { okYakinla(1); e.preventDefault(); }
      else if (k === '-' || k === '_') { okYakinla(-1); e.preventDefault(); }
      else if (k === '0') { okSifirla(); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { kitapCevir(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { kitapCevir(-1); e.preventDefault(); }
    else if (e.key === 'Home') { okSayfayaGit(1); e.preventDefault(); }
    else if (e.key === 'End') { okSayfayaGit(OKU.toplam); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') okYakinla(1);
    else if (e.key === '-') okYakinla(-1);
    else if (e.key === 'Escape' && !document.fullscreenElement) kitapKapat();
  });
  function kitapKapat() {
    $('#okuyucu').hidden = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    OKU.pdf = null;
    if (OKU.tuval) OKU.tuval.clear();
    if (OKU.pen && OKU.pen.acik) { OKU.pen.acik = false; penMod(); }
  }
  $('#okKapat').onclick = kitapKapat;

  /* ═════════ KALEM (sayfa üstü çizim) ═════════ */
  OKU.pen = { acik: false, arac: 'kalem', boya: '#E53935', kalin: 4, cnv: null, ctx: null,
              cizimler: {}, ust: null, ciziyor: false, cisim: null };
  function penAnahtar() {
    const d = OKU.veri;
    return d && d.tur === 'pdf' ? 'dp_pen_' + (d.id || d.ad) : null;
  }
  function penYukle() {
    const a = penAnahtar();
    if (!a) { OKU.pen.cizimler = {}; return; }
    try {
      const j = JSON.parse(localStorage.getItem(a) || '{}');
      OKU.pen.cizimler = j && typeof j === 'object' ? j : {};
    } catch (e) { OKU.pen.cizimler = {}; }
  }
  function penKaydet() {
    const a = penAnahtar();
    if (!a) return;
    try {
      const k = Object.keys(OKU.pen.cizimler);
      k.forEach(x => { if (OKU.pen.cizimler[x] && OKU.pen.cizimler[x].length > 350) OKU.pen.cizimler[x] = OKU.pen.cizimler[x].slice(-350); });
      localStorage.setItem(a, JSON.stringify(k.length && OKU.pen.cizimler ? OKU.pen.cizimler : {}));
    } catch (e) {}
  }
  function penSayfa() { return Math.max(1, OKU.no) + '_' + (OKU.no + 1); }
  function penCizimler() {
    const s = penSayfa();
    if (!OKU.pen.cizimler[s]) OKU.pen.cizimler[s] = [];
    return OKU.pen.cizimler[s];
  }
  function penKatman() {
    const gov = $('#okGovde');
    if (!gov) return;
    let cnv = $('#penCnv');
    if (!cnv && OKU.pen.acik) {
      cnv = document.createElement('canvas');
      cnv.id = 'penCnv';
      cnv.className = 'pen-katman';
      gov.appendChild(cnv);
    }
    if (cnv) cnv.classList.toggle('acik', OKU.pen.acik);
    if (cnv && !OKU.pen.acik) cnv.classList.add('yok');
    OKU.pen.cnv = cnv;
    if (cnv) OKU.pen.ctx = cnv.getContext('2d');
    if (cnv) penBoyutla();
  }
  new MutationObserver(() => {
    if (OKU.pen && OKU.pen.acik) setTimeout(penKatman, 50);
  }).observe($('#okGovde'), { childList: true });
  function penBoyutla() {
    const gov = $('#okGovde'), cnv = OKU.pen.cnv;
    if (!gov || !cnv) return;
    const w = Math.max(gov.scrollWidth, gov.clientWidth);
    const h = Math.max(gov.scrollHeight, gov.clientHeight);
    if (cnv.width !== Math.round(w) || cnv.height !== Math.round(h)) {
      cnv.width = Math.round(w);
      cnv.height = Math.round(h);
    }
    cnv.style.width = w + 'px';
    cnv.style.height = h + 'px';
    penYenile();
  }
  function penYenile() {
    const ctx = OKU.pen.ctx, cnv = OKU.pen.cnv;
    if (!ctx || !cnv) return;
    ctx.clearRect(0, 0, cnv.width, cnv.height);
    const siralar = penCizimler();
    siralar.forEach(c => penCizgi(ctx, c));
  }
  function penCizgi(ctx, c) {
    if (!c.pts || !c.pts.length) return;
    ctx.strokeStyle = c.b;
    ctx.lineWidth = c.k;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = c.b === 'SILGI' ? 'destination-out' : 'source-over';
    ctx.beginPath();
    c.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    if (c.pts.length === 1) ctx.lineTo(c.pts[0][0] + .01, c.pts[0][1] + .01);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  function penNokta(e) {
    const gov = $('#okGovde'), cnv = OKU.pen.cnv;
    if (!gov || !cnv) return [0, 0];
    const cx = 'ontouchstart' in window && e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches && e.touches.length ? e.touches[0].clientY : e.clientY;
    const r = cnv.getBoundingClientRect();
    return [cx - r.left + gov.scrollLeft, cy - r.top + gov.scrollTop];
  }
  function penSilYakala(pts) {
    const siralar = penCizimler();
    for (let i = siralar.length - 1; i >= 0; i--) {
      const c = siralar[i];
      if (c.pts.some(p => p[0] >= pts.x - 18 && p[0] <= pts.x + 18 && p[1] >= pts.y - 18 && p[1] <= pts.y + 18)) {
        siralar.splice(i, 1);
        penYenile();
      }
    }
  }
  function penBasla(e) {
    if (!OKU.pen.acik) return;
    if (e.target.id !== 'penCnv') return;
    e.preventDefault();
    const n = penNokta(e);
    if (OKU.pen.arac === 'silgi') {
      OKU.pen.silgyo = true;
      penSilYakala({ x: n[0], y: n[1] });
      return;
    }
    OKU.pen.ciziyor = true;
    OKU.pen.cisim = { b: OKU.pen.boya, k: OKU.pen.kalin, pts: [n] };
  }
  function penHareket(e) {
    if (e.target.id !== 'penCnv') return;
    if (!OKU.pen.ciziyor && !OKU.pen.silgyo) return;
    e.preventDefault();
    const n = penNokta(e);
    if (OKU.pen.silgyo) { penSilYakala({ x: n[0], y: n[1] }); return; }
    const c = OKU.pen.cisim;
    const son = c.pts[c.pts.length - 1];
    const dx = n[0] - son[0], dy = n[1] - son[1];
    if (dx * dx + dy * dy < 4) return;
    c.pts.push(n);
    penCizgi(OKU.pen.ctx, { b: c.b, k: c.k, pts: c.pts.slice(-2) });
  }
  function penBit(e) {
    if (OKU.pen.silgyo) { OKU.pen.silgyo = false; penKaydet(); return; }
    if (!OKU.pen.ciziyor) return;
    OKU.pen.ciziyor = false;
    if (OKU.pen.cisim && OKU.pen.cisim.pts.length) {
      penCizimler().push(OKU.pen.cisim);
      if (penCizimler().length > 350) penCizimler().shift();
    }
    OKU.pen.cisim = null;
    penYenile();
    penKaydet();
  }
  function penMod() {
    $('#kalemCubuk').hidden = !OKU.pen.acik;
    $('#okKalem').classList.toggle('aktif', OKU.pen.acik);
    $('#okuyucu').classList.toggle('kalem-mod', OKU.pen.acik);
    penKatman();
    const cnv = OKU.pen.cnv;
    if (cnv) {
      if (OKU.pen.acik) {
        cnv.classList.add('acik'); cnv.classList.remove('yok');
        cnv.style.pointerEvents = 'auto';
        cnv.style.cursor = OKU.pen.arac === 'silgi' ? 'crosshair' : 'pointer';
      } else {
        cnv.classList.remove('acik'); cnv.classList.add('yok');
        cnv.remove();
        OKU.pen.cnv = null; OKU.pen.ctx = null;
      }
    }
  }
  $('#okKalem').onclick = () => { penYukle(); OKU.pen.acik = !OKU.pen.acik; penMod(); };
  $('#pkKalem').onclick = () => { OKU.pen.arac = 'kalem'; penTablo(); };
  $('#pkSilgi').onclick = () => { OKU.pen.arac = 'silgi'; penTablo(); };
  $('#pkGeri').onclick = () => {
    const siralar = penCizimler();
    siralar.pop();
    penYenile(); penKaydet();
  };
  $('#pkTemiz').onclick = () => {
    OKU.pen.cizimler[penSayfa()] = [];
    penYenile(); penKaydet();
    bildir('Bu sayfadaki çizimler temizlendi', 'basari');
  };
  $('#pkKapat').onclick = () => { OKU.pen.acik = false; penMod(); };
  $$('#kalemCubuk .kalem-boya').forEach(b => b.onclick = () => {
    OKU.pen.boya = b.dataset.renk;
    OKU.pen.arac = 'kalem';
    penTablo();
  });
  $$('#kalemCubuk [data-kalin]').forEach(b => b.onclick = () => { OKU.pen.kalin = +b.dataset.kalin; penTablo(); });
  function penTablo() {
    $('#pkKalem').classList.toggle('aktif', OKU.pen.arac === 'kalem');
    $('#pkSilgi').classList.toggle('aktif', OKU.pen.arac === 'silgi');
    $$('#kalemCubuk .kalem-boya').forEach(b => b.classList.toggle('aktif', b.dataset.renk === OKU.pen.boya));
    $$('#kalemCubuk [data-kalin]').forEach(b => b.classList.toggle('aktif', +b.dataset.kalin === OKU.pen.kalin));
    const cnv = OKU.pen.cnv;
    if (cnv) cnv.style.cursor = OKU.pen.arac === 'silgi' ? 'crosshair' : 'pointer';
  }
  $('#okGovde').addEventListener('mousedown', penBasla);
  $('#okGovde').addEventListener('mousemove', penHareket);
  document.addEventListener('mouseup', () => penBit());
  $('#okGovde').addEventListener('touchstart', penBasla, { passive: false });
  $('#okGovde').addEventListener('touchmove', penHareket, { passive: false });
  document.addEventListener('touchend', () => penBit());
  penYukle();
  $('#okMesaj').onclick = () => {
    if (!OKU.veri) return;
    kocAc();
    const is = Object.keys(OKU.isaret).filter(k => OKU.isaret[k]);
    kocMesaj(is.length
      ? `**${OKU.veri.ad}** sayfa ${is.join(', ')} — çözemedim, yardım lazım.`
      : `**${OKU.veri.ad}** çalışıyorum, plan yapar mısın?`, 's');
  };

  /* ═════════ KOÇ ═════════ */
  const aiHazir = () => !!(V.ayar.aiAnahtar && V.ayar.aiUrl);
  /* ═════════ AI — sağlayıcı algılama ve sağlam hata mesajı ═════════ */
  function aiAnahtarTemizle(v) {
    return String(v || '')
      .replace(/[\r\n\t]/g, '')
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '')
      .trim();
  }
  const AI_SAGLAYICI = [
    { ad:'Google Gemini', esles:/^AIza[0-9A-Za-z_-]{30,}$/,
      url:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model:'gemini-2.0-flash',
      neden:'Anahtar biçimi geçersiz görünüyor (AIza ile başlamalı).' },
    { ad:'Groq', esles:/^gsk_[0-9A-Za-z]{20,}$/,
      url:'https://api.groq.com/openai/v1/chat/completions',
      model:'llama-3.3-70b-versatile',
      neden:'Anahtar biçimi geçersiz görünüyor (gsk_ ile başlamalı).' },
    { ad:'OpenRouter', esles:/^sk-or-v1-[0-9A-Za-z]{20,}$/,
      url:'https://openrouter.ai/api/v1/chat/completions',
      model:'google/gemini-2.0-flash-001',
      neden:'Anahtar biçimi geçersiz görünüyor (sk-or-v1- ile başlamalı).' },
    { ad:'Together AI', esles:/^[0-9a-f]{64}$/,
      url:'https://api.together.xyz/v1/chat/completions',
      model:'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      neden:'Anahtar biçimi geçersiz görünüyor (64 karakter olmalı).' },
    { ad:'Anthropic', esles:/^sk-ant-[0-9A-Za-z_-]{20,}$/,
      url:'', model:'',
      neden:'Anthropic anahtarı tarayıcıdan doğrudan kullanılamaz (CORS engelli). OpenRouter ya da Groq anahtarı kullan.' },
    { ad:'OpenAI', esles:/^sk-[0-9A-Za-z]{20,}$/,
      url:'https://api.openai.com/v1/chat/completions',
      model:'gpt-4o-mini',
      neden:'Anahtar biçimi geçersiz görünüyor (sk- ile başlamalı).' }
  ];
  function aiSaglayici(v) {
    for (const s of AI_SAGLAYICI) if (s.esles.test(v)) return s;
    return { ad:'Bilinmiyor', url:'', model:'', neden:
      'Anahtar biçimi tanınmadı. Google (AIza…), Groq (gsk_…), OpenRouter (sk-or-v1-…) veya OpenAI (sk-…) anahtarı kullan.' };
  }
  function aiHataCevir(r, govde) {
    const j = (() => { try { return JSON.parse(govde); } catch (e) { return null; } })();
    const m = (j && (j.error && (j.error.message || j.error) ||
           j.message || j.detail)) || '';
    if (r.status === 401) return 'Yetkilendirme hatası (401) — anahtar reddedildi.'
      + (m ? '\nSunucu: ' + m : '') + '\n\n• Anahtarı kopyalarken boşluk olmadığından emin ol.'
      + '\n• Farklı bir sağlayıcının anahtarını OpenAI adresinde kullanma.';
    if (r.status === 403) return 'Erişim reddedildi (403) — anahtar var ama bu modele izin yok.';
    if (r.status === 404) return 'Model bulunamadı (404): ' + (V.ayar.aiModel || '?')
      + '\nAyarlar → Model kısmından geçerli bir model adı yaz.';
    if (r.status === 429) return 'Kota aşıldı (429) — biraz bekle.';
    if (r.status >= 500) return 'Servis hatası (' + r.status + ') — sağlayıcıda sorun var, sonra dene.';
    if (!navigator.onLine) return 'İnternet bağlantısı yok.';
    return 'Sunucu ' + r.status + (m ? ': ' + m : (govde ? ': ' + govde.slice(0, 200) : ''));
  }
  async function aiGonder(mesajlar, sec) {
    sec = sec || {};
    /* anahtar yoksa: ücretsiz anahtarsız Koç (Pollinations) */
    const anahtar = aiAnahtarTemizle(V.ayar.aiAnahtar);
    if (!anahtar) {
      try {
        const r = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: mesajlar, model: 'openai' })
        });
        const m = await r.text().catch(() => '');
        if (!r.ok || !m) throw new Error('Koç servisi şu an yoğun (' + r.status + '). Birazdan tekrar dene.');
        return m.replace(/^[=[]["']/g, '').slice(0, 4000);
      } catch (e) {
        throw new Error('Koç servisi şu an yazışamıyor: ' + e.message + '\nİnternetten bağlantını kontrol et, sonra tekrar dene.');
      }
    }
    const t = { model: V.ayar.aiModel || 'gpt-4o-mini', messages: mesajlar,
      temperature: sec.t !== undefined ? sec.t : .4, max_tokens: sec.mt || 1600 };
    let r;
    try {
      r = await fetch(V.ayar.aiUrl, {
        method:'POST',
        headers:{ 'Content-Type':'application/json',
                  'Authorization':'Bearer ' + anahtar },
        body: JSON.stringify(t)
      });
    } catch (e) {
      throw new Error('Ağ hatası — servis adresine ulaşılamadı.\n' + e.message);
    }
    const govde = await r.text().catch(() => '');
    if (!r.ok) throw new Error(aiHataCevir(r, govde));
    let j;
    try { j = JSON.parse(govde); }
    catch (e) { throw new Error('Sunucu yanıtı okunamadı.'); }
    const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!c) throw new Error('Boş yanıt geldi.');
    return c.trim();
  }
  async function aiTest(v, p) {
    if (!p.url) return { hata: p.neden || 'Servis adresi belirlenemedi.' };
    try {
      const r = await fetch(p.url, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + v },
        body: JSON.stringify({ model: p.model, messages: [{ role:'user', content:'merhaba' }],
          max_tokens: 5 })
      });
      const g = await r.text().catch(() => '');
      if (!r.ok) return { hata: aiHataCevir(r, g) };
      let yazi = '';
      try {
        const j = JSON.parse(g);
        yazi = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim().slice(0, 60);
      } catch (e) {}
      return { tamam: true, yazi: yazi || 'yanıt geldi ✓' };
    } catch (e) {
      return { hata: 'Ağ hatası — ' + e.message };
    }
  }

  async function aiCagir(mesajlar, sec) {
    return await aiGonder(mesajlar, sec);
  }
  function kocMesaj(m, kim) {
    const k = $('#kocMesaj'), d = document.createElement('div');
    d.className = 'km ' + (kim||'k');
    d.innerHTML = esc(m).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>');
    k.appendChild(d); k.scrollTop = k.scrollHeight;
  }
    function kocDusun() {
      const k = $('#kocMesaj'), d = document.createElement('div');
      d.className = 'km d'; d.id = 'kocDusun';
      d.innerHTML = '<span>•</span><span>•</span><span>•</span> düşünüyorum…';
      k.appendChild(d); k.scrollTop = k.scrollHeight;
    }

  function kocCevap(m, tip) {
    const d = document.getElementById('kocDusun'); if (d) d.remove();
    const k = $('#kocMesaj'), e = document.createElement('div');
    e.className = 'km ' + (tip||'k');
    e.innerHTML = esc(m).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
      .replace(/\[YT:(.+?)\]/g, (_,q) =>
        `<a href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}"
          target="_blank" rel="noopener" style="color:var(--ana-2)">📺 ${q}</a>`);
    k.appendChild(e); k.scrollTop = k.scrollHeight;
  }
  function kocOzet() {
    const z = zayifListe();
    $('#kocOzet').innerHTML =
      `<b>Bugün:</b> ${V.ist.bugun||0} soru · ${V.ist.dakika} dk · 🔥 ${V.ist.seri||0} gün` +
      (z.length ? `<br><b>Zayıf:</b> ${esc(z[0].konu||'—')}` : '') +
      (OKU.veri ? `<br><b>Açık:</b> ${esc(OKU.veri.ad)}` : '');
  }
  async function kocSor(metin) {
    kocMesaj(metin, 's'); kocDusun();
    const z = zayifListe();
    const baglam = `Bugün ${V.ist.bugun||0} soru (toplam ${V.ist.soru}, ${V.ist.dakika} dk). ` +
      (z.length ? `Zayıf: ${z.slice(0,3).map(k=>k.ders+' — '+k.konu).join('; ')}.` : '') +
      (OKU.veri ? ` Açık kitap: "${OKU.veri.ad}".` : '');
      try {
        PERDE.ac('Koç düşünüyor…', 'Yapay zekâ cevabı hazırlıyor');
        const cevap = await aiCagir([
          { role:'system', content:'Sen öğrenciye koçluk yapan öretmensin. Motivasyon ver, plan öner, ' +
            'kavramı sade anlat. Türkçe, 200-350 kelime. Video önerirken sona [YT:arama] ekle.' },
          { role:'user', content: baglam + '\n\nÖğrenci: ' + metin }
        ], { mt:1600 });
        PERDE.kapat();
        kocCevap(cevap);
      } catch (e) { PERDE.kapat(); kocCevap('❌ ' + e.message, 'y'); }
    }

  async function degerlendir(soru, cevap, ok) {
    kocDusun();
    try {
      kocCevap(await aiCagir([
        { role:'system', content:'Öğretmen gibi açıkla. Türkçe, 150-250 kelime. Sona [YT:arama] ekle.' },
        { role:'user', content:`Ders: ${soru.ders}${soru.konu?' | Konu: '+soru.konu:''}\n`+
          `Soru: ${soru.metin}\nCevap: ${cevap}\nSonuç: ${ok?'doğru':'yanlış'}\n\nAçıkla ve video öner.` }
      ], { mt:800 }), ok ? 'k' : 'y');
      return;
    } catch (e) {}
    const dM = soru.secenekler.find(x => x.harf === String(soru.cevap||'').toUpperCase());
    kocCevap((ok ? '✅ **Doğru!** Anlamışsın.\n\n' : '❌ **Yanlış.**\n') +
      (dM ? `\n**Doğru:** ${dM.harf}) ${dM.metin}\n` : '') +
      `\n[YT:${soru.ders} ${soru.konu||''} konu anlatım]`, ok ? 'k' : 'y');
  }
  function kocAc() {
    $('#koc').classList.add('acik');
    $('#uKoc').classList.add('aktif');
    kocOzet();
    $('#kocAi').hidden = true;
    if (!$('#kocMesaj').children.length) {
      kocMesaj('Merhaba! Ben **koçun**. 📚\n\nHemen çalışabiliriz: yaz da konuşalım. Plan yaparım, konu anlatırım, video bulurum.', 'k');
      const z = zayifListe();
      if (z.length) kocMesaj(`**${esc(z[0].konu||'temel konular')}** konusuna bak — ${z[0].hata} yanlışın var.`, 'k');
    }
  }
  $('#uKoc').onclick = kocAc;
  $('#kocKapat').onclick = () => { $('#koc').classList.remove('acik'); $('#uKoc').classList.remove('aktif'); };

  /* AI anahtarı paneli */
  $('#kocAyar').onclick = function () {
    const p = $('#kocAi');
    p.hidden = !p.hidden;
    if (!p.hidden) { $('#kocKey').value = V.ayar.aiAnahtar; $('#kocKey').focus(); }
  };
    $$('[data-ai]').forEach(b => b.onclick = () => window.open(b.dataset.ai, '_blank', 'noopener'));
    $('#kocKeyKaydet').onclick = async function () {
      const btn = this;
      const v = aiAnahtarTemizle($('#kocKey').value);
      if (!v) { bildir('Anahtar boş', 'uyari'); return; }
      btn.disabled = true; btn.textContent = 'Bağlanıyor…';
      const p = aiSaglayici(v);
      V.ayar.aiAnahtar = v;
      V.ayar.aiUrl = p.url;
      V.ayar.aiModel = p.model;
      V.ayar.aiSaglayici = p.ad;
      const sonuc = await aiTest(v, p);
      if (sonuc.hata) {
        btn.disabled = false; btn.textContent = 'Bağlan';
        bildir(sonuc.hata, 'hata');
        kocMesaj('**Bağlantı kurulamadı:**\n' + esc(sonuc.hata), 'y');
        $('#kocAi').hidden = false;
        return;
      }
      kaydet();
      btn.disabled = false; btn.textContent = 'Bağlan';
      $('#kocAi').hidden = true;
      $('#kocDurum').textContent = 'Bağlı ✓';
      kocMesaj('✅ Anahtar kaydedildi (' + p.ad + '). Artık sorularına **gerçekten cevap verebilirim**.', 'k');
      bildir('AI bağlandı: ' + p.ad, 'basari');
    };

  $('#kocKeyTest').onclick = async function () {
    const btn = this;
    let v = aiAnahtarTemizle($('#kocKey').value);
    if (!v) v = aiAnahtarTemizle(V.ayar.aiAnahtar);
    if (!v) { bildir('Önce anahtar yaz ya da Bağla', 'uyari'); return; }
    const p = aiSaglayici(v);
    if (!p.url) { bildir(p.neden, 'hata'); return; }
    btn.disabled = true; btn.textContent = 'Deniyorum…';
    const sonuc = await aiTest(v, p);
    btn.disabled = false; btn.textContent = '⚡ Test Et';
    if (sonuc.hata) {
      bildir('Test başarısız: ' + sonuc.hata, 'hata');
      kocMesaj('**Test başarısız:** ' + esc(sonuc.hata) + '\n\nBu anahtar bu sitede çalışmaz. Yerine Google AI Studio (ÜCRETSİZ, AIza ile başlar) anahtarı kullan.', 'y');
    } else {
      bildir('✅ Test başarılı (' + p.ad + '): ' + sonuc.yazi, 'basari');
      V.ayar.aiAnahtar = v; V.ayar.aiUrl = p.url; V.ayar.aiModel = p.model; V.ayar.aiSaglayici = p.ad;
      kaydet();
      $('#kocAi').hidden = true;
      $('#kocDurum').textContent = 'AI çalışıyor ✓';
      kocMesaj('✅ Test başarılı — **' + p.ad + '** yanıt verdi. Hadi konuşmaya başla!', 'k');
    }
  };
  $('#kocKeySil').onclick = function () {
    V.ayar.aiAnahtar = '';
    kaydet();
    $('#kocKey').value = '';
    $('#kocAi').hidden = true;
    $('#kocDurum').textContent = 'Hazır';
    bildir('Anahtar silindi');
  };
  $('#kocForm').onsubmit = e => {
    e.preventDefault();
    const g = $('#kocGirdi');
    if (!g.value.trim()) return;
    kocSor(g.value.trim()); g.value = '';
  };
  function yanlisAnalizMesaji() {
    const y = V.yanlislar || [];
    const z = zayifListe();
    let m = 'Son yanlışlarımı değerlendirir misin?\n';
    if (y.length) {
      m += '\nSon yanlışlarım (en yeniden):\n';
      y.slice(0, 10).forEach((x, i) => {
        m += (i + 1) + '. ' + (x.m || '').slice(0, 140) +
          (x.m && x.m.length > 140 ? '…' : '') +
          ' [Ders: ' + (x.d || '?') + (x.k ? ' · ' + x.k : '') +
          ' | Benim cevabım: ' + (x.s || '—') + (x.c ? ' · Doğru: ' + x.c : '') + ']\n';
      });
    } else {
      m += '\nHâlihazırda kayıtlı yanlışım yok, şu an bildiklerime dayanarak genel bir değerlendirme yap.\n';
    }
    if (z.length) {
      m += '\nZayıf konularım: ' + z.slice(0, 5).map(k => k.ders + ' / ' + (k.konu || 'Genel')).join('; ') + '\n';
    }
    m += '\nLütfen bana: 1) Hangi konularda zayıf olduğumu, 2) Bu yanlışların ortak temelini, 3) 3 günlük somut bir çalışma planı ver.';
    return m;
  }
  function kocHizli() {
    const z = zayifListe();
    const h = [
      ['❌ Yanlışları Değerlendir', null],
      ['📋 Plan yap','Bugün için çalışma planı yap'],
      ['🎯 Motivasyon','Moralim bozuk'],
      ['📖 Konu anlat', (z[0]? z[0].ders+' '+z[0].konu : 'türev')+' konusunu anlat'],
      ['🎥 Video bul', (z[0]? z[0].konu : 'türev')+' için video öner']
    ];
    $('#kocHizli').innerHTML = h.map(x => `<button class="kh">${x[0]}</button>`).join('');
    $$('#kocHizli .kh').forEach((b,i) => {
      b.onclick = () => kocSor(h[i][1] == null ? yanlisAnalizMesaji() : h[i][1]);
    });
  }

  /* ═════════ DOSYA EKLEME ═════════ */
  const kaydirAc = () => { $('#kaydir').hidden = false; };
  $('#kdSec').onclick = () => $('#pdfDosya').click();
  $('#kdIptal').onclick = () => { $('#kaydir').hidden = true; };
  const kd = $('#kaydir');
  kd.onclick = e => { if (e.target.id === 'kaydir') kd.hidden = true; };
  kd.ondragover = e => { e.preventDefault(); kd.classList.add('uzerinde'); };
  kd.ondragleave = () => kd.classList.remove('uzerinde');
  kd.ondrop = e => {
    e.preventDefault(); kd.classList.remove('uzerinde');
    kd.hidden = true;
    if (e.dataTransfer.files.length) ekle(Array.from(e.dataTransfer.files));
  };
  $('#pdfDosya').onchange = function () {
    kd.hidden = true;
    if (this.files.length) ekle(Array.from(this.files));
    this.value = '';
  };

  /* ═════════ SÜRE ═════════ */
  const SURE = { sn:0, kosu:false, tim:null };
  const bicim = s => { s=Math.max(0,s|0); const p=n=>String(n).padStart(2,'0');
    return p((s/60)|0)+':'+p(s%60); };
  $('#sSure').onclick = function () {
    if (SURE.kosu) {
      clearInterval(SURE.tim); SURE.kosu = false;
      $('#ustSure').classList.remove('calisiyor'); this.textContent = '▶';
    } else {
      SURE.tim = setInterval(() => {
        SURE.sn++; $('#sSureYazi').textContent = bicim(SURE.sn);
        if (SURE.sn % 60 === 0) { V.ist.dakika++; kaydet(); istCiz(); }
      }, 1000);
      SURE.kosu = true; $('#ustSure').classList.add('calisiyor'); this.textContent = '⏸';
    }
  };
  $('#sSureSifirla').onclick = () => { SURE.sn = 0; $('#sSureYazi').textContent = bicim(0); };

  /* ═════════ SAAT / ZAMANLAYICI / KRONOMETRE ═════════ */
  const SAAT = {
    mod: 'saat',
    zaman: { hedef: 25, kalan: 25 * 60, kosu: false, son: 0 },
    kron: { sn: 0, kosu: false, tim: null, son: 0 }
  };
  const SAAT_GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const SAAT_AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const saatS = d => String(d).padStart(2, '0');
  function bip() {
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = 'sine';
      const t = c.currentTime;
      [[880, 0, .14], [1100, .2, .14], [880, .4, .28]].forEach(([f, x, d]) => {
        g.gain.setValueAtTime(.0001, t + x);
        g.gain.exponentialRampToValueAtTime(.28, t + x + .02);
        g.gain.exponentialRampToValueAtTime(.0001, t + x + d);
        o.frequency.setValueAtTime(f, t + x);
      });
      o.start(t); o.stop(t + .75);
      if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
    } catch (e) {}
  }
  function saatFabGuncelle() {
    const y = $('#saatFabYazi'); if (!y) return;
    if (SAAT.kron.kosu) y.textContent = bicim(SAAT.kron.sn);
    else if (SAAT.zaman.kosu) y.textContent = bicim(SAAT.zaman.kalan);
    else {
      const d = new Date();
      y.textContent = saatS(d.getHours()) + ':' + saatS(d.getMinutes());
    }
    $('#saatFab').classList.toggle('calisiyor', SAAT.kron.kosu || SAAT.zaman.kosu);
  }
  function saatZamanYaz() {
    if (SAAT.mod === 'saat') {
      const s = $('#saatCanli');
      if (s) {
        const d = new Date();
        s.textContent = saatS(d.getHours()) + ':' + saatS(d.getMinutes()) + ':' + saatS(d.getSeconds());
      }
    } else if (SAAT.mod === 'zaman') {
      const e = $('#saatBuyuk');
      if (e) e.textContent = bicim(SAAT.zaman.kalan);
    } else {
      const k = $('#kronUst');
      if (k) k.textContent = bicim(SAAT.kron.sn);
    }
  }
  function kronToggle() {
    const k = SAAT.kron;
    if (k.kosu) {
      clearInterval(k.tim); k.kosu = false; k.son = 0;
    } else {
      k.kosu = true; k.son = Date.now();
      k.tim = setInterval(() => {
        const simdi = Date.now();
        const fark = Math.round((simdi - k.son) / 1000);
        if (fark > 0) {
          const yukari = Math.floor((k.sn - fark) / 60);
          k.sn += fark; k.son = simdi;
          const yeni = Math.floor(k.sn / 60);
          if (yeni > yukari) {
            V.ist.dakika = (V.ist.dakika || 0) + (yeni - yukari);
            kaydet(); istCiz();
          }
        }
        saatZamanYaz(); saatFabGuncelle();
      }, 1000);
    }
    saatCiz();
  }
  function zamanToggle() {
    const z = SAAT.zaman;
    if (z.kosu) {
      clearInterval(z.tim); z.kosu = false; z.son = 0;
    } else {
      if (z.kalan <= 0) z.kalan = z.hedef * 60;
      z.kosu = true; z.son = Date.now();
      z.tim = setInterval(() => {
        const simdi = Date.now();
        const fark = Math.round((simdi - z.son) / 1000);
        if (fark > 0) { z.kalan -= fark; z.son = simdi; }
        if (z.kalan <= 0) {
          clearInterval(z.tim); z.kosu = false; z.son = 0;
          bip();
          bildir('⏰ Zamanlayıcı bitti!', 'basari');
          z.kalan = z.hedef * 60;
        }
        saatZamanYaz(); saatFabGuncelle();
      }, 1000);
    }
    saatCiz();
  }
  function saatCiz() {
    const g = $('#saatGovde'); if (!g) return;
    $$('.saat-tab').forEach(b => b.classList.toggle('aktif', b.dataset.sm === SAAT.mod));
    if (SAAT.mod === 'saat') {
      const d = new Date();
      const tarih = d.getDate() + ' ' + SAAT_AYLAR[d.getMonth()] + ' ' + d.getFullYear() + ', ' + SAAT_GUNLER[d.getDay()];
      g.innerHTML = `<div class="saat-buyuk" id="saatCanli">${saatS(d.getHours())}:${saatS(d.getMinutes())}:${saatS(d.getSeconds())}</div>
        <div class="saat-alt-yazi">${tarih}</div>
        <div class="saat-alt-yazi" style="margin-top:10px">📚 Bugün toplam çalışma: <b>${V.ist.dakika || 0} dk</b></div>`;
    } else if (SAAT.mod === 'zaman') {
      const z = SAAT.zaman;
      g.innerHTML = `<div class="saat-buyuk" id="saatBuyuk">${bicim(z.kalan)}</div>
        <div class="saat-alt-yazi">${z.kosu ? 'Sayaç çalışıyor…' : ('Süre: ' + z.hedef + ' dk — kendin belirle')}</div>
        <div style="text-align:center"><input class="saat-girdi" id="saatDk" type="number" min="1" max="240"
          value="${z.kosu ? '' : z.hedef}" placeholder="dk" ${z.kosu ? 'disabled' : ''}></div>
        <div class="saat-eylem">
          <button class="u-btn ana" id="saatZBas">${z.kosu ? '⏸ Duraklat' : '▶ Başlat'}</button>
          <button class="u-btn" id="saatZSifir">↺</button>
        </div>`;
      $('#saatDk').onchange = function () {
        let m = parseInt(this.value, 10);
        if (!m || m < 1) return;
        m = Math.min(240, m);
        z.hedef = m; z.kalan = m * 60;
        clearInterval(z.tim); z.kosu = false; z.son = 0;
        saatCiz(); saatFabGuncelle();
      };
      $('#saatZBas').onclick = () => zamanToggle();
      $('#saatZSifir').onclick = () => {
        clearInterval(z.tim); z.kosu = false; z.son = 0;
        z.kalan = z.hedef * 60;
        saatCiz(); saatFabGuncelle();
      };
    } else {
      const k = SAAT.kron;
      g.innerHTML = `<div class="saat-buyuk" id="kronUst">${bicim(k.sn)}</div>
        <div class="saat-alt-yazi">${k.kosu ? 'Çalışıyor… her tam dakika istatistiklere eklenir' : 'Çalıştığın süreyi ölç — her dk istatistiklere eklenir'}</div>
        <div class="saat-eylem">
          <button class="u-btn ana" id="saatKBas">${k.kosu ? '⏸ Duraklat' : (k.sn ? '▶ Devam' : '▶ Başlat')}</button>
          <button class="u-btn" id="saatKSifir">↺</button>
        </div>
        <div class="saat-alt-yazi" style="margin-top:12px">📚 Bugün çalışma: <b>${V.ist.dakika || 0} dk</b></div>`;
      $('#saatKBas').onclick = () => kronToggle();
      $('#saatKSifir').onclick = () => {
        clearInterval(k.tim); k.kosu = false; k.son = 0; k.sn = 0;
        saatCiz(); saatFabGuncelle();
      };
    }
  }
  $('#saatFab').onclick = () => {
    const p = $('#saatPl');
    p.hidden = !p.hidden;
    if (!p.hidden) saatCiz();
  };
  $('#saatKapat').onclick = () => { $('#saatPl').hidden = true; };
  $$('.saat-tab').forEach(b => b.onclick = () => { SAAT.mod = b.dataset.sm; saatCiz(); });
  setInterval(() => { saatFabGuncelle(); saatZamanYaz(); }, 1000);
  saatFabGuncelle();

  /* ═════════ AYARLAR ═════════ */
  function ayarAc() {
    $('#aUrl').value = V.ayar.aiUrl;
    $('#aModel').value = V.ayar.aiModel;
    $('#aKey').value = V.ayar.aiAnahtar;
    $('#aNot').value = V.not || '';
      $('#ayarPanel').hidden = false;
      kotaYaz();
    }
  $('#yAyar').onclick = ayarAc;
  $('#ayarKapat').onclick = () => { $('#ayarPanel').hidden = true; };
  $('#ayarPanel').onclick = e => { if (e.target.id === 'ayarPanel') $('#ayarPanel').hidden = true; };
    $('#aKaydet').onclick = async () => {
      const btn = this;
      const v = aiAnahtarTemizle($('#aKey').value);
      let url = $('#aUrl').value.trim();
      let model = $('#aModel').value.trim();
      if (v) {
        const p = aiSaglayici(v);
        if (!p.url) { bildir(p.neden, 'hata'); return; }
        if (!url) url = p.url;
        if (!model) model = p.model;
        V.ayar.aiSaglayici = p.ad;
      }
      V.ayar.aiUrl = url;
      V.ayar.aiModel = model;
      V.ayar.aiAnahtar = v;
      V.not = $('#aNot').value;
      kaydet();
      if (v && url) {
        btn.disabled = true; btn.textContent = 'Test ediliyor…';
        const s = await aiTest(v, { url, model, ad:'Servis' });
        btn.disabled = false; btn.textContent = '💾 Kaydet';
        if (s.hata) { bildir('Kaydedildi ama bağlantı başarısız: ' + s.hata, 'uyari'); $('#ayarPanel').hidden = false; return; }
      }
      bildir('Kaydedildi ✓', 'basari');
      $('#ayarPanel').hidden = true;
    };

  $('#aNot').oninput = function () { V.not = this.value; kaydet(); };
  $('#aYedek').onclick = async () => {
    const b = $('#aYedekBtn');
    if (b) { b.disabled = true; b.textContent = 'Hazırlanıyor…'; }
    bildir('Yedek hazırlanıyor, biraz sürebilir…');
    try {
      const kopya = { ...V, dosya: [] };
      for (const d of V.dosya) {
        const o = { ...d };
        delete o.veri; delete o.resim;
        const k = await ikiliOku(d.id);
        if (k) { o.veriB64 = bufB64(k.veri); o.resimB64 = k.resim || null; }
        kopya.dosya.push(o);
      }
      const y = new Blob([JSON.stringify(kopya)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(y);
      a.download = 'derspark-yedek-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      bildir('Yedek indirildi (' + (y.size/1048576).toFixed(1) + ' MB)', 'basari');
    } catch (e) { bildir('Yedek alınamadı: ' + e.message, 'hata'); }
    if (b) { b.disabled = false; b.textContent = 'Yedek Al (tüm dosyalar)'; }
  };
  $('#aYukle').onclick = () => $('#aDosya').click();
  $('#aDosya').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const o = new FileReader();
    o.onload = async ev => {
      try {
        const g = JSON.parse(ev.target.result);
        const kopya = { ...g };
        kopya.dosya = [];
        for (const d of (g.dosya || [])) {
          const y = { ...d };
          const vb = y.veriB64, rb = y.resimB64;
          delete y.veriB64; delete y.resimB64; delete y.veri; delete y.resim;
          if (vb) y.sorular = y.sorular || [];
          kopya.dosya.push(y);
          if (vb || rb) {
            await ikiliYaz(y.id, { veri: b64Buf(vb), resim: rb || null, sorular: y.sorular || [] });
          }
        }
        V = Object.assign(V, kopya);
        V.dosya.forEach((x, i) => x.no = i + 1);
        kaydet(); sorularKaydet();
        bildir('Yüklendi: ' + V.dosya.length + ' dosya', 'basari');
        ekran('panel');
      } catch (x) { bildir('Geçersiz yedek dosyası', 'hata'); }
    };
    o.readAsText(f);
    e.target.value = '';
  };
  $('#aSil').onclick = async () => {
    if (!confirm('Her şey silinsin mi? (PDF, soru, istatistik)')) return;
    if (!confirm('Bu işlem geri alınamaz. Emin misin?')) return;
    localStorage.removeItem(LS);
    try { await DB.bosalt(); } catch (x) {}
    location.reload();
  };

  /* ═════════ TEMA ═════════ */
  function tema(k) {
    document.body.classList.toggle('light', !k);
    try { localStorage.setItem('op_tema', k?'dark':'light'); } catch (e) {}
    $('#yTema').innerHTML = '<span>' + (k ? '☀️' : '🌙') + '</span> Tema';
  }
  $('#yTema').onclick = () => tema(document.body.classList.contains('light'));

  /* ═════════ İSTATİSTİK ═════════ */
  function istCiz() {
    const b = V.ist.bugun || 0;
    $('#yiBugun').textContent = b;
    $('#yiDogru').textContent = V.ist.dogru;
    $('#yiYanlis').textContent = V.ist.yanlis;
    $('#yiCubuk').style.width = Math.min(100, b/20*100) + '%';
    $('#yiNot').textContent = b >= 20 ? '🎉 Hedef tamam!' : 'Hedef: 20 soru';
    $('#uSeri').textContent = '🔥 ' + (V.ist.seri||0);
  }

  /* ═════════ EKRANLAR ═════════ */
  const AD = { panel:['Panel','Bugünkü çalışman'], kutup:['Kitaplık','Dosyaların ve soruların'],
               masa:['Masam','Kitaplarını yan yana gör'], coz:['Soru Çöz','Seç, çöz, puanını gör'],
               koc:['Koç','Yardım ve konu anlatımı'] };
  function ekran(s) {
    $$('.y-item').forEach(b => b.classList.toggle('aktif', b.dataset.s === s));
    const t = AD[s] || AD.panel;
    $('#ustBas').textContent = t[0];
    $('#ustAlt').textContent = t[1];
    if (s === 'panel') sayfaPanel();
    else if (s === 'kutup') sayfaKutup();
    else if (s === 'masa') sayfaMasa();
    else if (s === 'coz') sayfaCoz();
    else if (s === 'koc') kocAc();
    baglaDosyalar();
    window.scrollTo(0,0);
  }
  $$('.y-item').forEach(b => b.onclick = () => ekran(b.dataset.s));

  /* ═════════ BAŞLAT ═════════ */
  async function baslat() {
    await yukle();
    pomoYukle();
    kotaIzin(); kotaYaz();
    /* eski kayıtta yanlış servis adresi kalmışsa düzelt (401 sebebi) */
    if (V.ayar.aiAnahtar) {
      const p = aiSaglayici(aiAnahtarTemizle(V.ayar.aiAnahtar));
      if (p.url && V.ayar.aiUrl !== p.url) {
        V.ayar.aiUrl = p.url; V.ayar.aiModel = p.model;
        V.ayar.aiSaglayici = p.ad;
        kaydet();
      }
      V.ayar.aiAnahtar = aiAnahtarTemizle(V.ayar.aiAnahtar);
    }
    let k = true;
    try { if (localStorage.getItem('op_tema') === 'light') k = false; } catch (e) {}
    tema(k);

    /* MENU: tamamen gizlenir */
    let menuKapali = false;
    try { menuKapali = localStorage.getItem('dp_menu') === '1'; } catch (e) {}
    function menuUygula() {
      document.body.classList.add('men');
      document.body.classList.toggle('gizli', menuKapali);
      var yan = $('#yan');
      if (!yan) return;
      if (window.innerWidth <= 900) yan.classList.add('gorunur');
      else yan.classList.remove('gorunur');
      var um = $('#ustMenu');
      if (um) {
        um.classList.toggle('aktif', !menuKapali);
        um.innerHTML = menuKapali ? '&#9776;' : '&#10005;';
        um.title = menuKapali ? 'Menüyü aç' : 'Menüyü kapat';
      }
    }
    function menuDegistir() {
      menuKapali = !menuKapali;
      try { localStorage.setItem('dp_menu', menuKapali ? '1' : '0'); } catch (e) {}
      var yan = $('#yan');
      if (window.innerWidth <= 900) { if (yan) yan.classList.toggle('gorunur', !menuKapali); }
      else menuUygula();
    }
    menuUygula();
    window.addEventListener('resize', menuUygula);
    $('#ustMenu').onclick = menuDegistir;
    $('#yanKapat').onclick = menuDegistir;

    if (aiHazir()) $('#kocDurum').textContent = 'Bağlı ✓';

    istCiz(); kocHizli(); ekran('panel');
      setInterval(kocOzet, 20000);

      /* ═════════ KLAVYE KISAYOLLARI ═════════ */
      document.addEventListener('keydown', e => {
        if (/input|textarea|select/i.test(e.target.tagName)) return;
        const m = $('#masa');
        const masaAcik = m && !m.closest('.ekran').hidden;
        if (e.ctrlKey || e.metaKey) {
          const k = e.key.toLowerCase();
          if ((k === '+' || k === '=') && masaAcik) { e.preventDefault(); yakin(1); }
          else if ((k === '-' || k === '_') && masaAcik) { e.preventDefault(); yakin(-1); }
          else if (k === '0' && masaAcik) { e.preventDefault(); masaSifirla(); }
          return;
        }
        if (!masaAcik) return;
        if (e.key === '0') masaSifirla();
        else if (e.key === '+' || e.key === '=') yakin(1);
        else if (e.key === '-') yakin(-1);
      });
    }

  return { baslat, ekran };
})();

document.addEventListener('DOMContentLoaded', MASA.baslat);
