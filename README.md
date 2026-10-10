# MiniWrapper

A **single-file browser wrapper** for compact GLSL fragment-shader expressions. Open `index.html` in a browser with **WebGL2** enabled; the supplied demos are preloaded in the selector and render automatically. No build system, external libraries, accounts, or server are required.

## GLSL Lab (mobile-first Play prototype)

[Open GLSL Lab](glsl-lab.html) from the button at the top of the classic editor, or open [the dedicated page](glsl-lab.html) directly. The Lab is a separate static HTML page so the 17-demo classic editor and its video recording remain unchanged.

The **Play** panel currently supports three source demos (Original field, Rotating 3D fractal, Log-polar bloom), all credited to **@YoheiNishitsuji**. Its five real-time controls are Shape size (zoom), Turn the view (orientation), Movement speed (time), Color shift (HSV hue), and Brightness (HSV value). The controls update WebGL2 uniforms without recompiling the shader; changing the selected demo compiles that demo once.

The preview stays visible while scrolling on small screens. **Understand · Code** shows the unchanged compact GLSL expression and the currently applied parameter values. Pause, restart, reset controls, copy expression, and Save PNG are available. This is an intentionally limited **Play prototype**, not a claim that arbitrary GLSL can be automatically converted into draggable blocks. The other 14 demos, custom shader authoring, and native video export remain in the classic editor.

This page uses plain HTML/CSS/JavaScript with no build step or dependency. GitHub Pages serves it at `/MiniWrapper/glsl-lab.html`.

## Run

1. Open [`index.html`](index.html) directly in a current desktop or mobile browser with WebGL2 support.
2. Pick a demo from **Demos** or edit/replace the shader **body** in the textbox.
3. Select **Render** (or Ctrl/Command + Enter). Use **Pause**, **Resume**, **Reset time**, and **Resolution** as needed.
4. Use **Download PNG** for a still frame or **Record video** to capture an animation when the browser supports native canvas recording.

The app compiles the textbox text into a GLSL ES 3.00 fragment shader, draws a full-screen quad, updates time every frame, and reports compile/link errors directly below the editor. If WebGL2 is unavailable, it reports that instead of crashing.

## Included demos

All **17 supplied shader demos** are credited to **@YoheiNishitsuji**. MiniWrapper preserves the supplied compact expressions verbatim in the demo selector, with compatibility initialization applied only when compiling. Demos 4–17 are the additional snippets from the October 2026 batch.

### 1. Original field (@YoheiNishitsuji)

```glsl
float i,e,R,s;vec3 q,p,d=vec3(FC.xy/r*.4-vec2(.2,-.8),1);for(q.zy--;i++<70.;){o.rgb+=hsv(.59,R,min(e*s-.15,1.)/40.);s=4.;p=q+=d*e*R*.3;p=vec3(log(R=length(p*1.3)),exp2(-p.z/R),atan(p.y,p.x)*s-t*.3);for(e=--p.y;s<1e3;s+=s)e+=sin(dot(cos(p*s),sin(p.xyx*s+t*.9)))/s*.5;}
```

### 2. Rotating 3D fractal (@YoheiNishitsuji)

```glsl
for(float i,g,e,s;++i<99.;o.rgb+=.01-hsv(.1,g*.016-e*.3,s/2e2)){vec3 p=vec3((FC.xy-.5*r)/r.y*5.+vec2(0,9),g)*rotate3D(-1.1-cos(t*.15)*.1,vec3(1,11.+sin(t)*.15,-1.5));s=2.;for(int i;i++<19;p=vec3(.08,4,-1)-abs(abs(p)*e-vec3(3,4,3)))s*=e=7.1/dot(p,p*.51);g+=p.y/s;s=log2(s)/exp(e);}
```

### 3. Log-polar bloom (@YoheiNishitsuji)

```glsl
float i,e,R,s;vec3 q,p,d=vec3((FC.xy-.5*r)/r.y,.8);for(q.z--;i++<99.;){o.rgb+=hsv(.1,-e,e/1.5e1);p=q+=d*max(e,.004)*R*.22;p=vec3(log2(R=length(p))-t*.3,e=asin(-p.z/R-.01)-.9,atan(p.x,p.y)*2.5-t*.3);for(s=2.;s<1e3/(i*.3);s+=s)e+=abs(dot(sin(p.yzx*s),cos(p.yzx*s)))/s;}
```

### Demos 4–17

