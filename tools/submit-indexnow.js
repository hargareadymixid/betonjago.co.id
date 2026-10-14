#!/usr/bin/env node
/**
 * tools/submit-indexnow.js
 *
 * Mengirim URL yang BENAR-BENAR baru/berubah ke IndexNow (Bing, Yandex, Seznam, Naver) SETELAH
 * situs live. Dipanggil dari .github/workflows/deploy.yml, jadi semua jalur (generate, revise,
 * fix-orphans, recycle, dedupe, push manual) tercakup — bukan hanya recycle-posts.js.
 *
 * Kenapa begini (masalah di versi lama):
 *   1. Hanya recycle-posts.js yang memanggil IndexNow, dan itu cuma untuk artikel berumur >= 12
 *      bulan. Artikel BARU dari generate-articles.js, hasil revisi, dan hasil fix-orphans tidak
 *      pernah dikirim.
 *   2. Pengiriman terjadi di job recycle, SEBELUM deploy. Mesin pencari memvalidasi dengan
 *      mengambil file kunci /<key>.txt dan halamannya dari situs live — saat itu belum ada,
 *      jadi 403/422/404.
 *
 * Alur (3 perintah):
 *   ensure-key : pastikan static/<key>.txt ada SEBELUM hugo build (kunci stabil dari
 *                .indexnow-key.json; dibuat ulang bila belum ada).
 *   snapshot   : simpan sitemap.xml yang SEDANG live (sebelum deploy) ke .sitemap-before.xml.
 *   submit     : bandingkan dengan public/sitemap.xml hasil build → URL baru / lastmod berubah.
 *                Tunggu sampai sitemap live sama dengan build baru, lalu kirim ke IndexNow.
 *
 * Opsi/env: --dry-run | SITE_URL | INDEXNOW_MAX_URLS (200) | INDEXNOW_WAIT_MIN (10)
 * Google TIDAK ikut IndexNow; sinyalnya adalah sitemap.xml + <lastmod> yang akurat.
 */
const fs     = require('fs');
const path   = require('path');
const http   = require('http');
const https  = require('https');
const crypto = require('crypto');
const { submitToIndexNow, ensureIndexNowKey } = require('./lib/index-ping.js');

const ROOT        = path.join(__dirname, '..');
const SITE_URL    = (process.env.SITE_URL || 'https://betonjago.co.id/').replace(/\/?$/, '/');
const NEW_SITEMAP = path.join(ROOT, 'public', 'sitemap.xml');
const OLD_SITEMAP = path.join(ROOT, '.sitemap-before.xml');
const MAX_URLS    = parseInt(process.env.INDEXNOW_MAX_URLS || '200', 10);
const WAIT_MS     = parseFloat(process.env.INDEXNOW_WAIT_MIN || '10') * 60000;
const POLL_MS     = parseInt(process.env.INDEXNOW_POLL_MS || '20000', 10);
const DRY_RUN     = process.argv.includes('--dry-run');

function fetchText(url, timeoutMs = 20000) {
  return new Promise(resolve => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'betonjago-indexnow/1.0', 'Cache-Control': 'no-cache' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', err => resolve({ status: 0, body: '', error: err.message }));
  });
}

const bust = url => `${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`;
const sha  = s => crypto.createHash('sha256').update(s).digest('hex');
const decode = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Hasil: Map<loc, lastmod|''>
function parseSitemap(xml) {
  const map = new Map();
  const re = /<url>([\s\S]*?)<\/url>/g;
  let m;
  while ((m = re.exec(xml))) {
    const loc = (m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/) || [])[1];
    const lm  = (m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/) || [])[1] || '';
    if (loc) map.set(decode(loc), lm);
  }
  return map;
}

// URL baru lebih dulu, lalu yang lastmod-nya berubah; halaman arsip (/categories/, /tags/) di urutan akhir.
function diffSitemaps(before, after, host) {
  // Halaman arsip = /categories/, /categories/pompa/, /tags/x/ (artikel kota di /categories/pompa/slug/ BUKAN arsip).
  const isListing = u => { try { return /^\/(categories|tags)(\/[^/]+)?\/?$/.test(new URL(u).pathname); } catch { return false; } };
  const fresh = [], changed = [];
  for (const [loc, lm] of after) {
    let h; try { h = new URL(loc).host; } catch { continue; }
    if (h !== host) continue;
    if (!before.has(loc)) fresh.push(loc);
    else if (before.get(loc) !== lm) changed.push(loc);
  }
  const rank = list => [...list.filter(u => !isListing(u)), ...list.filter(isListing)];
  return { fresh, changed, ordered: [...rank(fresh), ...rank(changed)] };
}

