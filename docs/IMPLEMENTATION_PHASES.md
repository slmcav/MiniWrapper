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
