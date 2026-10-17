# Guida esportazione — Project Builder (burghi.design)

Questo builder è **locale e non pubblicato** (escluso dal deploy via `.vercelignore`). Serve a compilare i progetti e generare i file da inserire nel sito pubblicato.

## File ottenuti dal builder

| File | Cosa contiene | Dove va inserito |
|------|--------------|------------------|
| `projects/<slug>.html` | Pagina progetto completa (head, corpo, tema, slideshow, blocchi) | Cartella `projects/` della radice del sito |
| Snippet ① — card | `<a class="project-block">…</a>` per la colonna Projects | In `index.html`, sopra `<!-- NEW-PROJECT-CARD -->` |
| Snippet ② — overlay | `<div id="overlay-<slug>" …>` guscio vuoto | In `index.html`, sopra `<!-- NEW-PROJECT-OVERLAY -->` |
| Snippet ③ — riga index | `<div class="columns gap-2">…</div><hr />` per l'indice progetti | In `index.html`, sopra `<!-- NEW-PROJECT-INDEX -->` |
| Spec `.json` | Configurazione completa del progetto (ricaricabile nel builder) | `project-builder/exports/<slug>.json` |

## Ordine consigliato

1. Scarica la pagina `.html` e salvala in `projects/<slug>.html`.
2. Copia i 3 snippet e incollali in `index.html` sopra i rispettivi ancoraggi `NEW-PROJECT-*`.
3. Conserva lo spec `.json` in `project-builder/exports/` per modifiche future.

## Temi disponibili

Nel campo "Tema overlay" della scheda progetto puoi scegliere:
- `(default)` — pagina chiara
- `black` — pagina nera con testi bianchi (es. TBD5)

Il tema si applica automaticamente alla pagina esportata e alla navbar.

## Ancoraggi in `index.html`

Questi commenti servono da segnaposto per i 3 snippet:
- `<!-- NEW-PROJECT-CARD -->` — colonna Projects (homepage)
- `<!-- NEW-PROJECT-OVERLAY -->` — overlay progetti (dopo gli overlay esistenti)
- `<!-- NEW-PROJECT-INDEX -->` — riga nell'indice progetti (dentro l'overlay index)

## Ricaricare un progetto esistente

Nel builder, clicca "Carica specifica .json" e seleziona il file da `project-builder/exports/`, oppure usa l'URL `?spec=./exports/<slug>.json`.
