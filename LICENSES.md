# LICENSES.md

Every third-party component used by this project, with its licence.

Generated from `npx license-checker --production` and reconciled by hand. The rulebook prohibits AGPL, GPL, LGPL, MPL, SSPL and non-commercial licences; the one LGPL-tagged item in the dependency tree is documented in full under **Optional binaries not used** below.

## Direct dependencies

| Package | Version | Licence | Used for |
|---|---|---|---|
| @neondatabase/serverless | 1.1.0 | MIT | Serverless Postgres access for accounts and ledger data |
| next | 15.5.24 | MIT | Application framework, routing, API routes and server actions |
| react | 19.x | MIT | UI rendering |
| react-dom | 19.x | MIT | DOM renderer |
| zustand | 5.x | MIT | Per-render-tree client state and non-destructive case previews |

Five production dependencies. Receipt reading calls the Gemini REST endpoint with the platform `fetch`, so it adds no package.

## Direct development dependencies

| Package | Version | Licence | Used for |
|---|---|---|---|
| typescript | 5.x | Apache-2.0 | Type checking |
| tailwindcss | 4.x | MIT | Styling |
| @tailwindcss/postcss | 4.x | MIT | Tailwind PostCSS plugin |
| tsx | 4.x | MIT | Runs `scripts/verify.ts` |
| @types/node | 22.x | MIT | Type definitions |
| @types/react | 19.x | MIT | Type definitions |
| @types/react-dom | 19.x | MIT | Type definitions |

## Transitive dependencies

Pulled in by the packages above. Licence totals for the production tree:

| Licence | Count |
|---|---|
| MIT | 15 |
| Apache-2.0 | 3 |
| ISC | 2 |
| BSD-3-Clause | 1 |
| 0BSD | 1 |
| CC-BY-4.0 | 1 |

Counts are indicative; regenerate before submitting with the command below.

`caniuse-lite` is the CC-BY-4.0 entry: a browser-support **data set** used by the build toolchain, attribution-only and commercially usable. It ships no code into the application. The private root package can appear as `UNLICENSED` in some tool output even though its source licence is declared as MIT in `package.json`; the reproducible command below excludes that root entry.

Reproduce with:

```bash
npx license-checker --production --summary --excludePackages lsh26-t050-p12@1.0.0
```

## Optional binaries not used

`sharp@0.35.4` and its platform binary `@img/sharp-win32-x64@0.35.4` appear in the tree as an **optional** dependency of Next.js, and the platform binary carries `Apache-2.0 AND LGPL-3.0-or-later` because it links libvips.

**This project does not use it.** It exists only to power `next/image` optimization; this app imports no `next/image` anywhere, and `next.config.mjs` sets `images: { unoptimized: true }`, so the module is never required at runtime and no part of it is bundled into the application output. It is listed here for completeness rather than omitted, because an accurate list is worth more than a convenient one.

## Services

| Service | Terms | Used for |
|---|---|---|
| Vercel | Commercial hosting, free tier | Deployment and the live URL |
| Google Gemini API — `gemini-3.6-flash` | Google APIs Terms of Service / Gemini API Additional Terms | Reading amount, date and shop from bill photos |

## Fonts, icons and assets

| Asset | Source | Licence |
|---|---|---|
| Instrument Sans | Google Fonts, via `next/font` (downloaded and self-hosted at build time) | SIL Open Font License 1.1 |
| IBM Plex Mono | Google Fonts, via `next/font` (downloaded and self-hosted at build time) | SIL Open Font License 1.1 |
| Tab bar and app icons | Drawn by the team as inline SVG paths | Original work |
| Charts | Donut and bars are hand-drawn SVG and CSS; no chart library | Original work |

No stock photography, illustration, audio or icon set is used.

## Data

| Item | Source | Notes |
|---|---|---|
| `data/cases.json` | Provided by LofiStack Hackathon 2026 | The 25 public P12 cases, available in the case-preview picker and used by `npm run verify` |
| DPS interest rule and rate | Carried inside each case | Read at runtime and displayed in the app; not hardcoded |

## AI tool use

Claude and Codex were used as coding assistants during the build window, as permitted by the rulebook. Gemini 3.6 Flash is used at runtime by the application itself to read receipt photos. All source code in this repository was written during the event; no pre-written solution code for this problem existed beforehand. The repository history is preserved, and `Event.md` records the repository state at the start of the event.

## Our own code

All application code in this repository is authored by the team and released under the MIT License.
