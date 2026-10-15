# Development status

## Public source preparation — 15 October 2026

Removed advertising code, publisher configuration, verification tags, and dedicated ad tests. Removed operator contact details, personal paths, domain defaults, and the account-specific marketing kit. Deployment settings and contact links use example.com placeholders; configure them before hosting. Earlier validation entries below describe historical game development.

Validation: production build and TypeScript, ESLint, all 141 unit tests, all 10 production browser checks, and all 7 presence service tests passed. Scanned the remaining source and production output for removed identifiers and credential patterns.

## Setup, issues, and reinforcement update — 14 October 2026

Run setup now has four separate screens: **Avatar → Location → Issue → Pursuer**, with **Hit the streets** on the final step. Avatar, location, issue, and pursuer selections persist locally. Five issue choices drive the introduction slogan and the original matching speech bubbles that cycle while the runner raises an arm. The requested campaign labels and the dated research for Exam fairness and School sudhaaro are distinguished in [ISSUE_REFERENCES.md](docs/ISSUE_REFERENCES.md).

The current playable roster contains only **four free avatars**: Abhiteep Bauna, German Sepherd, Pappu, and Khujliwaal. Abhiteep Bauna is the default. The classic-avatar section and paid character unlocks have been removed from the selection screen; locations still unlock with chai. Udhar Galib and Jaleel Imaan remain in the fictional victory reward and are excluded from avatar selection.

The four playable avatars now use clearly illustrated v3 cartoon portraits, restyled with built-in `image_gen` from the earlier generated v2 assets. Thick outlines, exaggerated heads, and simple facial shapes replace the realistic rendering. The bundled 640 × 640 WebP illustrations total about 104 KiB; source photographs and superseded v2 portraits are excluded from the production build. Their gameplay models remain code-built animated 3D geometry. Other portraits remain SVG artwork. Current prompts are preserved in [AVATAR_CARTOON_PROMPTS.json](docs/AVATAR_CARTOON_PROMPTS.json), with historical prompts and source URLs in [AVATAR_ART_PROMPTS.json](docs/AVATAR_ART_PROMPTS.json).

At **80 chai collected in the current run**, mixed RSS- and Bajrang-inspired reinforcements join once, widen the chase view, and increase difficulty. This pickup threshold is separate from the **100 bonus chai awarded at 1,000 metres** and does not use the saved token balance. A retry resets the reinforcement trigger. Installable/offline PWA support remains a possible future improvement; it has not been added.

## Current validation — four-avatar and issue update

- Cartoon-art follow-up: production build/typecheck, ESLint, the focused four-avatar browser check (desktop/mobile, selection persistence, all image loads), and all 3 production browser checks pass. The broader gameplay suite below is the prior baseline; gameplay code was unchanged in this art-only follow-up.
- Strict TypeScript, ESLint, production compilation, and **136 unit tests across 14 files** pass.
- All **27 browser scenarios** passed across the full run and targeted reruns. This covers all four loaded avatar images, removed-avatar save migration, ordered setup/back navigation, issue persistence and running slogans, mobile controls, and one mixed reinforcement wave at 80 chai.
- The natural seeded 1,000m route still earns its pickup total plus exactly 100 bonus chai, and retry/reveal/reload do not duplicate the reward.
- Software-rendered Chrome made three long navigation scenarios exceed their earlier 45-second test limit; these now have a scoped 90-second limit. The chant test now waits for rendering without advancing past its first visibility window. Final targeted checks passed without changing game behavior to bypass the tests.
- All **3 production browser checks** pass: nested-path asset loading (including all four portraits), no developer hooks, offline continuation after load, unavailable-WebGL fallback, and graphics-context recovery.
- Production assets after cartoon restyle: JS **596.66 kB / 158.98 kB gzip**, CSS **37.20 kB / 9.30 kB gzip**, four portraits **106.37 kB** total. Portraits use local hashed URLs.
- Actual desktop/mobile screenshots were inspected, including avatar selection, the issue screen, running speech bubbles, mixed reinforcements, and the victory reward. Physical-phone performance is not claimed.

## Earlier verified parody and crowd baseline — 14 October 2026

Added six free public-figure caricatures with original SVG portraits and animated 3D models, three named individual pursuers, and two extreme clothing-inspired crowd modes. The larger roadside gathering and pursuing crowds use instancing with quality-based counts. Earlier saves retain existing progress and default to Mobi ji if no pursuer was selected.

Added distinct catch endings and a 1,000-metre victory with a one-time 100-token bonus and a fictional behind-bars meme reveal. The final build passes 126 unit tests across 14 files, strict TypeScript, ESLint, Prettier, and production compilation. All 24 browser tests pass (3.1 minutes), including the six free runners, five pursuer choices, crowd modes, each custom catch ending, and the full 1,000-metre victory path. That genuine seeded run collected 90 tokens and banked exactly 190 after the bonus; repeated reveal, retry, and reload preserved the total. Desktop/mobile victory screenshots were visually inspected. All three production checks pass (21.3 seconds): subpath loading with no developer hooks, offline play after load, unsupported-WebGL fallback, and graphics-context recovery. The production JS is 585.63 kB / 155.39 kB gzip; CSS is 29.20 kB / 7.67 kB gzip. Public-photo sources and fiction context are documented in [CHARACTER_REFERENCES.md](docs/CHARACTER_REFERENCES.md).

The requested local preview remains available on port 4173. The sections below preserve the original MVP validation baseline.

## Original MVP milestones