The remaining fourteen expressions are included verbatim in `index.html` and are selectable as **Demo 4** through **Demo 17** (each labeled `(@YoheiNishitsuji)`). These cover iterative log-polar transformations, rotated fields, harmonic ray-marching, particle-like projections, and other procedural fragment programs. The numbered names intentionally avoid inventing original titles for unnamed snippets.

A few source expressions leave local counters uninitialized; Demo 5 also references an otherwise undeclared `s`. MiniWrapper supplies deterministic fallback initializations in the compiled shader rather than silently modifying the saved/demo expressions. For Demo 5, `s=0.` is an implementation fallback, **not** a value supplied by the original expression.

## Symbols supplied by the wrapper

| Symbol | GLSL type | Meaning |
| --- | --- | --- |
| `FC` | `vec2` | Current pixel coordinates (`gl_FragCoord.xy`), in framebuffer pixels |
| `r` | `vec2` | Current framebuffer resolution in pixels |
| `t` | `float` | Elapsed animation time in seconds; starts at 0 on Render/Reset |
| `o` | `vec4` | RGBA fragment output; initialized to opaque black for each pixel |
| `hsv(h,s,v)` | `vec3` | HSV-to-RGB conversion returning a color to add to `o.rgb` |
| `rotate3D(angle, axis)` | `mat3` | Axis-angle 3D rotation matrix helper used by the rotating fractal demo |
| `rotate2D(angle)` | `mat2` | 2D planar rotation matrix for shader snippets that multiply `vec2` values by a matrix |
| `PI` | `float` | Mathematical constant π used by Demo 5 |

## Portability notes

Several compact mini-shader snippets rely on implicit starting values that are not guaranteed by GLSL. The wrapper includes additional narrowly targeted initialization patterns for the new demo loop counters and vectors, alongside the original patterns. To keep the demos reproducible across drivers, the wrapper normalizes a few known declaration patterns during compilation:

```glsl
float i=0.,e=1.,R=1.,s=4.;
vec3 q=vec3(0.),p=vec3(0.),d=...;
for(float i=0.,g=0.,e=0.,s=0.; ... )
for(int i=0; ... )
```

The user-visible textbox retains the original compact expressions. Only these known declarations are normalized during compilation; the mathematical bodies of the shaders are unchanged.

## Export support

- **PNG** export uses the current canvas frame.
- **WebM/MP4** export (depending on browser support) uses the browser's native `canvas.captureStream()` and `MediaRecorder` support. A pulsing red dot appears immediately to the right of the recording button while the recorder is active, disappearing on Stop, recording completion, or an error.
- On browsers without native recording support, the video recording button is disabled.

## Files

- `index.html` — fully standalone editor, GLSL compiler, WebGL2 canvas, animation loop, demo selector, and export controls.
- `glsl-lab.html` — mobile-first Play/Understand workspace with three original demos, five live GPU controls, and PNG export.
- `README.md` — usage and explanation of the supplied functions.

## Browser compatibility and performance

WebGL2 support and a GPU/driver capable of compiling the provided loops are required. The default **75% rendering scale** reduces load on mobile devices; choose 50% for slower devices or 100% for maximum detail. A compile or driver failure is shown in the on-page status area. The loop structures are computationally intensive, and visuals/performance may vary by GPU.

## Deployment

This is a static site. Open `index.html` as a local file or serve the repository with any static web host. If you enable GitHub Pages for this repository, publish the root containing `index.html`. No backend is needed.

## Automated tests and next-step builder contract

The repository includes two test lanes. Run npm run test:fast with Node 22+ for dependency-free regression checks of all 17 original shader expressions, Lab UI contracts, mock WebGL interaction behavior, and the new typed expression graph. For real browser coverage, run npm install, npx playwright install chromium, and npm run test:browser. The full verification command is npm run test:all.

On GitHub, the MiniWrapper quality gates workflow runs fast tests first on main pushes, pull requests, and manual dispatch, then a mobile-sized Chromium/WebGL smoke test. If WebGL2 cannot be created, the GPU-specific test explicitly skips instead of claiming visual verification. Browser failures capture traces/screenshots.

The preliminary graph module (src/expression-graph.mjs) supports five typed nodes: coordinates, rotate, radius, wave, and palette. It checks connections, types, cycles, parameter bounds, deterministic GLSL emission, and JSON round-trip integrity. This is a tested core contract for the future builder, **not yet a drag-and-drop UI**. See docs/TESTING.md for stage gates and the promotion sequence.


## First-class application implementation

