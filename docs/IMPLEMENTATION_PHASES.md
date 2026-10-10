# GLSL Lab — implementation phases and gates

Status: implementation roadmap, not a completed feature checklist.

## Visual contract: absolute custody rule
The approved visual design image stays **outside GitHub**. Never commit the image, derivative, thumbnail, converted raster, embedded base64, or recreation of that image to any branch, documentation, release, issue, or GitHub Actions artifact. It is a visual acceptance reference in the conversation only. This document records independently written functional requirements, not a copy of the image.

The intended app includes desktop project navigation, shader preview, visual node graph and node properties, build validation, generated GLSL, build metadata, references, academic-paper preview and export, plus mobile-first preview and touch controls.

## Overall workflow
Open or create project → select a demo or build a graph → manipulate shader parameters → compile/link/draw in WebGL2 → freeze a reproducible build receipt → unlock Generate Academic Paper → produce a well-formatted evidence-grounded research draft → review claims/references/figures → export the research bundle.

The 17 original demo expressions remain immutable and credited to @YoheiNishitsuji. Imported compressed GLSL is not silently reverse-engineered into visual nodes: unsupported operations remain available in the source editor.

## P0 — Foundational correctness (baseline)
Ensure 24 fast tests and all 3 Chromium mobile/GPU checks pass, restore successful actual shader compilation, and keep the GitHub Pages deployment healthy. Existing editor, all 17 demos, record/export tools, and visual behavior cannot regress.

Exit: green CI, GitHub Pages deployed, and separate device-based visual review where CI cannot prove GPU visual fidelity.

## P1 — Project model and immutable build receipts
Introduce versioned project data, local-first persistence and JSON import/export. After a genuinely successful WebGL2 compile + link + draw + error check, snapshot original shader source, expanded shader, provenance, graph or demo ID, control parameters, render dimensions, shader time, measured compile CPU time if available, timestamps, errors, and SHA-256 content digest. A failed build can never mint a success receipt; a screenshot is optional and labeled as an observation.

Exit: validated receipt schema, deterministic content identifiers, negative/roundtrip tests, no invented metadata and no loss of the original editor.

## P2 — Actual visual node editor
Connect tested typed graph operations to the Lab user interface: Coordinates, Rotate, Radius, Wave, Palette and Output. Add visual editing and property controls, typed edges, add/delete, mobile touch and keyboard input, graph serialization, undo/redo, import/export and deterministic GLSL compilation. Do not assume existing minified demos can be converted back into graphs.

Exit: edit → generate GLSL → compile → render test passes in Chromium and on an actual mobile browser; unsupported edges/cycles rejected; undo/redo reproduces exact states.

## P3 — Research measurements and reproducibility
Create observation capture independent from interpretation: repeatable frame sampling, frame timestamps, resolution/precision metadata, visualization images with captions, optional computational metrics with fully documented definitions, shader/source hashing and comparisons across runs. Absence of a measurement must remain absence, not zero.

Exit: every measured statement in a report traces to an observed or reproducible computed value; comparisons disclose run conditions and variance; source and figure integrity verifiable.

## P4 — Academic paper generation
Place the prominent Generate Academic Paper button in the successful-build state, disabled before verified build evidence. Generate an editable scholarly **draft**, never an automatic publication claim. Sections: title and researcher-supplied authors, abstract, keywords, background with claim-relevant verified citations, methodology, shader equations/code, parameters, measured results, figures/tables, discussion, limitations, reproducibility statement, conclusion, references, appendices. Use general JCGT / ACM SIGGRAPH-style academic formatting; do not copy a journal's assets or templates without a verified license.

Export HTML and PDF, source GLSL, receipt JSON, figures, bibliography (BibTeX), plus a manifest of file hashes. Every claim has a type: observed, computed, cited, researcher annotated, hypothesis or missing. No fabricated authors, DOIs, experiments, novelty, numerical statistics or peer-review status. Citation metadata is curated and source-checked.

Exit: ineligible builds never unlock the action, source/figure citations and manuscript evidence links audit cleanly, missing results are explicitly disclosed, and PDF passes text/layout/reference inspection.

## P5 — First-class application release
Unify Projects, Demos, Builder, Papers, References, Export and Settings. Desktop multipanel workspace and mobile preview-first drawers share one project model. Add save/recovery, contextual error handling, offline/local-first storage, dependable export, accessibility, performance limits, shader context recovery and stable schema migrations.

Exit: restore/save/export tests, mobile UI accessibility tests, renderer-failure recovery, measured performance budgets, complete reproducibility bundle, and design review against the **off-repository** comp.

