const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDir = path.join(__dirname, '..', 'content');
const now = new Date();

// Artikel bisa langsung di content/ (flat) maupun di sub-folder (content/blog/, dst).
// Walk rekursif supaya keduanya ketemu.
function walkMarkdownFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== '_index.md') {
      results.push(fullPath);
    }
  }
  return results;
}

// Matches this project's existing URL convention (same formula used in dedup-lapis1.js and
// tools/lib/related-articles.js): section-nested, e.g. content/kayu/slug.md → /kayu/slug/.
function toUrl(filePath) {
  return '/' + path.relative(contentDir, filePath).replace(/\\/g, '/').replace(/\.md$/, '') + '/';
}

// Surgically insert/update a `lastmod:` field within the RAW frontmatter text (the string
// between the --- delimiters, as returned by gray-matter's .matter property) — never a full
// YAML re-serialize, which would reformat quote styles/key order/array layout on every field
// and cause noisy, unrelated-looking git diffs. `date:` (original publish date) is left
// untouched; `lastmod:` is Hugo's standard "last modified" field, used for sitemap <lastmod>
// and freshness signals without misrepresenting the true original publish date.
// (Same implementation as revise-articles.js's setLastmod() — kept in sync intentionally.)
function setLastmod(rawMatter, newDate) {
  const line = `lastmod: "${newDate}"`;
  if (/^lastmod:\s*.*$/m.test(rawMatter)) {
    return rawMatter.replace(/^lastmod:\s*.*$/m, line);
  }
  if (/^date:\s*.*$/m.test(rawMatter)) {
    return rawMatter.replace(/^(date:\s*.*)$/m, `$1\n${line}`);
  }
  return `${rawMatter}\n${line}`;
}

function recyclePost(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(fileContent);
  const { data, content } = parsed;

  if (data.draft === true) return false; // never bump the date on unpublished drafts
  if (['landing', 'landing-simple', 'profile'].includes(data.type) || ['landing', 'landing-simple', 'profile'].includes(data.layout)) return false; // bukan artikel

  const postDate = new Date(data.date);
  if (isNaN(postDate.getTime())) return false; // missing/unparseable date — skip, don't crash

  const monthsDiff = (now.getFullYear() - postDate.getFullYear()) * 12 + now.getMonth() - postDate.getMonth();

  if (monthsDiff >= 12) {
    const newDate = now.toISOString().split('T')[0];
    // NOTE: this used to overwrite `date:` directly, which destroyed the true original
    // publish date and made every recycled article look freshly-published despite no
    // content actually changing — Google explicitly discourages that pattern. Now it adds/
    // updates `lastmod:` instead (identical mechanism to revise-articles.js's
    // setLastmod()), which preserves `date` and signals "last touched" honestly.
    const newRawMatter = setLastmod(parsed.matter, newDate);
    const updatedContent = `---${newRawMatter}\n---\n${content}`;
    fs.writeFileSync(filePath, updatedContent);
    return true;
  }

  return false;
}

const markdownFiles = walkMarkdownFiles(contentDir);
console.log(`📁 ${markdownFiles.length} file .md ditemukan di ${contentDir} (rekursif, semua sub-folder).`);

let updatedCount = 0;
const updatedFilePaths = [];
for (const filePath of markdownFiles) {
  if (recyclePost(filePath)) {
    updatedCount++;
    updatedFilePaths.push(filePath);
  }
}

// Pengiriman IndexNow TIDAK dilakukan di sini lagi: situs belum live pada saat job recycle
// berjalan (deploy baru dipicu sesudah commit), sehingga mesin pencari tidak bisa memvalidasi
// file kunci/halamannya. deploy.yml sekarang mengirim URL baru/berubah SETELAH situs live
// (lihat tools/submit-indexnow.js). Build Hugo juga tidak perlu di sini — deploy yang membangun.
if (updatedCount > 0) {
  console.log(`${updatedCount} article(s) lastmod updated:`);
  updatedFilePaths.forEach(fp => console.log(`   • ${toUrl(fp)}`));
} else {
  console.log('There are no articles that need to be updated.');
}