The staged plan is documented in [docs/IMPLEMENTATION_PHASES.md](docs/IMPLEMENTATION_PHASES.md), with the academic manuscript evidence contract in [docs/PAPER_SCHEMA.md](docs/PAPER_SCHEMA.md). The currently verified WebGL UI is the starting point; planned modules must not be mistaken for shipped features.

Phase P0: restored the Chromium shader build and CI tests.
Phase P1 foundation: [src/build-evidence.mjs](src/build-evidence.mjs) defines strict, reproducible, SHA-256-identified build receipts with positive compile/link/draw/error requirements. It is implemented and tested but is **not yet wired to the live Lab button**.

The approved visual concept remains **outside GitHub** and must never enter commits, generated assets, documentation, workflow artifacts or releases. Only independently authored textual acceptance criteria are stored in the repository.


### P1 live project/build features

GLSL Lab now exposes **Save validated build**, **Export last build JSON**, and a **My projects** panel (save, load, export and import). The build button stays disabled until the active shader has successfully compiled, linked, submitted a draw and passed a WebGL error check. Changing a slider or demo invalidates the previous capture until another frame succeeds. Saved build evidence contains original and compiled source, original attribution, dimensions, exact current control values, shader time, a measured CPU compilation duration, a UTC capture time and a SHA-256 digest. This is a local-browser project and evidence store, not a cloud account or scientific publishing service.

The paper button is intentionally disabled pending P3 measured research data and P4 bibliography/format verification. Browser storage may be cleared by the operating system; **export JSON to preserve copies**. Importing projects creates a new local identity and does not claim that their referenced build hashes are already present or verified. Receipt imports are not yet supported. Project data is stored only on the current browser origin; switching phones or clearing site data does not synchronize it.



### P2 visual expression builder (working MVP)

GLSL Lab now has a **Build** tab. It provides a touch-friendly connected stack of typed mathematical operations: **Coordinates → Turn → Distance → Wave → Color → Shader output**. Tap an operation to reveal its plain-language description and parameter sliders. Add more **Turn** or **Wave** operations, remove optional operations, reorder compatible adjacent operations, undo/redo edits, inspect generated GLSL, and import/export a graph JSON file. The connections remain mathematically valid because the editor rewires each operation in a validated type-safe chain; it does **not** claim general-purpose freeform node wiring.

Use **Build & preview** to compile the generated shader in real WebGL2. When the preview successfully compiles, links, and draws, the existing **Save validated build** action becomes available. Builder-authored shaders are attributed to the user/editor, **not** to the author of the 17 supplied demos. The graph can also be saved as a named project, exported, imported, and restored on another browser; the original shaders stay unchanged.

### Advanced Wiring — graph version 2

The Build tab also offers **Switch to Advanced Wiring**. This retains Quick Build and adds a separate **typed branching workspace**. Card connections are drawn on a scrollable, zoomable canvas; users can select an operation, choose explicit source nodes for each input port, move cards by touch using their Move handles, nudge positions with accessible arrow buttons, and automatically arrange the layout. The graph has versioned JSON import/export, undo/redo, node addition/removal, and live generated GLSL inspection.

Available operation types are Coordinates, Turn, Distance, Wave, Number, Add, Blend, Color, and Output. Input ports accept **only compatible types**. Cycles, missing upstream sources, and unsafe identifiers are rejected; drafts may contain unconnected nodes, but **Build & preview stays disabled while operations are unused or any input is missing**. Connect each required branch into Output (or remove unused nodes) to promote the expression. Saved project JSON and SHA-256 build receipts retain the complete typed graph and spatial positions. Existing version-1 linear graphs remain supported.

The graph is a directed acyclic graph with explicit port selection, **not** an unconstrained text-to-graph converter. Wires are visually rendered and reconnected using accessible dropdowns rather than dragging wire endpoints; arbitrary shader language syntax, nested reusable subgraphs, and academic-paper generation remain later work. The approved product comp remains entirely outside the GitHub repository.


### P3 research capture — reproducible sampled image observations

The Research capture panel reads real RGBA8 pixel data from a *validated* WebGL2 framebuffer using readPixels. A capture creates a matching immutable shader build receipt and preserves a deterministic center-point sampling grid of at most 32 by 24 pixels. Its JSON contains each sampled RGBA byte (WebGL bottom-left origin), the sampling rule, dimensions, independent SHA-256 hashes of the pixels and research record, a UTC timestamp, and the linked original shader or graph build receipt.

