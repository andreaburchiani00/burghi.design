#!/usr/bin/env node
/* Auto-inserimento snippet in index.html — LOCALE, mai pubblicato (cfr. .vercelignore).
 *
 * Uso (dalla root del repo):
 *   node project-builder/apply.mjs project-builder/exports/<slug>.json [--force] [--dry-run] [--only-index]
 *
 * Fa, senza copia-incolla:
 *   1. rigenera pagina + 3 snippet dalla spec .json (stessi template di builder.js — tenere in sync)
 *   2. scrive projects/<slug>.html (salta con --only-index)
 *   3. inserisce card / overlay / riga index sopra gli ancoraggi NEW-PROJECT-* in index.html
 *
 * Idempotenza: se `overlay-<slug>` (o `projects/<slug>.html`) è già in index.html, abortisce.
 * Con --force rimuove i blocchi precedenti di quello slug e reinserisce.
 * Con --dry-run stampa solo cosa farebbe, senza scrivere.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(scriptDir);
const INDEX_PATH = resolve(root, 'index.html');
const PROJECTS_DIR = resolve(root, 'projects');

/* ---------- template: mirror di project-builder/builder.js — tenere in sync ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function cleanPath(p) {
  return String(p || '').trim().replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/^\//, '');
}
function guessType(src) { return /\.mp4(\?|#|$)/i.test(src) ? 'video' : 'image'; }

function mediaPageTag(m, title) {
  const src = '../' + cleanPath(m.src);
  if ((m.type || guessType(m.src)) === 'video') {
    return '<video class="slideshow-slide" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>';
  }
  const alt = esc(m.alt || title || 'project image');
  return '<img class="slideshow-slide" src="' + esc(src) + '" alt="' + alt + '" loading="lazy">';
}
function mediaCardTag(m) {
  const src = './' + cleanPath(m.src);
  if ((m.type || guessType(m.src)) === 'video') {
    return '<video class="slideshow-slide" playsinline data-autoplay loop muted><source src="' + esc(src) + '" type="video/mp4"></video>';
  }
  return '<img class="slideshow-slide" src="' + esc(src) + '" alt="' + esc(m.alt || '') + '" loading="lazy">';
}
function slideshowPage(items, aspect, autoplay, title) {
  const cls = aspect ? 'slideshow ' + aspect : 'slideshow';
  return '<div class="' + cls + '" data-autoplay="' + autoplay + '" data-pause-hover><div class="slideshow-slides">' +
    items.map((m) => mediaPageTag(m, title)).join('') + '</div></div>';
}
function para(text) { return esc(text).replace(/\n/g, '<br />'); }

function skillsHtml(skills) {
  return skills.map((s) => '<img class="icon-svg" src="../assets/icons/info.svg" alt=""> ' + esc(s)).join('<br />\n');
}
function blockPageHtml(b, m) {
  const title = m.title;
  if (b.type === 'full') {
    if (!b.media[0].src.trim()) return '';
    const bm = b.media[0]; const src = '../' + cleanPath(bm.src);
    const tag = (bm.type || guessType(bm.src)) === 'video'
      ? '<video class="w-full" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
      : '<img class="w-full" src="' + esc(src) + '" alt="' + esc(bm.alt || title) + '" loading="lazy">';
    return '<div class="columns gap-4 mb-4"><div class="col col-span-12">' + tag + '</div></div>';
  }
  if (b.type === 'duo') {
    const cells = b.media.filter((x) => x.src.trim()).map((x) => {
      const src = '../' + cleanPath(x.src);
      const tag = (x.type || guessType(x.src)) === 'video'
        ? '<video playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
        : '<img src="' + esc(src) + '" alt="' + esc(x.alt || title) + '" loading="lazy">';
      return '<div class="col col-span-6">' + tag + '</div>';
    }).join('');
    return cells ? '<div class="columns gap-4 mb-4">' + cells + '</div>' : '';
  }
  if (b.type === 'textmedia') {
    if (!b.media[0].src.trim() && !b.left.trim()) return '';
    const bm = b.media[0]; const src = '../' + cleanPath(bm.src);
    const tag = bm.src.trim() ? ((bm.type || guessType(bm.src)) === 'video'
      ? '<video class="w-full" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
      : '<img class="w-full" src="' + esc(src) + '" alt="' + esc(bm.alt || title) + '" loading="lazy">') : '';
    return '<div class="columns gap-4 mb-4"><div class="col col-span-2"><span class="Index">' + para(b.left) + '</span></div>' +
      '<div class="col col-span-10">' + tag + '</div></div>';
  }
  if (b.type === 'textfull') {
    if (!b.text.trim()) return '';
    return '<div class="columns gap-4 mt-8 mb-4"><div class="col col-span-12"><span class="Index">' + para(b.text) + '</span></div></div>';
  }
  if (b.type === 'videoflat') {
    if (!b.media[0].src.trim()) return '';
    const src = '../' + cleanPath(b.media[0].src);
    return '<div class="columns gap-4 mb-4"><div class="col col-span-2"><span class="Index">' + para(b.left || 'Flatplan') + '<br /></span></div>' +
      '<div class="col col-span-10"><div class="w-full aspect-[17/10] overflow-hidden">' +
      '<video class="w-full h-full object-cover" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4" /></video>' +
      '</div></div></div>';
  }
  if (b.type === 'flipbook') {
    const frames = (b.media || []).filter((x) => x.src.trim());
    if (!frames.length) return '';
    const imgs = frames.map((x) => '<img src="../' + esc(cleanPath(x.src)) + '" alt="' + esc(x.alt || title) + '" loading="lazy">').join('');
    return '<div class="columns gap-4 mb-4"><div class="col col-span-2"></div><div class="col col-span-10">' +
      '<div class="slideshow slideshow-flipbook frame-1710" data-autoplay="0.5" data-scrub><div class="slideshow-slides">' + imgs + '</div></div>' +
      '</div></div>';
  }
  if (b.type === 'credits3') {
    if (!b.media[0].src.trim() && !b.text.trim() && !(b.right || '').trim()) return '';
    const bm = b.media[0]; const src = '../' + cleanPath(bm.src);
    const left = bm.src.trim()
      ? '<img class="w-full aspect-[3/4] object-cover" src="' + esc(src) + '" alt="' + esc(bm.alt || title) + '" loading="lazy">'
      : '';
    return '<div class="columns gap-4 mb-4" style="align-items: start"><div class="col col-span-3">' + left + '</div>' +
      '<div class="col col-span-6"><span class="Index">' + para(b.text) + '</span></div>' +
      '<div class="col col-span-3" style="align-self: end"><div class="text-right"><span class="corpo">' + esc(b.right || '') + '</span></div></div></div>';
  }
  return '';
}

function pageHtml(m, blocks) {
  const ogImg = m.hero.find((x) => (x.type || guessType(x.src)) === 'image');
  const ogAbs = ogImg ? 'https://burghi.design/' + cleanPath(ogImg.src) : 'https://burghi.design/assets/media/bookshelf/Screenshot-2024-11-26-alle-17.14.08.png';
  const desc = (m.short || m.long || (m.title + ' — project by Andrea Burchiani.')).slice(0, 160);
  const themeCls = m.theme ? ' theme-' + m.theme : '';
  const heroSlides = m.hero.length ? slideshowPage(m.hero, 'aspect-[3/2]', '3', m.title) :
    '<div class="slideshow aspect-[3/2]"><div class="slideshow-slides"></div></div>';
  const body = blocks.map((b) => blockPageHtml(b, m)).filter(Boolean).join('\n');
  return '<!doctype html>\n<html lang="en">\n  <head>\n' +
    '    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '    <title>' + esc(m.title || 'Untitled') + ' — Andrea Burchiani (' + esc(m.field) + ', ' + esc(m.year) + ')</title>\n' +
    '    <meta name="description" content="' + esc(desc) + '" />\n' +
    '    <meta name="author" content="Andrea Burchiani" />\n' +
    '    <meta name="robots" content="index, follow, max-image-preview:large" />\n' +
    '    <link rel="canonical" href="https://burghi.design/projects/' + esc(m.slug) + '.html" />\n' +
    '    <meta property="og:title" content="' + esc(m.title || '') + ' — Andrea Burchiani" />\n' +
    '    <meta property="og:description" content="' + esc(desc) + '" />\n' +
    '    <meta property="og:url" content="https://burghi.design/projects/' + esc(m.slug) + '.html" />\n' +
    '    <meta property="og:type" content="article" />\n' +
    '    <meta property="og:site_name" content="burghi.design" />\n' +
    '    <meta property="og:image" content="' + esc(ogAbs) + '" />\n' +
    '    <meta name="twitter:card" content="summary_large_image" />\n' +
    '    <meta name="twitter:title" content="' + esc(m.title || '') + ' — Andrea Burchiani" />\n' +
    '    <meta name="twitter:description" content="' + esc(desc) + '" />\n' +
    '    <meta name="twitter:image" content="' + esc(ogAbs) + '" />\n' +
    '    <link rel="icon" href="../favicon.svg" type="image/svg+xml" />\n' +
    '    <link rel="stylesheet" href="../assets/css/main.css" />\n' +
    '    <script>\n      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };\n    </script>\n' +
    '    <script defer src="/_vercel/insights/script.js"></script>\n' +
    '    <script defer src="/_vercel/speed-insights/script.js"></script>\n' +
    '    <script type="application/ld+json">\n    {\n' +
    '      "@context": "https://schema.org",\n      "@type": "CreativeWork",\n' +
    '      "name": ' + JSON.stringify(m.title || '') + ',\n' +
    '      "url": "https://burghi.design/projects/' + esc(m.slug) + '.html",\n' +
    '      "image": ' + JSON.stringify(ogAbs) + ',\n' +
    '      "description": ' + JSON.stringify(desc) + ',\n' +
    '      "genre": ' + JSON.stringify(m.field) + ',\n' +
    '      "dateCreated": ' + JSON.stringify(m.year) + ',\n' +
    '      "inLanguage": "en",\n' +
    '      "creator": { "@type": "Person", "name": "Andrea Burchiani", "url": "https://burghi.design/" }\n' +
    '    }\n    </script>\n  </head>\n  <body>\n' +
    '    <div class="project-standalone' + themeCls + '">\n      <div class="project-standalone-inner">\n' +
    '        <div class="columns nav-fixed row-nav gap-2 mb-4">\n' +
    '          <div class="col col-span-2"></div>\n' +
    '          <div class="col col-span-8">\n' +
    '            <div class="text-center"><a class="headers" href="../" data-close-overlay>( Close )</a></div>\n' +
    '            <div class="text-right"><a class="headers" href="../"></a></div>\n' +
    '          </div>\n          <div class="col col-span-2"></div>\n        </div>\n' +
    '        <div class="columns row-info gap-0 mb-6">\n' +
    '          <div class="col"><span class="legenda">Project Name<br /></span><span class="Index">' + esc(m.title) + '<br /></span><br /></div>\n' +
    '          <div class="col"><span class="legenda">Field </span><span class="Index">' + esc(m.field) + '</span></div>\n' +
    '          <div class="col"><span class="legenda">Year </span><span class="Index">' + esc(m.year) + '</span></div>\n' +
    '          <div class="col"></div>\n' +
    '          <div class="col"><span class="Index">' + para(m.long) + '</span></div>\n        </div>\n' +
    '        <div class="columns mb-4">\n' +
    '          <div class="col col-span-2"><span class="legenda">Skills<br /></span><span class="Index">' + skillsHtml(m.skills) + '</span></div>\n' +
    '          <div class="col col-span-10">' + heroSlides + '</div>\n        </div>\n' +
    (body ? '        ' + body.split('\n').join('\n        ') + '\n' : '') +
    '        <div class="columns gap-2 mb-4">\n' +
    '          <div class="col col-span-8"><span class="legenda">' + esc(m.footnote) + '</span></div>\n' +
    '          <div class="col col-span-4"><div class="text-right"><span class="corpo">' + esc(m.footdate) + '</span></div></div>\n' +
    '        </div>\n' +
    '        <hr class="mb-8" />\n      </div>\n    </div>\n' +
    '    <script src="../assets/js/main.js"></script>\n  </body>\n</html>\n';
}

function cardHtml(m) {
  const items = m.hero.slice(0, 3);
  const slides = items.length ? items.map(mediaCardTag).join('') : '';
  const aspect = m.cardAspect ? ' ' + m.cardAspect : '';
  return '<a href="./projects/' + esc(m.slug) + '.html" data-overlay="overlay-' + esc(m.slug) + '" class="project-block">\n' +
    '    <div class="slideshow' + aspect + '" data-autoplay="5" data-pause-hover>\n' +
    '        <div class="slideshow-slides">\n            ' + slides + '\n        </div>\n    </div>\n' +
    '    <div class="columns gap-2">\n' +
    '        <div class="col col-span-3"><span class="Index">' + esc(m.title) + '</span></div>\n' +
    '        <div class="col col-span-8"><span class="Index">' + esc(m.field) + '<br /><br />' + esc(m.short) + '<br />[More..]</span></div>\n' +
    '        <div class="col col-span-1"><div class="text-right"><span class="Index">' + esc(m.year) + '</span></div></div>\n' +
    '    </div>\n</a>';
}
function overlayHtml(m) {
  const theme = m.theme ? ' data-theme="' + esc(m.theme) + '"' : '';
  return '<div id="overlay-' + esc(m.slug) + '" class="overlay-backdrop project-overlay"' + theme + '>\n' +
    '    <div class="overlay-page"><div class="page-layout"><div class="overlay-content-inner"></div></div></div>\n</div>';
}
function indexRowHtml(m) {
  return '<div class="columns gap-2">\n' +
    '    <div class="col col-span-4"><a class="Index" href="./projects/' + esc(m.slug) + '.html" data-overlay="overlay-' + esc(m.slug) + '">' + esc(m.title) + '</a></div>\n' +
    '    <div class="col col-span-5"><a class="Index" href="./projects/' + esc(m.slug) + '.html" data-overlay="overlay-' + esc(m.slug) + '">' + esc(m.field) + '</a></div>\n' +
    '    <div class="col col-span-3"><div class="text-right"><a class="Index" href="./projects/' + esc(m.slug) + '.html" data-overlay="overlay-' + esc(m.slug) + '">' + esc(m.year) + '</a></div></div>\n' +
    '</div>\n<hr />';
}
/* ---------- fine mirror ---------- */

