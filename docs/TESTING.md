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