All measurements are calculated **only from retained sample bytes**: mean encoded RGB, weighted Rec.709 encoded-channel luma proxy, its population standard deviation, minimum and maximum, 16-bin histogram, clipped-channel fraction, and fraction of alpha below 128. They are reproducible from exported data. This is **not physical linear-light luminance and not a full-frame statistical distribution**. No inference about temporal stability, GPU performance, novelty, or statistical significance follows from one frame.

Export research JSON audits every capture against its linked verified build, then exports captures together with matching shader receipts. A small preview is reconstructed from the sample; it is not a full-resolution research figure. At most 16 captures are stored locally per browser origin. Export files before browser site data are cleared. Independent PNG export remains available. Full-resolution, integrity-linked figure export and controlled repeated-run comparisons remain P3 follow-up tasks. Academic paper generation is still gated. The approved visual design image remains outside GitHub.


### P3 full-resolution lossless figures and controlled frame comparisons

The **Full-resolution figures & repeated frames** section in GLSL Lab captures the entire validated WebGL2 RGBA8 drawing buffer. It encodes the bytes as a deterministic, lossless RGBA PNG (flip from WebGL bottom-left coordinates to conventional PNG top-left), with SHA-256 hashes for the raw framebuffer, PNG and figure record. The frozen shader build and P3 center-point sample are retained for each image. Full-frame metrics are computed from all RGBA8 pixels, separately and explicitly distinguished from the earlier 32 × 24 sample metrics.

**Capture 3-frame series** requests three separate successful GPU draws while animation runs and validates unchanged shader source, graph, parameter state and resolution. It records shader time and capture time for each frame, then reports consecutive pairwise mean absolute RGB8 channel differences, maximum channel difference and fraction of pixels whose RGB values changed. Identical images are valid separate observations. These are descriptive *within-session observations*, not statistical independence, FPS/GPU benchmarks, temporal accuracy estimates or significance claims.

**Export figure ZIP** verifies the pixel content, PNG and receipt references, optionally recomputes the comparison, then exports lossless PNG files and an accompanying JSON manifest including figures, research samples, shader receipts and any controlled series. The PNG and ZIP writers use a self-contained deterministic stored-DEFLATE approach, without libraries, conversion to JPEG, or a third-party service. Figure byte arrays are kept **in browser memory only**, up to five per session; the user must export before reload, closing the tab or exhausting device memory. The paper-generation button remains locked pending audited references and paper-format verification. The approved visual contract image is never included in the repository or generated research bundle.

### P3 controlled parameter experiments

The Controlled 3-point experiment panel varies exactly one rendering parameter (Zoom, Hue, Angle, or Brightness) at three values around its original setting. Shader code, graph, all other settings, viewport and GLSL shader time are held fixed. Three real WebGL2 RGBA8 framebuffers are captured. Each is linked to a verified build receipt, center-grid pixel sample, deterministic lossless PNG digest and UTC draw observation. Playback speed affects ordinary animation but not this fixed-time experimental shader uniform.

Export session JSON retains complete raw framebuffer pixels and evidence for independent reconstruction. Export figures ZIP packages that JSON and three lossless PNGs. Import another separately initiated session JSON and the app checks provenance and protocol equivalence before reporting per-level mean absolute RGB8 differences, fraction of changed pixels and mean encoded-luma difference.

This is a three-condition demonstration with one observed frame per condition. Two manually initiated sessions do not establish statistically independent replications, GPU equivalence or significance. No p-values, confidence intervals, performance benchmarks or research-novelty claims are generated. The PhD-style paper button remains gated behind further methods and bibliography review.

### P3 counterbalanced repeated-frame research

The **Counterbalanced repeat study** panel extends the three-level demonstration into three distinct observed WebGL2 draws per treatment (nine total). It uses three cyclically rotated blocks: A/B/C, B/C/A and C/A/B (or a recorded phase rotation), so each treatment occupies each serial position once. This is **positional counterbalancing, not randomization**; no claim of carryover control or independent experimental trials is made.

The app captures browser-reported WebGL2 version, GLSL shading language version, masked vendor and renderer strings, fragment highp precision, relevant GPU limits and pixel ratio. Unmasked GPU identifiers and device serials are not acquired. These observations describe the API-reported environment; matching values do not prove identical underlying hardware or driver conditions.

Every draw holds the shader, graph, viewport, other uniforms and GLSL time fixed, changes only the specified treatment uniform, and retains full RGBA8 pixels, samples, lossless PNG evidence, a verified shader build receipt, draw number and UTC timestamp. The 9-frame study is limited to 180,000 pixels per draw to bound mobile memory use. Per-treatment output includes mean, sample standard deviation and observed min/max of each frame's full-frame encoded-channel luma proxy (n=3). This sample standard deviation is descriptive dispersion, **not an uncertainty interval or significance test**.

