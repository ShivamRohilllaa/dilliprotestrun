# Performance observations

Measured on 14 October 2026. These checks establish bounded simulation resources and reduce rendering work; they do not establish a frame-rate claim for an ordinary GPU or an Android phone.

## Resource lifetime

A standalone TrackManager browser simulation executed 72,000 fixed steps at 24 m/s: 20 simulated minutes, 28.8 km, and 895 generated rows. It observed 1,076 token collection callbacks with zero duplicate IDs. Allocations reached 35 obstacle instances and 20 token instances, within configured caps of 84 and 48. At the end, 6 obstacles and 16 tokens were active. Reset released all active objects while preserving reusable pools; disposal left no objects in the isolated test scene.

Unit tests additionally cover 12,000 seeded patterns, 1,001 difficulty samples, and 10,000 object-pool recycle cycles. Browser tests follow 20 consecutive safe lanes and check the exact generated coin total.

## Original MVP rendering baseline

Named test environment: macOS 26.6.2, arm64, headless Google Chrome 155.0.8059.40, ANGLE SwiftShader **software rendering**, 1280 × 900 viewport. One browser ran at a time for the final comparison.

| Scene     | Before draw calls | After draw calls | Reduction | Final triangles |
| --------- | ----------------: | ---------------: | --------: | --------------: |
| Main menu |               704 |              407 |       42% |          40,624 |
| Gameplay  |               467 |              312 |       33% |          35,192 |

Changes batch static character bodies and individual limb meshes by material, use one textured material per sign, and batch static environment geometry while preserving independently recycled segment groups.

A short final sample of 36 requestAnimationFrame intervals averaged 88.9 ms for the menu, 88.4 ms for medium gameplay, and 76.4 ms for low gameplay (about 11.3, 11.3, and 13.1 frames/s respectively). CPU-based SwiftShader, screenshot capture, and short samples make these noisy test-environment observations. They are **not** hardware-accelerated desktop or phone performance results.

## Runtime controls and remaining work

Low quality uses pixel ratio at most 1 and disables dynamic shadows. Medium caps pixel ratio at 1.35; High caps it at the configurable 1.75 and uses a larger shadow map. The scene has one shadow-casting directional light. Distant crowd members and scenery are batched, repeated hazards and tokens are pooled, and tab hiding pauses gameplay and skips rendering work. HUD text refreshes at roughly 10 Hz rather than every rendered frame.

Before broad publication, profile actual mid-range Android hardware and hardware-accelerated Safari/Firefox. If needed, reduce static scenery material variety, visible segment count, and nearby animated crowd count. These are quality adjustments and do not require changing physics, scoring, saves, or generation rules.

## Parody and crowd expansion

Roadside spectators now use 60/80/110 participants at low/medium/high quality, plus four per additional location-difficulty level (up to 118). Only 6/8/10 use individual animation rigs; the rest use instanced geometry. Anonymous spectators use only the four original character styles.

Extreme pursuits add 24/36/50 animated generic characters in exactly three instanced batches, without individual shadow casting. High quality geometry totals 35,600 triangles for the Bajrang-inspired squad and 34,400 for the RSS-inspired squad. A local warm Node benchmark of 1,000 high-quality transform updates averaged approximately 0.09 ms per update. This is CPU matrix work only; it does not measure browser/GPU frame rate.

Fifteen focused crowd tests cover deterministic placement, quality counts, lane clearance for spectators, animation and reduced motion, pressure following, bounded instance counts, resets, and disposal without invalidating shared assets. Desktop and mobile browser tests additionally exercise both extreme modes, retry, pause, and switching back to a single pursuer.

## Four-avatar and late reinforcement update

At 80 collected chai, mixed reinforcements use 36/54/72 characters for low/medium/high quality. Both clothing styles share three instanced batches. The wave replaces an existing squad or joins an individual pursuer; it does not stack a second set of crowd batches. Focused tests check style changes, counts, quality changes and bounded animation allocation.

Four 640 × 640 reference-based generated selection portraits add 213.85 kB (about 209 KiB) of bundled WebP images. They are loaded on the avatar screen, and use the site's own hashed asset URLs. The 3D gameplay models still use procedural geometry, without photo textures. No physical-phone frame-rate claim is made for this update.