## P6 — Controlled scientific extensions
Experiments across repeated runs and parameter matrices, uncertainty/calibration, formal comparison tables, reference imports and publishing workflows. No publication submission occurs without explicit user action.

## Delivery order
P0 → P1 → P2. P3 can be developed alongside P2 after P1 receipts exist. P4 layout can be mocked using conspicuously labeled fixtures but not enabled for live publication until P3 evidence gates pass. P5 and P6 depend on prior gates.

## Phase-gate matrix
- G0: original 17 shader hashes, three Lab preset hashes, and UI controls unchanged.
- G1: validate successful/failed build receipts, canonical JSON, SHA-256, import/export and timestamp separation.
- G2: graph construction, typed edges, undo/redo, deterministic code and real rendering.
- G3: measured-data provenance, frames and reproducible computations.
- G4: bibliography claim match, actual reference metadata, draft watermark, academic manuscript export.
- G5: mobile/desktop parity, persistence, accessibility, context loss and performance.

All gates record PASS, FAIL or NOT_TESTED. A skipped GPU test cannot count as PASS.

## Confirmed bibliographic starting points (not automatic blanket citations)
- Khronos Group (2016), The OpenGL ES Shading Language, Version 3.00, Revision 6: https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
- Perlin, K. (1985), An image synthesizer, SIGGRAPH '85: https://doi.org/10.1145/325334.325247
- Worley, S. (1996), A cellular texture basis function, SIGGRAPH '96: https://doi.org/10.1145/237170.237267
- Moreland, K. (2009), Diverging color maps for scientific visualization, ISVC 2009: https://doi.org/10.1007/978-3-642-10520-3_9
- Journal of Computer Graphics Techniques, author guidelines: https://jcgt.org/write.html

These references have useful bibliographic metadata. A manuscript must cite only the works whose ideas or specification actually support its claims. No appearance-based inference that a particular source algorithm was used.

## P1 checkpoint — connected implementation

Browser Lab now captures validated WebGL shader states through an in-page bridge and saves content-hashed build receipts locally via src/lab-projects.mjs and src/project-store.mjs. Project JSON roundtrips, receipt SHA validation, tamper rejection and negative GPU paths have new tests. Cloud storage, multi-project workspace navigation, frame images and research metrics are still future P1/P3 work. Paper creation remains disabled until evidence and citation gates are implemented. This checkpoint is not a P1 completion claim.


## P2 progress checkpoint — connected graph MVP

The working Lab Build tab now supports typed operation cards, automatic connections in a linear graph, numeric control of each operation, compatible reordering, optional node addition/removal, one-gesture slider history, undo/redo, graph JSON import/export, live generated GLSL inspection, WebGL2 compilation on demand, and project persistence with reproducible P1 build receipt capture. The archived demos retain separate attribution; authored graphs are marked user-authored.

This checkpoint does not yet satisfy the entire freeform P2 phase: explicit manually routed edges, branching, larger operation types, keyboard node-reordering alternatives beyond accessible buttons, and extended visual authoring studies remain. The node graph explicitly rejects cycles, disconnected nodes and mismatched types.

## P2 advanced wiring checkpoint

Graph version 2 introduces a typed directed acyclic graph with real branches, explicit per-port source controls, nine operation types, scroll/zoom node workspace, pointer-based movement, accessible position nudge controls, auto-layout, undo/redo, import/export, and code emission. Node output types and inputs are validated before GLSL generation; incomplete/unreachable drafts cannot mint verified WebGL build receipts. Projects preserve v1 or v2 schemas, and SHA-256 receipts include the original v2 graph plus exact generated source. The visual design image remains excluded from GitHub history and artifacts. This advances P2 but does not yet add draggable wire endpoints, generic code-to-graph parsing, reusable subgraphs, or advanced research capture.


## P3 observed pixel sampling checkpoint

The implemented P3 foundation records actual WebGL2 RGBA8 center-point samples after verified shader compilation, link and draw. Source identity and optional graph version/structure are fixed in the linked SHA-256 shader build receipt. The sampled pixel bytes, explicitly defined metrics, record hashes, sample reconstruction, and matching build receipts can be audited and exported.

For framebuffer width W and height H, grid columns C=min(32,W), rows R=min(24,H), sample coordinates are x=floor((i+0.5)W/C) and y=floor((j+0.5)H/R), WebGL origin bottom-left. Y-prime = 0.2126R + 0.7152G + 0.0722B on the encoded 8-bit channel values. Population moments, 16 histogram bins of width 16, and clipped-channel/alpha fractions use C×R sample points only.