Export full study JSON, or a ZIP containing that independently auditable JSON and nine lossless PNGs. Import a previous compatible study to compare mean/dispersion by treatment; the app rejects changed source, protocol or reported WebGL capabilities. The figures remain in browser memory until exported and are not cloud-synced. The manuscript button stays disabled pending independently verified references, formal experiment design and editorial review.

### P4 bibliography and methodology preflight

GLSL Lab now includes a **Bibliography and methodology audit** section after the repeat-study controls. The source registry retains published identifiers, title, author, year, venue, claim applicability, source URLs, review date and metadata-verification status. It distinguishes authoritative standards from scholarly method literature; references checked only through a secondary source remain quarantined and are not included in automated BibTeX export. The detailed register is at `docs/REFERENCES.md`.

The audit accepts an exported 3-point or 9-frame experiment JSON, recomputes the original shader-build, sampled-pixel, full-frame and figure evidence, verifies the archive and source hashes, and produces a separate content-hashed methodology report and scoped bibliography. It records the experimental design and each supportable or unsupported inference. **An integrity audit is not independent scientific peer review.** No reviewer has signed off on novelty, experimental independence, calibration or statistical significance. The Generate Academic Paper button stays disabled.

### P4 evidence-grounded manuscript generator (research draft)

After a 3-point or 9-frame exported study has passed the Bibliography and methodology audit, the **Generate Research Draft** action unlocks. It creates a print-styled, self-contained HTML manuscript with a title and abstract; numbered introduction, methods, results, discussion, limitations and reproducibility sections; exact encoded-channel luma equations; a table of archived frame-wide measurements; representative PNG figures selected by the first-observation-per-treatment rule; linked bibliography; and an appendix containing the original GLSL source. Source attribution comes from the frozen shader receipt; manuscript authorship is deliberately left unspecified rather than fabricated.

The document includes a read-only in-page preview, **Download print-ready HTML**, **Print / Save as PDF** through the browser's native print workflow, and **Export complete research ZIP**. The ZIP contains HTML with relative figure references, all original lossless PNG images, full experiment JSON with pixel data, methodology-audit JSON, scoped BibTeX, exact GLSL and a manifest listing SHA-256 digests for the exported files. The standalone downloaded HTML embeds its representative figures for offline printing. No external network service or runtime CSS dependency is needed.

Before assembling or archiving, the engine recomputes the complete study/audit, original full-resolution frames, figure hashes and citation scope; it refuses altered artifacts. It reports only measurements actually present, labels n=1 SD as *not estimated*, describes n=3 SD as descriptive, preserves underlying authorship credit, and excludes sources pending metadata review. The output explicitly states **UNREVIEWED RESEARCH DRAFT**, not peer reviewed, publication-ready or scientifically novel. PDF creation uses the platform's print dialog and requires selecting a PDF destination; **it is not a direct JavaScript-generated PDF file**. The external scholarly sign-off and publication release gate remain separate.

### P5 — Direct PDF, PDF quality check and independent review handoff

After a verified research experiment is imported, audited and assembled as an unreviewed research manuscript, select **Download PDF directly**. This creates a genuine A4 PDF 1.4 in the browser with typeset article sections, exact archived GLSL, treatment statistics, equations, scoped references, and GPU-source-derived image figures. It does not use screenshot capture or the browser print dialog, which remains available separately.

**Export complete research ZIP** now includes `manuscript.pdf` alongside HTML, original PNGs, study data, GLSL, bibliography, methodology report, a SHA-256 inventory, and an unsigned `review-packet.json`. **Export reviewer checklist** downloads the handoff separately. Every review criterion remains pending: author/license rights, primary-text/passages, literature comparison, design/uncertainty, hardware, figure fidelity, reproducibility, final page layout, and independent review. Neither a hash nor a metadata check authenticates peer review or publication approval.

A separate CI job generates a known synthetic study, parses the direct PDF with Poppler (`pdfinfo` and `pdftotext`), rasterizes its pages, and retains output for visual inspection. The release gates also verify source tampering, original-frame images and publication-state refusal. A4 PDF uses standard Times/Courier encoding and may transliterate unsupported mathematical glyphs or names; visually review these before scholarly distribution. See `docs/EDITORIAL_REVIEW.md`. The accepted product visual comp is kept entirely outside the repository.
