# P5 — Scholarly review and direct PDF quality gates

**Checkpoint:** 2026-10-10. The program generates a verifiable *technical research draft*, not an accepted PhD thesis chapter, peer-reviewed article, or validated new graphics method.

## Scholarly source review

The program cites only sources whose bibliographic metadata are in `src/reference-registry.mjs` and whose registered claim scopes are applicable to the exact manuscript. Primary registry/publisher evidence presently includes the [Khronos GLSL ES 3.00, Rev. 6 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf) (29 January 2016), the [Khronos WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) (living editor's draft; not a finalized or peer-reviewed article), [Sacks, Welch, Mitchell, and Wynn (1989)](https://doi.org/10.1214/ss/1177012413) on computer-experiment methods, and [Lagae et al. (2010)](https://doi.org/10.1111/j.1467-8659.2010.01827.x) on procedural noise functions. The latter is **not cited automatically** unless procedural-noise claims are genuinely present in the manuscript. The Jeremias and Quilez Shadertoy entry remains quarantined pending ACM-level metadata reconciliation and suitability review.

Technical standards support descriptions of the language and pixel-readback contract. They do **not** validate device equivalence, independent experimental replication, empirical claims about shader output, novelty, or statistical significance. The Sacks et al. citation supplies methodological context, not permission to apply confidence intervals to uncalibrated serial GPU frames.

All registered references have `primaryFullTextReviewed = false` and `supportingPassagesReviewed = false` in the generated human-review packet. This prevents a metadata crosscheck from being represented as a scholarly full-text audit.

## Human independent-review packet

`src/scholarly-review.mjs` creates a content-hashed, explicitly **unsigned** checklist recording the exact manuscript, experiment and methodology audit hashes. It requires attributable review of authorship/copyright, relevant primary texts and passage-level citations, literature adequacy, experimental design, hardware/driver calibration, uncertainty and permissible inference, figures and layout, reproducibility, novelty, and an independent editorial sign-off. The author/reviewer name and publication clearance remain `null` or `false`. Automated verification rejects a forged sign-off or changed review status.

This is a **handoff mechanism**. There is currently no independently signed reviewer, and no implementation automatically confers publication approval.

## Direct PDF generation and separate validation

`src/research-pdf.mjs` produces a static A4 PDF 1.4 using embedded Times/Courier fonts, vector layout/text/tables and RGB image XObjects from the original archived WebGL framebuffers. This is a **true PDF download**, not a screenshot or a browser Print dialog. Original WebGL bottom-left pixels are flipped to image top-row order, with any alpha composited over white. The entire validated manuscript must reverify before any PDF can be produced.

The PDF uses ASCII-compatible transliterations of mathematical symbols and names where required by standard PDF font encoding. Those **glyph substitutions require human typographic review** before publication. The complete manuscript ZIP includes `manuscript.pdf`, `manuscript.html`, `review-packet.json`, all original PNGs, GLSL, raw study JSON, methodology audit, bibliography and SHA-256 inventory.

The independent CI PDF job generates a synthetic fixture, runs `pdfinfo` and `pdftotext` via Poppler, asserts key sections exist, and rasterizes at least its first two pages via `pdftoppm`. Renderer acceptance does not establish that every scientific figure, caption and mathematical glyph is publication-perfect; visual human QA, journal formatting and external peer review remain separate. Sample outputs from CI are retained as artifacts for layout inspection.

## Source review and manuscript publication gates remaining

The manuscript remains an **unreviewed descriptive draft** until a qualified human has verified author rights, manuscript-level relevance and full-text source passages, independent experimental claims and their assumptions, page-by-page exported PDF fidelity, original figure provenance, and intended publication requirements. A content hash detects changes; it does not authenticate an experimenter or reviewer. The approved visual product comp is not stored in GitHub.

## P7 externally declared source-reading notes

An unsigned manuscript editor packet can be imported into the mobile source-review workspace. Each independently entered record requires a citation from that specific manuscript, a bounded claim, named reader (self-declared), source passage locator, source URL, observed timestamp, supporting/contradicting/revision disposition and rationale. Only source IDs originally cited by that manuscript are available; claims about independent peer review, rights and publication remain false regardless of record count. Review notes are explicitly **separate from the frozen manuscript bundle**. Neither a hash nor a reviewer-typed name authenticates an individual's identity or verifies that they accessed the full cited document.

The signed-off requirements still include external reviewer identity, documentary passage evidence, relevant independent methodological analysis, original study replication where necessary, and venue-specific editorial inspection. See `docs/SOURCE_CLAIM_CROSSWALK.md` for the supported level of the current published-source evidence.
