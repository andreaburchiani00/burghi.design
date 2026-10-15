/* Project Builder v1 — client-side only. Single source of the export markup. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const statusEl = $('bd-status');

  const state = { blocks: [], uid: 0 };

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function cleanPath(p) {
    return String(p || '').trim().replace(/^\.\.\//, '').replace(/^\.\//, '').replace(/^\//, '');
  }
  function guessType(src) { return /\.mp4(\?|#|$)/i.test(src) ? 'video' : 'image'; }

  function mediaPageTag(m) {
    const src = '../' + cleanPath(m.src);
    if ((m.type || guessType(m.src)) === 'video') {
      return '<video class="slideshow-slide" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>';
    }
    const alt = esc(m.alt || stateTitle() || 'project image');
    return '<img class="slideshow-slide" src="' + esc(src) + '" alt="' + alt + '" loading="lazy">';
  }
  function mediaCardTag(m) {
    const src = './' + cleanPath(m.src);
    if ((m.type || guessType(m.src)) === 'video') {
      return '<video class="slideshow-slide" playsinline data-autoplay loop muted><source src="' + esc(src) + '" type="video/mp4"></video>';
    }
    return '<img class="slideshow-slide" src="' + esc(src) + '" alt="' + esc(m.alt || '') + '" loading="lazy">';
  }
  function slideshowPage(items, aspect, autoplay) {
    const cls = aspect ? 'slideshow ' + aspect : 'slideshow';
    return '<div class="' + cls + '" data-autoplay="' + autoplay + '" data-pause-hover><div class="slideshow-slides">' +
      items.map(mediaPageTag).join('') + '</div></div>';
  }
  function para(text) { return esc(text).replace(/\n/g, '<br />'); }

  function meta() {
    return {
      slug: $('f-slug').value.trim().toLowerCase().replace(/\s+/g, '-'),
      title: $('f-title').value.trim(),
      field: $('f-field').value,
      year: $('f-year').value.trim(),
      theme: $('f-theme').value,
      short: $('f-short').value.trim(),
      long: $('f-long').value.trim(),
      skills: $('f-skills').value.split('\n').map((s) => s.trim()).filter(Boolean),
      cardAspect: $('f-cardaspect').value,
      footnote: $('f-footnote').value.trim(),
      footdate: $('f-footdate').value.trim(),
      hero: readHeroMedia(),
    };
  }
  function stateTitle() { return $('f-title').value.trim(); }

  /* ---------- hero media editor ---------- */
  function readHeroMedia() {
    const out = [];
    document.querySelectorAll('#hero-media .bd-media').forEach((el) => {
      const src = el.querySelector('.m-src').value.trim();
      if (!src) return;
      out.push({ type: el.querySelector('.m-type').value, src: src, alt: el.querySelector('.m-alt').value.trim() });
    });
    return out;
  }
  function mediaRow(m) {
    m = m || { type: 'image', src: '', alt: '' };
    const el = document.createElement('div');
    el.className = 'bd-media';
    el.innerHTML =
      '<div class="bd-row"><div class="bd-field"><label>Tipo</label><select class="m-type">' +
      '<option value="image"' + (m.type === 'image' ? ' selected' : '') + '>immagine</option>' +
      '<option value="video"' + (m.type === 'video' ? ' selected' : '') + '>video .mp4</option></select></div>' +
      '<div class="bd-field"><label>Alt (solo immagini)</label><input class="m-alt" value="' + esc(m.alt || '') + '" placeholder="descrizione" /></div></div>' +
      '<div class="bd-field"><label>Percorso</label><input class="m-src" value="' + esc(m.src || '') + '" placeholder="assets/media/projects/slug/file.jpg" /></div>' +
      '<button class="bd-btn danger m-del" type="button">rimuovi</button>';
    el.querySelector('.m-del').addEventListener('click', () => { el.remove(); generate(); });
    el.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', generate));
    return el;
  }
  $('hero-add').addEventListener('click', () => { $('hero-media').appendChild(mediaRow()); });
  $('hero-media').appendChild(mediaRow());
  $('hero-media').appendChild(mediaRow());

  /* ---------- blocks ---------- */
  const BLOCK_DEFS = {
    full: { name: 'Full-width', sub: 'columns · 12 · 1 media' },
    duo: { name: 'Doppia immagine', sub: 'columns · 6 + 6' },
    textmedia: { name: 'Testo + media', sub: 'columns · 2 (Index) + 10 (media)' },
    textfull: { name: 'Testo pieno', sub: 'columns · 12 (Index)' },
    videoflat: { name: 'Video flatplan', sub: 'columns · 2 (label) + 10 (video 17/10)' },
    flipbook: { name: 'Flipbook', sub: 'slideshow-flipbook frame-1710 · scrub, autoplay 0.5' },
    credits3: { name: 'Crediti 3+6+3', sub: 'foto 3 · team/testo 6 · data 3' },
  };

  function addBlock(type) {
    const b = { id: ++state.uid, type: type, left: '', text: '', right: '', media: [{ type: 'image', src: '', alt: '' }] };
    if (type === 'duo') b.media.push({ type: 'image', src: '', alt: '' });
    if (type === 'flipbook') b.media.push({ type: 'image', src: '', alt: '' }, { type: 'image', src: '', alt: '' });
    state.blocks.push(b);
    renderBlocks();
    generate();
  }
  document.querySelectorAll('#add-block-btns [data-add]').forEach((btn) =>
    btn.addEventListener('click', () => addBlock(btn.getAttribute('data-add'))));

  function renderBlocks() {
    const box = $('blocks');
    box.innerHTML = '';
    state.blocks.forEach((b, idx) => {
      const def = BLOCK_DEFS[b.type];
      const el = document.createElement('div');
      el.className = 'bd-block';
      let inner = '<div class="bd-blockhead"><div><strong>' + (idx + 1) + ' · ' + def.name + '</strong><small>' + def.sub + ' — struttura bloccata</small></div>' +
        '<div class="bd-iconbtns"><button class="bd-btn" data-mv="-1" type="button">↑</button><button class="bd-btn" data-mv="1" type="button">↓</button><button class="bd-btn danger" data-del="1" type="button">✕</button></div></div>';
      if (b.type === 'textmedia' || b.type === 'videoflat') {
        inner += '<div class="bd-field"><label>Testo colonna sinistra (Index)</label><textarea data-k="left">' + esc(b.left) + '</textarea></div>';
      }
      if (b.type === 'textfull') {
        inner += '<div class="bd-field"><label>Testo (Index, colonna 12)</label><textarea data-k="text" style="min-height:96px">' + esc(b.text) + '</textarea></div>';
      }
      if (b.type === 'full' || b.type === 'textmedia' || b.type === 'videoflat') {
        inner += '<div data-mwrap></div>';
      }
      if (b.type === 'duo') {
        inner += '<div class="bd-field"><label>Sinistra 6</label><div data-mwrap0></div></div><div class="bd-field"><label>Destra 6</label><div data-mwrap1></div></div>';
      }
      if (b.type === 'flipbook') {
        inner += '<div class="bd-field"><label>Fotogrammi (solo immagini, in ordine)</label><div data-mwraplist></div><button class="bd-btn" data-addm type="button">+ aggiungi fotogramma</button></div>';
      }
      if (b.type === 'credits3') {
        inner += '<div class="bd-field"><label>Foto sinistra (3)</label><div data-mwrap></div></div>' +
          '<div class="bd-field"><label>Testo centrale (Index, team/crediti)</label><textarea data-k="text" style="min-height:120px">' + esc(b.text) + '</textarea></div>' +
          '<div class="bd-field"><label>Data destra (es. Autumn 2026)</label><input data-k="right" value="' + esc(b.right || '') + '" /></div>';
      }
      el.innerHTML = inner;
      el.querySelector('[data-del]').addEventListener('click', () => { state.blocks = state.blocks.filter((x) => x.id !== b.id); renderBlocks(); generate(); });
      el.querySelectorAll('[data-mv]').forEach((btn) => btn.addEventListener('click', () => {
        const j = state.blocks.findIndex((x) => x.id === b.id);
        const k = j + parseInt(btn.getAttribute('data-mv'), 10);
        if (k < 0 || k >= state.blocks.length) return;
        const tmp = state.blocks[j]; state.blocks[j] = state.blocks[k]; state.blocks[k] = tmp;
        renderBlocks(); generate();
      }));
      el.querySelectorAll('[data-k]').forEach((t) => t.addEventListener('input', () => { b[t.getAttribute('data-k')] = t.value; generate(); }));
      const mkSingle = (target, val) => {
        const row = mediaRow(val);
        row.querySelector('.m-src').addEventListener('input', () => { target.src = row.querySelector('.m-src').value; target.type = row.querySelector('.m-type').value; target.alt = row.querySelector('.m-alt').value; generate(); });
        row.querySelector('.m-type').addEventListener('input', () => { target.type = row.querySelector('.m-type').value; generate(); });
        row.querySelector('.m-alt').addEventListener('input', () => { target.alt = row.querySelector('.m-alt').value; });
        row.querySelector('.m-del').style.display = 'none';
        return row;
      };
      if (b.type === 'full') el.querySelector('[data-mwrap]').appendChild(mkSingle(b.media[0], b.media[0]));
      if (b.type === 'textmedia' || b.type === 'videoflat') el.querySelector('[data-mwrap]').appendChild(mkSingle(b.media[0], b.media[0]));
      if (b.type === 'duo') {
        el.querySelector('[data-mwrap0]').appendChild(mkSingle(b.media[0], b.media[0]));
        if (!b.media[1]) b.media[1] = { type: 'image', src: '', alt: '' };
        el.querySelector('[data-mwrap1]').appendChild(mkSingle(b.media[1], b.media[1]));
      }
      if (b.type === 'credits3') {
        if (!b.media[0]) b.media[0] = { type: 'image', src: '', alt: '' };
        el.querySelector('[data-mwrap]').appendChild(mkSingle(b.media[0], b.media[0]));
      }
      if (b.type === 'flipbook') {
        const list = el.querySelector('[data-mwraplist]');
        const drawList = () => {
          list.innerHTML = '';
          b.media.forEach((fm, fi) => {
            const row = mediaRow(fm);
            row.querySelector('.m-type').value = 'image'; fm.type = 'image';
            row.querySelector('.m-type').disabled = true;
            row.querySelector('.m-src').addEventListener('input', () => { fm.src = row.querySelector('.m-src').value; fm.alt = row.querySelector('.m-alt').value; generate(); });
            row.querySelector('.m-alt').addEventListener('input', () => { fm.alt = row.querySelector('.m-alt').value; });
            row.querySelector('.m-del').addEventListener('click', () => { b.media.splice(fi, 1); drawList(); renderBlocks(); generate(); }, { once: true });
            // mediaRow's own del handler removes the row element; re-sync via drawList below
            list.appendChild(row);
          });
        };
        drawList();
        el.querySelector('[data-addm]').addEventListener('click', () => { b.media.push({ type: 'image', src: '', alt: '' }); renderBlocks(); generate(); });
      }
      box.appendChild(el);
    });
    if (!state.blocks.length) box.innerHTML = '<p class="bd-hint">Nessun blocco. Aggiungine uno qui sopra.</p>';
  }

  /* ---------- generators (mirror existing pages) ---------- */
  function skillsHtml(skills) {
    return skills.map((s) => '<img class="icon-svg" src="../assets/icons/info.svg" alt=""> ' + esc(s)).join('<br />\n');
  }
  function blockPageHtml(b) {
    if (b.type === 'full') {
      if (!b.media[0].src.trim()) return '';
      const m = b.media[0]; const src = '../' + cleanPath(m.src);
      const tag = (m.type || guessType(m.src)) === 'video'
        ? '<video class="w-full" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
        : '<img class="w-full" src="' + esc(src) + '" alt="' + esc(m.alt || stateTitle()) + '" loading="lazy">';
      return '<div class="columns gap-4 mb-4"><div class="col col-span-12">' + tag + '</div></div>';
    }
    if (b.type === 'duo') {
      const cells = b.media.filter((m) => m.src.trim()).map((m) => {
        const src = '../' + cleanPath(m.src);
        const tag = (m.type || guessType(m.src)) === 'video'
          ? '<video playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
          : '<img src="' + esc(src) + '" alt="' + esc(m.alt || stateTitle()) + '" loading="lazy">';
        return '<div class="col col-span-6">' + tag + '</div>';
      }).join('');
      return cells ? '<div class="columns gap-4 mb-4">' + cells + '</div>' : '';
    }
    if (b.type === 'textmedia') {
      if (!b.media[0].src.trim() && !b.left.trim()) return '';
      const m = b.media[0]; const src = '../' + cleanPath(m.src);
      const tag = m.src.trim() ? ((m.type || guessType(m.src)) === 'video'
        ? '<video class="w-full" playsinline data-autoplay loop muted preload="metadata"><source src="' + esc(src) + '" type="video/mp4"></video>'
        : '<img class="w-full" src="' + esc(src) + '" alt="' + esc(m.alt || stateTitle()) + '" loading="lazy">') : '';
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
      const frames = (b.media || []).filter((m) => m.src.trim());
      if (!frames.length) return '';
      const imgs = frames.map((m) => '<img src="../' + esc(cleanPath(m.src)) + '" alt="' + esc(m.alt || stateTitle()) + '" loading="lazy">').join('');
      return '<div class="columns gap-4 mb-4"><div class="col col-span-2"></div><div class="col col-span-10">' +
        '<div class="slideshow slideshow-flipbook frame-1710" data-autoplay="0.5" data-scrub><div class="slideshow-slides">' + imgs + '</div></div>' +
        '</div></div>';
    }
    if (b.type === 'credits3') {
      if (!b.media[0].src.trim() && !b.text.trim() && !(b.right || '').trim()) return '';
      const m = b.media[0]; const src = '../' + cleanPath(m.src);
      const left = m.src.trim()
        ? '<img class="w-full aspect-[3/4] object-cover" src="' + esc(src) + '" alt="' + esc(m.alt || stateTitle()) + '" loading="lazy">'
        : '';
      return '<div class="columns gap-4 mb-4" style="align-items: start"><div class="col col-span-3">' + left + '</div>' +
        '<div class="col col-span-6"><span class="Index">' + para(b.text) + '</span></div>' +
        '<div class="col col-span-3" style="align-self: end"><div class="text-right"><span class="corpo">' + esc(b.right || '') + '</span></div></div></div>';
    }
    return '';
  }

  function pageHtml(m) {
    const ogImg = m.hero.find((x) => (x.type || guessType(x.src)) === 'image');
    const ogAbs = ogImg ? 'https://burghi.design/' + cleanPath(ogImg.src) : 'https://burghi.design/assets/media/bookshelf/Screenshot-2024-11-26-alle-17.14.08.png';
    const desc = (m.short || m.long || (m.title + ' — project by Andrea Burchiani.')).slice(0, 160);
    const themeCls = m.theme ? ' theme-' + m.theme : '';
    const heroSlides = m.hero.length ? slideshowPage(m.hero, 'aspect-[3/2]', '3') :
      '<div class="slideshow aspect-[3/2]"><div class="slideshow-slides"></div></div>';
    const blocks = state.blocks.map(blockPageHtml).filter(Boolean).join('\n');
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
      (blocks ? '        ' + blocks.split('\n').join('\n        ') + '\n' : '') +
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

  /* ---------- preview (same markup, local paths) ---------- */
  let pvIndex = {};
  function previewHtml(m) {
    const inner = pageHtml(m).split('<div class="project-standalone-inner">')[1].split('<script src="../assets/js/main.js">')[0];
    // rewrite ../assets -> ../assets (preview lives one level deep too) — keep as-is
    return inner.replace(/<\/div>\s* lossy$/, '</div>');
  }
  function renderPreview(m) {
    const box = $('preview');
    const frame = box.closest('.project-standalone');
    if (frame) frame.className = 'project-standalone' + (m.theme ? ' theme-' + m.theme : '');
    // Build preview from blocks directly (page body only), with mini slideshow nav
    pvIndex = {};
    let h = '<div class="columns nav-fixed row-nav gap-2 mb-4"><div class="col col-span-2"></div>' +
      '<div class="col col-span-8"><div class="text-center"><span class="headers">( Close )</span></div></div><div class="col col-span-2"></div></div>' +
      '<div class="columns row-info gap-0 mb-6"><div class="col"><span class="legenda">Project Name<br /></span><span class="Index">' + esc(m.title || '—') + '</span></div>' +
      '<div class="col"><span class="legenda">Field </span><span class="Index">' + esc(m.field) + '</span></div>' +
      '<div class="col"><span class="legenda">Year </span><span class="Index">' + esc(m.year || '—') + '</span></div><div class="col"></div>' +
      '<div class="col"><span class="Index">' + para(m.long || '…') + '</span></div></div>' +
      '<div class="columns mb-4"><div class="col col-span-2"><span class="legenda">Skills<br /></span><span class="Index">' + (skillsHtml(m.skills) || '—') + '</span></div>' +
      '<div class="col col-span-10">' + pvSlideshow('hero', m.hero) + '</div></div>';
    state.blocks.forEach((b) => { h += pvBlock(b); });
    h += '<div class="columns gap-2 mb-4"><div class="col col-span-8"><span class="legenda">' + esc(m.footnote) + '</span></div>' +
      '<div class="col col-span-4"><div class="text-right"><span class="corpo">' + esc(m.footdate) + '</span></div></div></div><hr class="mb-8" />';
    box.innerHTML = h;
    box.querySelectorAll('[data-pv]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-pv'); const dir = parseInt(btn.getAttribute('data-dir'), 10);
      const wrap = box.querySelector('[data-pvwrap="' + id + '"]');
      if (!wrap) return;
      const n = wrap.children.length; if (n < 2) return;
      pvIndex[id] = ((pvIndex[id] || 0) + dir + n) % n;
      Array.from(wrap.children).forEach((s, i) => { s.style.display = i === pvIndex[id] ? '' : 'none'; });
      const c = box.querySelector('[data-pvcount="' + id + '"]');
      if (c) c.textContent = (pvIndex[id] + 1) + ' / ' + n;
    }));
    $('pv-count').textContent = state.blocks.length + ' blocchi';
  }
  function pvMedia(m) {
    const src = m.src.trim() ? '../' + cleanPath(m.src) : '';
    if (!src) return '<div style="border:1px dashed #ccc;padding:24px;text-align:center;font-size:12px;color:#999">media mancante — inserisci il percorso</div>';
    if ((m.type || guessType(m.src)) === 'video') return '<video style="width:100%" playsinline loop muted controls><source src="' + esc(src) + '" type="video/mp4"></video>';
    return '<img style="width:100%" src="' + esc(src) + '" alt="' + esc(m.alt || '') + '" loading="lazy" onerror="this.style.opacity=.3" />';
  }
  let pvSeq = 0;
  function pvSlideshow(id, items) {
    if (!items.length) return '<div style="border:1px dashed #ccc;padding:24px;text-align:center;font-size:12px;color:#999">hero vuoto</div>';
    const pid = 'pv' + (++pvSeq);
    pvIndex[pid] = 0;
    const slides = items.map((m, i) => '<div data-pvslide style="display:' + (i === 0 ? '' : 'none') + '">' + pvMedia(m) + '</div>').join('');
    const nav = items.length > 1
      ? '<button class="bd-pv-nav bd-pv-prev" data-pv="' + pid + '" data-dir="-1">‹</button><button class="bd-pv-nav bd-pv-next" data-pv="' + pid + '" data-dir="1">›</button><span class="bd-pv-count" data-pvcount="' + pid + '">1 / ' + items.length + '</span>' : '';
    return '<div class="bd-pv-slideshow"><div data-pvwrap="' + pid + '">' + slides + '</div>' + nav + '</div>';
  }
  function pvBlock(b) {
    if (b.type === 'full') return '<div class="columns gap-4 mb-4"><div class="col col-span-12">' + pvMedia(b.media[0]) + '</div></div>';
    if (b.type === 'duo') return '<div class="columns gap-4 mb-4"><div class="col col-span-6">' + pvMedia(b.media[0]) + '</div><div class="col col-span-6">' + pvMedia(b.media[1] || { src: '' }) + '</div></div>';
    if (b.type === 'textmedia') return '<div class="columns gap-4 mb-4"><div class="col col-span-2"><span class="Index">' + (para(b.left) || '<span style="color:#999">testo…</span>') + '</span></div><div class="col col-span-10">' + pvMedia(b.media[0]) + '</div></div>';
    if (b.type === 'textfull') return '<div class="columns gap-4 mt-8 mb-4"><div class="col col-span-12"><span class="Index">' + (para(b.text) || '<span style="color:#999">testo…</span>') + '</span></div></div>';
    if (b.type === 'videoflat') return '<div class="columns gap-4 mb-4"><div class="col col-span-2"><span class="Index">' + esc(b.left || 'Flatplan') + '</span></div><div class="col col-span-10">' + pvMedia({ type: 'video', src: b.media[0].src, alt: '' }) + '</div></div>';
    if (b.type === 'flipbook') return '<div class="columns gap-4 mb-4"><div class="col col-span-2"><span class="bd-hint">flipbook ' + (b.media || []).filter((m) => m.src.trim()).length + ' frame</span></div><div class="col col-span-10">' + pvSlideshow('fb' + b.id, (b.media || []).filter((m) => m.src.trim())) + '</div></div>';
    if (b.type === 'credits3') return '<div class="columns gap-4 mb-4"><div class="col col-span-3">' + pvMedia(b.media[0] || { src: '' }) + '</div><div class="col col-span-6"><span class="Index">' + (para(b.text) || '<span style="color:#999">team/crediti…</span>') + '</span></div><div class="col col-span-3"><div class="text-right"><span class="corpo">' + esc(b.right || '') + '</span></div></div></div>';
    return '';
  }

  /* ---------- validate + generate ---------- */
  function validate(m) {
    const errs = [];
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug || '')) errs.push('Slug non valido: solo minuscole, numeri e trattini (es. <code>lagne-zine</code>).');
    if (!m.title) errs.push('Manca il titolo.');
    if (!/^\d{4}$/.test(m.year || '')) errs.push('Anno = 4 cifre (es. 2026).');
    if (!m.long) errs.push('Manca la descrizione lunga.');
    if (!m.hero.length) errs.push('Hero vuoto: aggiungi almeno 1 media.');
    m.hero.forEach((x, i) => { if (!/^assets\/media\//.test(cleanPath(x.src))) errs.push('Hero #' + (i + 1) + ': il percorso deve stare sotto <code>assets/media/…</code>.'); });
    state.blocks.forEach((b, i) => {
      (b.media || []).forEach((x) => {
        if (x && x.src && x.src.trim() && !/^assets\/media\//.test(cleanPath(x.src))) errs.push('Blocco ' + (i + 1) + ': percorso fuori da <code>assets/media/…</code>.');
      });
    });
    return errs;
  }

  function spec(m) { return { generator: 'project-builder v1', meta: { slug: m.slug, title: m.title, field: m.field, year: m.year, theme: m.theme, short: m.short, long: m.long, skills: m.skills, cardAspect: m.cardAspect, footnote: m.footnote, footdate: m.footdate, hero: m.hero }, blocks: state.blocks }; }

  function generate() {
    const m = meta();
    renderPreview(m);
    const errs = validate(m);
    statusEl.innerHTML = errs.length
      ? '<div class="bd-errors"><strong>Da sistemare:</strong><br>· ' + errs.join('<br>· ') + '</div>'
      : '<div class="bd-ok">Pronto: anteprima aggiornata. Scarica la pagina e copia gli snippet qui sotto.</div>';
    $('out-page').value = pageHtml(m);
    $('out-card').value = cardHtml(m);
    $('out-overlay').value = overlayHtml(m);
    $('out-index').value = indexRowHtml(m);
    return m;
  }

  ['f-slug', 'f-title', 'f-field', 'f-year', 'f-theme', 'f-short', 'f-long', 'f-skills', 'f-cardaspect', 'f-footnote', 'f-footdate']
    .forEach((id) => $(id).addEventListener('input', generate));

  $('btn-generate').addEventListener('click', generate);
  document.querySelectorAll('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const ta = $(btn.getAttribute('data-copy'));
    ta.select();
    try { await navigator.clipboard.writeText(ta.value); btn.textContent = 'Copiato ✓'; }
    catch (e) { document.execCommand('copy'); btn.textContent = 'Copiato ✓'; }
    setTimeout(() => { btn.textContent = 'Copia ' + btn.getAttribute('data-copy').replace('out-', ''); }, 1500);
  }));
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  $('btn-dl-html').addEventListener('click', () => { const m = generate(); download((m.slug || 'nuovo-progetto') + '.html', $('out-page').value, 'text/html'); });
  $('btn-dl-json').addEventListener('click', () => { const m = generate(); download((m.slug || 'nuovo-progetto') + '.json', JSON.stringify(spec(m), null, 2), 'application/json'); });

  /* ---------- apply locale: salva spec + comando inserimento ---------- */
  function applyCmd(m) {
    const slug = (m && m.slug) || $('f-slug').value.trim().toLowerCase().replace(/\s+/g, '-') || 'progetto';
    return 'node project-builder/apply.mjs project-builder/exports/' + slug + '.json';
  }
  function refreshApplyCmd(m) {
    const el = $('apply-cmd');
    if (el) el.value = applyCmd(m || meta());
  }
  const _generate = generate;
  generate = function () { const m = _generate(); refreshApplyCmd(m); return m; };
  ['f-slug'].forEach((id) => $(id).addEventListener('input', () => refreshApplyCmd()));
  $('btn-dl-spec') && $('btn-dl-spec').addEventListener('click', () => {
    const m = generate();
    download('exports-' + (m.slug || 'nuovo-progetto') + '.json', JSON.stringify(spec(m), null, 2), 'application/json');
    statusEl.innerHTML = '<div class="bd-ok">Specifica scaricata: spostala in <code>project-builder/exports/' + esc(m.slug || 'nuovo-progetto') + '.json</code>, poi lancia<br><code>' + esc(applyCmd(m)) + '</code></div>';
  });
  $('btn-copy-apply') && $('btn-copy-apply').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText($('apply-cmd').value); btn.textContent = 'Copiato ✓'; }
    catch (err) { $('apply-cmd').select(); document.execCommand('copy'); btn.textContent = 'Copiato ✓'; }
    setTimeout(() => { btn.textContent = 'Copia comando apply'; }, 1500);
  });

  /* ---------- load spec (.json) ---------- */
  function applySpec(s) {
    const m = s.meta || {};
    $('f-slug').value = m.slug || ''; $('f-title').value = m.title || '';
    $('f-field').value = m.field || 'Editorial'; $('f-year').value = m.year || '';
    $('f-theme').value = m.theme || ''; $('f-short').value = m.short || '';
    $('f-long').value = m.long || ''; $('f-skills').value = (m.skills || []).join('\n');
    $('f-cardaspect').value = m.cardAspect || 'aspect-[3/2]';
    $('f-footnote').value = m.footnote || ''; $('f-footdate').value = m.footdate || '';
    const hm = $('hero-media'); hm.innerHTML = '';
    (m.hero && m.hero.length ? m.hero : [{ type: 'image', src: '', alt: '' }]).forEach((x) => hm.appendChild(mediaRow(x)));
    hm.querySelectorAll('input,select').forEach((i) => i.addEventListener('input', generate));
    state.blocks = (s.blocks || []).map((b) => Object.assign({ id: ++state.uid, left: '', text: '', right: '', media: [] }, b));
    renderBlocks();
    generate();
  }
  async function loadSpecUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      applySpec(await res.json());
    } catch (e) {
      statusEl.innerHTML = '<div class="bd-errors">Non riesco a caricare <code>' + esc(url) + '</code>: ' + esc(e.message) + '</div>';
    }
  }
  $('file-spec').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { applySpec(JSON.parse(r.result)); } catch (err) { statusEl.innerHTML = '<div class="bd-errors">JSON non valido.</div>'; } };
    r.readAsText(f);
  });
  $('btn-load-tbd5').addEventListener('click', () => loadSpecUrl('./exports/tbd5.json'));

  renderBlocks();
  const qs = new URLSearchParams(location.search);
  if (qs.get('spec')) loadSpecUrl(qs.get('spec'));
  else generate();
})();