function fail(msg) { console.error('apply.mjs: ' + msg); process.exit(1); }

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const onlyIndex = args.includes('--only-index');
const specArg = args.find((a) => !a.startsWith('--')) || 'project-builder/exports/tbd5.json';
const specPath = resolve(root, specArg);

if (!existsSync(specPath)) fail('spec non trovata: ' + specArg);
let spec;
try { spec = JSON.parse(readFileSync(specPath, 'utf8')); }
catch (e) { fail('JSON non valido in ' + specArg + ': ' + e.message); }

const m = spec.meta || {};
const blocks = Array.isArray(spec.blocks) ? spec.blocks : [];

/* validazione leggera (stesse regole del builder) */
const errs = [];
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug || '')) errs.push('slug non valido: solo minuscole, numeri e trattini.');
if (!m.title) errs.push('manca title.');
if (!/^\d{4}$/.test(m.year || '')) errs.push('year deve essere 4 cifre.');
if (!m.long) errs.push('manca long.');
if (!Array.isArray(m.hero) || !m.hero.length) errs.push('hero vuoto.');
(m.hero || []).forEach((x, i) => { if (!/^assets\/media\//.test(cleanPath(x.src || ''))) errs.push('hero #' + (i + 1) + ' fuori da assets/media/.'); });
blocks.forEach((b, i) => {
  (b.media || []).forEach((x) => {
    if (x && x.src && String(x.src).trim() && !/^assets\/media\//.test(cleanPath(x.src))) errs.push('blocco ' + (i + 1) + ' fuori da assets/media/.');
  });
});
if (errs.length) fail('spec da sistemare:\n· ' + errs.join('\n· '));

const slug = m.slug;
const pageOut = pageHtml({ ...m, skills: m.skills || [], hero: m.hero || [] }, blocks);
const card = cardHtml({ ...m });
const overlay = overlayHtml({ ...m });
const indexRow = indexRowHtml({ ...m });

/* indentazione coerente con index.html */
const indent = (txt, n) => txt.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');
const cardBlock = indent('<!-- Progetto: ' + m.title + ' (slug:' + slug + ') — generato dal builder -->', 12) + '\n' +
  indent('<hr />', 12) + '\n' + indent(card, 12);
const indexBlock = indent('<!-- Progetto: ' + m.title + ' (slug:' + slug + ') — generato dal builder -->', 8) + '\n' + indent(indexRow, 8);
const overlayBlock = '<!-- Progetto: ' + m.title + ' (slug:' + slug + ') — generato dal builder -->\n' + overlay;

if (!existsSync(INDEX_PATH)) fail('index.html non trovato in ' + INDEX_PATH);
let indexHtml = readFileSync(INDEX_PATH, 'utf8');
for (const needle of ['NEW-PROJECT-CARD', 'NEW-PROJECT-OVERLAY', 'NEW-PROJECT-INDEX']) {
  if (!indexHtml.includes(needle)) fail('ancoraggio ' + needle + ' non trovato in index.html — non tocco nulla.');
}

const alreadyThere = indexHtml.includes('overlay-' + slug) || indexHtml.includes('projects/' + slug + '.html');
if (alreadyThere && !force) {
  fail('slug "' + slug + '" già presente in index.html. Nulla scritto.\n' +
    'Se vuoi rigenerare: node project-builder/apply.mjs ' + specArg + ' --force');
}

if (alreadyThere && force) {
  const q = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // card: eventuale commento marcatore + <hr/> + <a …>…</a>
  indexHtml = indexHtml.replace(
    new RegExp('(?:[ \\t]*<!-- Progetto:[^\\n]*\\(slug:' + q + '\\)[^\\n]*-->\\r?\\n)?[ \\t]*<hr \\/>\\r?\\n[ \\t]*<a href="\\.\\/projects\\/' + q + '\\.html" data-overlay="overlay-' + q + '" class="project-block">[\\s\\S]*?<\\/a>[ \\t]*\\r?\\n?', 'g'), '');
  // card legacy senza marcatore (commento generico + <a>)
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<!-- Progetto:[^\\n]*-->\\r?\\n[ \\t]*<a href="\\.\\/projects\\/' + q + '\\.html" data-overlay="overlay-' + q + '" class="project-block">[\\s\\S]*?<\\/a>[ \\t]*\\r?\\n?', 'g'), '');
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<a href="\\.\\/projects\\/' + q + '\\.html" data-overlay="overlay-' + q + '" class="project-block">[\\s\\S]*?<\\/a>[ \\t]*\\r?\\n?', 'g'), '');
  // overlay generato (guscio vuoto)
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<!-- Progetto:[^\\n]*\\(slug:' + q + '\\)[^\\n]*-->\\r?\\n[ \\t]*<div id="overlay-' + q + '" class="overlay-backdrop project-overlay"[^>]*>\\r?\\n[ \\t]*<div class="overlay-page"><div class="page-layout"><div class="overlay-content-inner"><\\/div><\\/div><\\/div>\\r?\\n<\\/div>[ \\t]*\\r?\\n?', 'g'), '');
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<div id="overlay-' + q + '" class="overlay-backdrop project-overlay"[^>]*>\\r?\\n[ \\t]*<div class="overlay-page"><div class="page-layout"><div class="overlay-content-inner"><\\/div><\\/div><\\/div>\\r?\\n<\\/div>[ \\t]*\\r?\\n?', 'g'), '');
  // riga index + <hr/> seguente
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<!-- Progetto:[^\\n]*\\(slug:' + q + '\\)[^\\n]*-->\\r?\\n[ \\t]*<div class="columns gap-2">\\r?\\n(?:[\\s\\S]*?overlay-' + q + '[\\s\\S]*?)<\\/div>\\r?\\n[ \\t]*<hr \\/>[ \\t]*\\r?\\n?', 'g'), '');
  indexHtml = indexHtml.replace(
    new RegExp('[ \\t]*<div class="columns gap-2">\\r?\\n(?:[ \\t]*<div class="col col-span-4"><a class="Index" href="\\.\\/projects\\/' + q + '\\.html"[\\s\\S]*?)<\\/div>\\r?\\n[ \\t]*<hr \\/>[ \\t]*\\r?\\n?', 'g'), '');
}

const pagePath = resolve(PROJECTS_DIR, slug + '.html');
const pageExists = existsSync(pagePath);
if (pageExists && !force && !onlyIndex && readFileSync(pagePath, 'utf8') !== pageOut) {
  fail('projects/' + slug + '.html esiste già e differisce. Nulla scritto.\n' +
    'Usa --force per sovrascrivere, o cambia slug.');
}

function insertBefore(anchorNeedle, block) {
  const i = indexHtml.indexOf(anchorNeedle);
  if (i < 0) fail('ancoraggio ' + anchorNeedle + ' sparito — non tocco nulla.');
  indexHtml = indexHtml.slice(0, i) + block + '\n' + indexHtml.slice(i);
}

insertBefore('<!-- NEW-PROJECT-CARD', cardBlock);
insertBefore('<!-- NEW-PROJECT-OVERLAY', overlayBlock);
insertBefore('<!-- NEW-PROJECT-INDEX', indexBlock);

if (dryRun) {
  console.log('[dry-run] spec: ' + specArg);
  console.log('[dry-run] scriverei: projects/' + slug + '.html (' + pageOut.length + ' char)' + (onlyIndex ? ' — SALTATO (--only-index)' : pageExists ? ' (sovrascrittura)' : ' (nuovo)'));
  console.log('[dry-run] index.html: +card (' + card.length + ' char), +overlay (' + overlay.length + ' char), +index row (' + indexRow.length + ' char)');
  console.log('[dry-run] nessuna scrittura effettuata.');
  process.exit(0);
}

if (!onlyIndex) writeFileSync(pagePath, pageOut, 'utf8');
writeFileSync(INDEX_PATH, indexHtml, 'utf8');

console.log('OK slug "' + slug + '" (' + basename(specPath) + '):');
if (!onlyIndex) console.log('  · scritto projects/' + slug + '.html');
console.log('  · index.html: card + overlay + riga index inseriti sopra gli ancoraggi NEW-PROJECT-*');
console.log('Verifica: npm run serve → http://localhost:8000/ e http://localhost:8000/projects/' + slug + '.html');