The sampling method deliberately does not support conclusions about unsampled pixels, the full image, physical luminance, GPU timing, or research significance. Remaining P3 gates: capture/hash full-resolution lossless figures, link figures to research receipts, controlled repetitions with conditions and uncertainties, and produce a research bundle that can independently reproduce every displayed result.


## P3 lossless figure and controlled-comparison checkpoint

A separate research-figures module now constructs standards-conformant, lossless RGBA8 PNG images directly from complete WebGL readPixels buffers. All observed framebuffer pixels are included, vertically oriented for PNG, independently hashed and linked to their immutable build receipt and sample record. The ZIP manifest stores figure SHA-256, raw RGBA byte SHA-256, PNG SHA-256, full-frame metrics, frame dimensions, GLSL shader time, UTC capture timestamp and validated provenance.

A controlled three-frame action collects three distinct draw submissions with unchanged source/parameters/viewport and produces per-pair **descriptive** absolute RGB8 differences and changed-pixel fractions. It accepts repeated identical frames as independent *draw observations*, but does not claim statistically independent experimental trials. The record verifies deterministic figure contents and series results before archival ZIP creation. ZIP files are downloaded locally, and image bytes do not persist through browser reload.

Remaining P3 science gates include deliberately controlled parameter sweeps, explicitly reported graphics platform/software precision, repeatability under independent sessions, variance/uncertainty treatment appropriate to the design, and independent source/citation verification. P4 academic-paper generation is still disabled; it must not treat these descriptive comparisons as hypothesis-test significance or novelty.

The GPU readback bridge now attaches a real UTC timestamp at synchronous pixel acquisition and the incrementing successful draw identifier. These fields are carried into each figure record and the series manifest; controlled series verifies strictly increasing draw IDs and nondecreasing shader time. Timestamps do not include deferred PNG processing time.

## P3 fixed-shader-time treatment capture milestone

The versioned research-experiments module specifies five baseline controls, one render-affecting varied parameter, a positive step, three fixed treatment values and constant GLSL time. Capture records preserve every RGBA8 pixel, original shader/graph, per-treatment uniforms, frame dimensions, timestamps, GPU draw IDs, lossless PNG hashes and verified build receipts.

The portable archive includes full pixel bytes; the importer replays hashing, sampled metrics and lossless figure reconstruction before accepting it. Cross-session comparisons align only equal protocol settings and matching source, graph, viewport and runtime labels. CPU compilation wall-time is excluded from shader identity because it is not stable between browser sessions.

The analysis remains descriptive: one observed GPU draw per condition, no randomized order, no within-treatment replicates, no calibrated GPU runtime measurement and no evidence of independent hardware. Future P3 work must introduce repeated and randomized/counterbalanced trials, device metadata, experimental uncertainty and manifest versioning before stronger causal or statistical claims.

## P3 counterbalanced repeated-observation checkpoint

A versioned replicated protocol uses the existing fixed-time three-level treatments and adds three positional counterbalance blocks containing nine ordered real WebGL readbacks. This gives three observed frames per treatment and places each treatment exactly once in each within-block serial position. The schedule is a deterministic cyclic Latin-square ordering, *not* randomized and not balanced for all immediate predecessor effects. A phase offset (0, 1 or 2) is recorded in the protocol.

A separately hashed, bounded platform envelope retains WebGL2/GLSL version, browser-reported vendor and renderer, maximum texture/renderbuffer limits, fragment highp precision, vertex attributes and display pixel ratio. No unmasked vendor extension or device identifiers are collected; the envelope is not proof of identical hardware or of a stable GPU execution environment.

Each of nine archived trials contains all framebuffer RGBA8 bytes, immutable build provenance, sampled pixel metrics, lossless PNG provenance, exact treatment assignments, chronological observation timestamp and strictly increasing GPU draw identifier. Session verification rebuilds every PNG and recomputes per-condition full-frame encoded-luma mean, sample SD and range. The 180,000-pixel per-frame bound limits memory costs. A portable ZIP contains all nine PNGs and the verified raw-evidence session JSON.

Cross-session comparison requires identical protocol, shader, graph, viewport and reported graphics capabilities; output remains descriptive differences of means and observed dispersion. It does not claim randomization, independent replicates, controlled GPU driver identity, statistical significance or PhD-level manuscript sufficiency. Next gates should add independent acquisition sessions, power/method rationale, hardware calibration where possible, bibliography validation and manuscript-layout QA.

## P4 citation and methods audit checkpoint