| #   | Milestone                | Result and evidence                                                                                                                                                                            |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Bootstrap                | Vite, strict TypeScript, Three.js, ESLint, Prettier, Vitest, Playwright. Installation and local dev startup verified; actual WebGL canvas inspected.                                           |
| 2   | Menus and locations      | Main menu and all 3 typed, distinct procedural locations. Locked/selected states, miniature previews and responsive cards verified in browser.                                                 |
| 3   | Protest introduction     | Seeded crowd, configurable Hindi slogan, one-shot reaction, crowd meter, police entrance, camera transition and skip. Unit and browser tests pass.                                             |
| 4   | Runner mechanics         | Lane switching, jump/gravity/buffer, timed slide, keyboard and mobile swipes/buttons, pause/resume and reset. Unit and actual browser input tests pass.                                        |
| 5   | Track and collectibles   | 7 obstacle types, bounded pools, recycled scenery, safe procedural rows, token trails and exactly-once collection. Generation and extended simulation verified.                                |
| 6   | Chase and score          | Pursuit pressure/recovery, invulnerability, collision feedback, scoring/combo, game-over/retry and idempotent banking. Natural-collision browser flow passes.                                  |
| 7   | Characters               | 4 procedural cosmetic characters, confirmed purchases, insufficient-funds feedback, persistent selection and idempotent spending. Unit/browser checks pass.                                    |
| 8   | Saves and settings       | Versioned validation, protected unread/newer saves, quota/security error handling, local reset confirmation, persistent audio/motion/quality settings. Unit/browser checks pass.               |
| 9   | Polish and accessibility | Original synth effects/music, master mute/volume, particles, focus indicators/dialog trapping, reduced motion, loading/error messages, context-loss recovery. Production recovery checks pass. |
| 10  | Performance              | Pixel ratio/quality caps, batching, limited dynamic lighting, pools, distant crowd batching and hidden-tab pause. Draw calls reduced 42% menu / 33% gameplay; see performance notes.           |
| 11  | Automated tests          | 70 unit tests, clean full 17-case E2E suite, and 3 production browser checks passed.                                                                                                           |
| 12  | CI                       | GitHub Actions configured for Node 22, npm ci, types, lint, unit tests, build, installed Chromium, E2E and production smoke tests. Remote execution requires pushing to GitHub.                |
| 13  | Deployment preparation   | Production dist, MIT and third-party notices, screenshots, exact Vercel/default and GitHub Pages/alternative instructions prepared. Public publishing requires hosting/repository setup.       |

## Original MVP checks

- `npm install`: completed; dependency audit after updating test/lint tooling reported **0 vulnerabilities**.
- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**.
- `npm run test`: **70 passed**, 10 test files.
- `npm run build`: **passed**, 47 modules; `dist/` about 580 KiB. Main JS 554.18 kB / 144.93 kB gzip; CSS 22.67 kB / 6.21 kB gzip.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=1`: **17 passed, 0 failed, exit 0**, 3.7 minutes. Default configuration now also uses one worker, matching this verified run.
- `PLAYWRIGHT_CHANNEL=chrome npm run test:release`: **3 passed, exit 0**, 18.8 seconds. Verified subpath loading, absence of developer cheats, offline play after load, unsupported-WebGL fallback and actual context-loss/recovery.
- Production bundle scan: no `__DILLI_TEST__`, `grantCoins`, `unlockAll` or `TestHarness` symbols.
- `npx prettier --check .` and `git diff --check`: **passed** before final documentation updates; final documentation/config formatting checked separately.
- No uncaught JavaScript errors in the final E2E flow.
- Four final desktop/mobile screenshots saved under `docs/screenshots/` and visually inspected.

Earlier selector failures, source-reload interruptions and parallel software-renderer teardown timeouts were resolved. The final complete serial run was clean.

## Performance evidence

A standalone browser simulation ran 72,000 fixed steps / 20 simulated minutes / 28.8 km: 895 rows, 1,076 unique collection callbacks and zero duplicates. Allocations stayed within configured limits (35 obstacles + 20 coins observed), reset released active instances, and disposal emptied the isolated scene. Unit tests cover 12,000 seeded rows and 10,000 pool reuse cycles.

See [docs/PERFORMANCE.md](docs/PERFORMANCE.md) for named environment, draw-call counts, software-rendered timing samples and their limits. No physical-device frame rate is claimed.

## Environment and repository

- Local validation: macOS 26.6.2 arm64, Node 25.5.0, npm 11.8.0, Chrome 155.0.8059.40 with SwiftShader for browser automation.
- Supported toolchain: Node 22.13+ in the 22 LTS line or Node 24+; `.nvmrc` and CI use Node 22.
- Vite 7.3.7, Three.js 0.180.0, Vitest 4.1.11; exact dependencies locked in package-lock.json.
- Existing workspace was empty; no user files/history overwritten.
- Git initialized with no existing commits. No author identity was configured; none was invented and no commits were made.
- Temporary preview/test servers and automated browsers were stopped after verification.

## Known limitations / remaining work

- **No known critical bug in tested flows.** Physical mid-range Android, hardware-accelerated GPU, Safari and Firefox testing remains.
- Code-built low-poly 3D models, SVG artwork, four AI-generated avatar portraits, and synthesized placeholder music/effects; no recorded voices.
- Browser-local saves, no cloud recovery or synchronization. A running loaded game works offline; cold offline launch/reload is not supported because no service worker is installed.
- Public Vercel/GitHub Pages publishing, custom domains and remote CI execution require account/repository setup and remain unverified.

Next recommended improvements: physical-device profiling and tuning; installable offline/PWA support; richer animation and original audio/content variation.