async function waitUntilLive(localXml) {
  const want = sha(localXml);
  const t0 = Date.now();
  let tries = 0;
  while (Date.now() - t0 < WAIT_MS) {
    tries++;
    const r = await fetchText(bust(`${SITE_URL}sitemap.xml`));
    if (r.status === 200 && sha(r.body) === want) {
      console.log(`   ✅ Situs live dengan build terbaru (cek ke-${tries}, ${Math.round((Date.now() - t0) / 1000)} dtk).`);
      return true;
    }
    console.log(`   ⏳ Belum live (HTTP ${r.status || r.error}) — tunggu ${POLL_MS / 1000} dtk...`);
    await new Promise(r2 => setTimeout(r2, POLL_MS));
  }
  return false;
}

async function cmdSnapshot() {
  const r = await fetchText(bust(`${SITE_URL}sitemap.xml`));
  if (r.status === 200 && /<urlset/.test(r.body)) {
    fs.writeFileSync(OLD_SITEMAP, r.body);
    console.log(`📸 Snapshot sitemap live disimpan (${parseSitemap(r.body).size} URL).`);
  } else {
    if (fs.existsSync(OLD_SITEMAP)) fs.unlinkSync(OLD_SITEMAP);
    console.log(`⚠️  Sitemap live tidak bisa diambil (HTTP ${r.status || r.error}) — kemungkinan deploy pertama. Pengiriman IndexNow dilewati agar tidak mengirim seluruh situs.`);
  }
}

async function cmdSubmit() {
  if (!fs.existsSync(NEW_SITEMAP)) { console.log('⚠️  public/sitemap.xml tidak ada — lewati.'); return; }
  if (!fs.existsSync(OLD_SITEMAP)) { console.log('ℹ️  Tidak ada snapshot sitemap sebelumnya — lewati (bukan error).'); return; }

  const newXml = fs.readFileSync(NEW_SITEMAP, 'utf8');
  const { fresh, changed, ordered } = diffSitemaps(parseSitemap(fs.readFileSync(OLD_SITEMAP, 'utf8')), parseSitemap(newXml), new URL(SITE_URL).host);
  console.log(`🔎 ${fresh.length} URL baru, ${changed.length} URL berubah (lastmod).`);
  if (!ordered.length) { console.log('ℹ️  Tidak ada yang perlu dikirim.'); return; }

  let urls = ordered;
  if (urls.length > MAX_URLS) { console.log(`   ✂️  Dibatasi ${MAX_URLS} URL (dari ${urls.length}).`); urls = urls.slice(0, MAX_URLS); }

  if (DRY_RUN) { console.log('🧪 DRY-RUN — tidak mengirim. Contoh:\n   ' + urls.slice(0, 10).join('\n   ')); return; }

  const live = await waitUntilLive(newXml);
  if (!live) console.log('   ⚠️  Batas tunggu habis, situs belum terbukti live — tetap dikirim (IndexNow menjadwalkan crawl ulang).');

  const key = ensureIndexNowKey();
  const kr = await fetchText(bust(`${SITE_URL}${key}.txt`));
  if (kr.status !== 200 || kr.body.trim() !== key) {
    console.log(`   ⚠️  File kunci ${SITE_URL}${key}.txt belum benar (HTTP ${kr.status}) — pengiriman kemungkinan ditolak (403/422).`);
  }
  const res = await submitToIndexNow(SITE_URL, urls);
  if (res.ok === false) process.exitCode = 1; // terlihat merah di Actions, tapi step ini continue-on-error
}

(async () => {
  const cmd = process.argv[2];
  if (cmd === 'ensure-key') { const k = ensureIndexNowKey(); console.log(`🔑 IndexNow key: ${k}`); }
  else if (cmd === 'snapshot') await cmdSnapshot();
  else if (cmd === 'submit')   await cmdSubmit();
  else { console.log('Pemakaian: node tools/submit-indexnow.js <ensure-key|snapshot|submit> [--dry-run]'); process.exit(2); }
})().catch(err => { console.error('💥', err.message); process.exit(1); });

module.exports = { parseSitemap, diffSitemaps, waitUntilLive };