Reference custody is represented by `src/reference-registry.mjs`: metadata-source URLs, official standards / journal / conference categories, DOI matching, claim scope, review timestamps, duplicate checks and quarantined entries. A metadata-verified source is *eligible for relevant citation*, not accepted as peer review of this project's observations. See `docs/REFERENCES.md` for the source-by-source status.

The `src/methodology-audit.mjs` preflight accepts versioned 3-point and 9-frame study exports only. It invokes the underlying full-archive verifiers before producing an independently content-addressed methods screen. Findings classify hash provenance, capture counts, experimental ordering, claimed replication, platform calibration, uncertainty model, related-work adequacy, peer review and novelty. Unsupported claims remain expressly missing. The app can export metadata-checked BibTeX and a JSON audit bundle, while the academic manuscript button remains disabled.

To advance: reconcile pending sources against publishers, review full relevant papers and technical specifications at the passage level, establish explicit author/reviewer credentials and attestations, complete technical report layout/figure referencing, and verify rendered PDF/HTML and bibliography against source receipts. No unsupported authority or scientific novelty claims may be automated.

## P4 research manuscript draft implementation

A bounded manuscript engine consumes a source-native verified study plus its cryptographically verified methodology audit. It calculates treatment table values directly from the archived figure metrics (n=1 or n=3 per treatment), preserves original shader identifier/attribution, applies deterministic first-archived-frame selection per treatment, and requires eligible source-scoped standards and methodology citations. No pending reference may be silently promoted to bibliographic authority.

The renderer produces a static print-ready HTML article with paragraph, equation, table, figure, bibliography and source-appendix sections. The portable artifact bundle contains every original lossless PNG, experiment with full RGBA pixel bytes, audit JSON, exact GLSL, bibliography and file-level SHA-256 manifest. It also provides browser Print / Save as PDF via native print controls; direct PDF binary creation, author/reviewer signoff, external full-text literature review, independent hardware calibration and inferential support are **not** implemented.

The Generate Research Draft button unlocks only after an exported experiment has passed the complete methodology audit. Imported corrupt research data clears the active audit and re-locks all manuscript export controls. Every exported manuscript is labeled as an unreviewed technical research draft. New tests verify paper content derivation, bibliography applicability, malicious GLSL escaping, figure and archive integrity, and the fail-closed release boundary.

## P5 — Direct manuscript PDF and editorial packet

A dependency-free, client-side PDF 1.4 writer consumes the verified manuscript and archives. It embeds original GPU-derived figure pixel content directly as RGB image XObjects, paginates A4 vector text/tables/sections, and preserves the specific shader attribution and source references without impersonating the paper's author. Neither print dialogs nor third-party network/CDN requests are required. The complete evidence ZIP gains a direct PDF and SHA-linked unsigned human-review packet.

The independent Poppler render check is an additional quality gate. PDF parser acceptance and visual page proof are recorded separately; rendering a PDF does not establish journal acceptance, calibrated math typography or independent peer review. The reviewer packet preserves explicit incomplete tasks, including primary-text passage verification, source rights, repeatability, graphics calibration, statistical assumptions, originality evaluation and independent scientific/editorial signoff. The application cannot automatically mark peer review passed.

Remaining P5 steps include complete literature appraisal and author rights review, venue-specific formatting, review signatures by identifiable humans, non-ASCII font embedding, long-code appendix wrapping and QA on multiple authentic mobile/desktop studies.

## P6 — Portable offline research bundle verification

The export is no longer a terminal artifact: the Lab reimports the manuscript ZIP as an untrusted bounded stored-ZIP container, validates its local headers/CRC/central directory and refuses duplicate or unsafe paths. The archive then supplies a frozen experiment and methodology report. The import process independently re-runs the full research verification, manuscript assembly, PNG generation, PDF generation, bibliography and reviewer packet and compares the **entire regenerated ZIP byte-for-byte**. The downloadable machine-verification receipt contains original study, audit and manuscript hashes, exact figure counts and no publication-approval claim.

A companion Node.js 22+ CLI implements the same verification with nonzero process exit on failure. Both routes have regression coverage for three-frame and nine-frame studies, forged approval state and corrupted bytes; the Chromium manuscript scenario imports and deliberately corrupts a real WebGL-derived export. Full research semantics, citation scopes and versioning limitations are documented in `docs/REPRODUCIBILITY.md`.

Replaying an internally consistent archive does not establish its original hardware or scientific authorship. Authenticity requires independently accountable signatures/observers, documented acquisition environment and independent review. The approved visual reference never belongs in Git history.
