# GLSL Lab test plan and promotion gates

The suite has two lanes so the mobile Lab can progress toward a visual expression builder without destabilizing the working 17-demo shader editor.

## Commands

- Fast, zero-install checks: npm run test:fast (Node 22 or newer).
- Mobile-browser checks: npm install; npx playwright install chromium; npm run test:browser.
- Both suites: npm run test:all.

GitHub Actions runs the fast lane on pushes to main, pull requests, and manual dispatch. It attempts the browser lane once the fast tests succeed.

## Gates

G0 — Original source preservation: 17 shader fixtures have locked fingerprints; all three Lab presets must match the classic editor exactly.

G1 — UI contract: classic to Lab navigation, mobile viewport, two tabs, five controls, authorship, PNG/record controls.

G2 — Runtime interactions: deterministic mocked WebGL2 checks actual page script execution, uniforms on slider events without recompiles, presets recompile, reset, pause and tabs.

G3 — Real browser: Playwright on mobile-sized Chromium, DOM navigation, mobile overflow, WebGL2 compile when supported, live uniform edits, PNG export. The GPU-specific test is marked skipped if the CI runner has no WebGL2 context; a skip is not proof of successful shader compilation.

G4 — Future expression builder: src/expression-graph.mjs is a tested, versioned, typed graph core. Nodes are coordinates, rotate, radius, wave and palette. Tests cover deterministic generation, JSON roundtrips, schema constraints, cycles, unsafe identifiers, invalid values, disconnected graphs and type mismatches. It is not yet connected to the visual Lab editor, and it does not reverse-parse compact GLSL.

## Promotion sequence

1. Write a failing test for the next graph operation or UI behavior.
2. Implement the smallest supported feature, leaving all original demos immutable.
3. Run the fast lane, browser smoke for UI/GPU changes, and check Actions.
4. Verify output on a real mobile WebGL2 device before claiming visual fidelity.
5. Extend graphs toward add/remove nodes, valid edges, undo/redo, import/export, and GLSL compilation from block graphs.

For intentional edits to existing shader expressions, update the locked fingerprints with documented reasoning. Do not treat mocked runtime tests as real GPU evidence.

G5 — Scholarly build receipt foundation: strict P1 compile/link/draw gating, content-addressed identifiers, tamper-detection and repeatable canonical serialization (see tests/build-evidence.test.mjs). The receipt module is not yet connected to the WebGL UI.
G6 — Image custody: test that the approved off-repository visual design image/derivatives do not enter tracked project directories. The protected comp must not be packaged into any deployment or publication.

G7 — P1 integrated local persistence: save/load/versioned project JSON, restore sliders and demo, verified SHA-256 receipts, corrupted-store rejection, and a mobile browser save/export/reload scenario. A recorded successful build is invalidated on edits, failures or context loss. Paper generation stays gated.


G8 — P2 build stack: immutable graph editing, insert/remove, automatic typed reconnection, safe parameter mutation, same-type reordering, undo/redo, export/import, project persistence, mobile Build tab, real browser generated GLSL compilation and P1 receipt eligibility. This is a sequential typed graph, not yet a freeform wiring canvas.

G9 — P2 advanced branched workspace: validate graph v2 inputs and output, reject cycles and type mismatches, enforce unused-node/required-port build gates, preserve touch/keyboard layout and undo/redo, import/export v2 graphs, compile generated GLSL in the real browser, and keep full graph + source agreement inside hashed build receipts. Verify v1 projects still restore and archived shader fixtures remain unchanged.


G10 — P3 GPU research samples: center-point pixel selection, known-color metric fixtures, reproducible hash linkage to validated shader receipts, tamper detection, stored-sample reanalysis, Chromium GPU readback, research JSON export and reload. Do not promote sample statistics into full-frame claims. Independent gates are required for lossless full-resolution figures and controlled longitudinal analysis.


G11 — Full-frame figures: pixel-for-pixel RGBA8 losslessness, correct vertical origin, PNG IHDR/CRC and decompression fixture, SHA-256 linkage to immutable build and sampled capture, tampered pixel/PNG rejection, manifest ZIP file checksums, and actual Chromium download.
G12 — Controlled observed series: distinct verified draw submissions, identical shader/graph/parameters/viewport, ordered observation times, repeatable comparison calculations and rejection of altered series. Identical images remain valid frame observations; claims remain strictly descriptive. Actual browser tests must exercise full-resolution capture and repeated observation.

G13 -- controlled fixed-time experiments: three predetermined treatment levels, one varied render parameter, three real frame captures, consistent shader source and viewport, source/pixel/PNG hashes, archived full RGBA8 JSON and PNG ZIP, imported-study verification, fail-closed settings mismatch, and descriptive cross-session comparisons. Chromium must actually compile and render the shader. Do not infer statistical significance or hardware independence.

G14 -- nine-frame counterbalanced protocol: three levels x three blocks, exact serial position balance, fixed shader time, nine real RGBA8 GPU readbacks, immutable source/figure/sample receipts, strict ordered draw identifiers, bounded API-reported platform capability metadata, deterministic per-treatment mean/sample SD/range reproduction, fail-closed scheduling and hash tamper tests, JSON plus nine lossless PNG ZIP, and between-session descriptive comparison with platform-equality checks. No unmasked GPU data, randomized-trial claims or significance testing.

G15 — bibliography and methodology gate: official/peer-reviewed source metadata, duplicate/DOI and claim-scope validation, secondary-only citation quarantine, BibTeX export limited to eligible sources, complete-study revalidation before method-audit export, manuscript readiness permanently locked without independent review, altered audit and altered research record rejection, and Chromium bibliography/download/invalid-study behavior.

G16 -- scholarly draft renderer and artifact bundle: trigger only after complete methodology audit; descriptive source-aligned abstract, introduction, methods, equations, results, limitations and references; exact shader attribution and GLSL appendix; representative figures and all full-resolution PNG supplements; number of observations controls allowable SD; scoped bibliography excludes pending metadata; all attached sources retain SHA-256 hashes. Reject altered study, bibliography, manuscript release state, and figure pixels. Escape source GLSL/metadata in HTML. Browser test import audited GPU study, generate article, preview, export self-contained HTML and verifiable ZIP, and verify PDF-print availability without asserting a PDF file was generated.

G17 — Direct PDF: previously verified manuscript only; real A4 PDF header, catalog/pages/xref/fonts and embedded real framebuffer images; language, attribution, equations and data values from source receipts; tamper/fabrication rejection; Poppler independent parse, text extraction and page raster check; review visually to prevent heading-rule collisions or clipped images. ZIP includes PDF/review packet with SHA-256 manifest.
G18 — Human-review handoff: reviewer name/signature and source passage validation remain genuinely pending; no automatic claim of human review, authorship, original science or publication status; bibliography source quarantine remains; changes to an unsigned packet fail a provenance check. The approved visual contract never enters git.
