# P10 academic release: verification and provenance matrix

**Date:** 2026-10-10. **Branch:** phases/p10-academic-hardening. **Target:** source-to-PDF academic research workflow. **Visual comp:** approved external visual reference, not stored or reproduced in this repository.

The researcher-facing interface should present executable work, results and supporting data. Scientific limitations belong in the manuscript methods, data custody records and release review, not as repetitive application banners. None of these tests grants independent human review or scientific publication approval.

| Phase | Evidence-producing operation | Independent quality check | Release condition |
|---|---|---|---|
| 1. TeX PDF production | src/manuscript-latex.mjs, exported manuscript.tex and original figure PNGs | Native TeX Live pdfLaTeX compilation with logs and Poppler validation | Academic PDF compiled from .tex; JavaScript A4 PDF remains a legacy parser fixture only |
| 2. Visual contract | Existing mobile-first palette, typography, layout and authoring controls | Desktop/phone responsive geometry test; designer checks against private comp outside GitHub | Private reference visual comparison must be recorded externally before claiming pixel parity |
| 3. Syntax and structure | Exact typed DAGs; runtime source receipts; no Lab demo selector | Node syntax preflight for every source module, inline script check, unique HTML IDs, Playwright DOM | All tests pass with genuine WebGL2 on browser CI |
| 4. Workflow | Graph -> validated draw -> controlled experiment -> audit -> manuscript | One-click current-study handoff and complete browser end-to-end test | All five research stages execute without fabricating data |
| 5. PDF visual output | Figure-linked LaTeX with A4 pages, equations, citations and GLSL appendix | pdftotext, pdfinfo, pdfimages, page PNG rasterization, bbox coordinates | Source has no missing text, out-of-page glyphs or omitted figure XObjects |
| 6. PDF filename | build-latex.sh and build-latex.ps1 | SHA-256 of actual compiled PDF bytes checked against file basename | GLSL-<manuscript SHA first 32>_<full PDF SHA-256>.pdf |
| 7. Researcher use | Editor, project save, GPU sweep, one-click audit, manuscript and TeX research package | E2E full-workflow test; original study and references archived | Usable from a graduate student browser session with native TeX available for final PDF |
| 8. Research UX | Short page guidance; methods and provenance in archival manuscript | No gallery UI; no repetitive warning panels; source/rights fields remain unapproved in structured data | Research controls are actionable and truthful |
| 9. Demo exclusion | All 17 demo signatures derived from credited gallery source | Every original, whitespace/comment variant, embedded paste, source ID and attribution rejected by scientific audit | Demo cannot be promoted through metadata or pasted source alone |

## Researcher workflow

1. Open GLSL Lab and author the graph in **Build**; the live WebGL2 renderer verifies compilation, linking and a successful draw.
2. Record a controlled three-condition experiment or nine-draw balanced study. Export the complete original study JSON (full framebuffer bytes, graph, uniforms and platform observations) before closing the browser.
3. Select **Audit current study** to recompute the archived pixels, hashes, figures and methodology, or import a previously exported study JSON.
4. Select **Generate Research Draft** and inspect equations, sections, figures, source attribution and citations. Download the complete TeX research package, containing manuscript.tex, shader.glsl, all original PNGs, study.json, methodology-audit.json, review-packet.json, references.bib, and a SHA-256 manifest.
5. Unzip the package. Run **bash build-latex.sh** (TeX Live installed) on Linux/macOS or **.\build-latex.ps1** (TeX Live and latexmk available) in Windows PowerShell. The script creates a PDF using *native pdfLaTeX*. Its filename contains an immutable manuscript-derived ID and SHA-256 of its actual compiled bytes. Record the compiler version and command log alongside the generated PDF.
6. Reimport the original ZIP into **Verify an exported research bundle** or run the offline Node verifier for a byte-level archive consistency check. This is distinct from confirming external experiment validity or authenticated peer review.

## Reproducibility contract

Source SHA-1 Git blob references identify the producer release; content SHA-256 protects source data, paper descriptor, renderer inputs and exported archive bytes. The final PDF SHA-256 is calculated **after TeX compilation**. PDF byte equality across machines is not presumed without freezing the TeX Live version, fonts, timezone and relevant runtime settings. Build scripts set SOURCE_DATE_EPOCH to the manuscript generation time and FORCE_SOURCE_DATE to one to reduce metadata drift. Preserve a separate build receipt/log and final compiled PDF.

The original seventeen attributed @YoheiNishitsuji demos remain available only through the standalone *classic exploration gallery*. The Lab itself contains only typed user-authored graph output; all manuscript-level study audits enforce a second independent source-signature exclusion gate. The signature detector catches direct, formatted, commented and embedded pastes, but does not claim to detect every rewritten or semantically equivalent shader. Authorship/rights review remains a distinct project-provenance responsibility.

## Primary technical references

- Khronos Group. The OpenGL ES Shading Language, version 3.00, revision 6 (2016). https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
- Khronos Group. WebGL 2.0 Specification, section “Reading back pixels”. https://registry.khronos.org/webgl/specs/latest/2.0/
- Sacks, J., Welch, W. J., Mitchell, T. J., and Wynn, H. P. (1989). Design and Analysis of Computer Experiments. *Statistical Science*, 4(4), 409–423. https://doi.org/10.1214/ss/1177012413
- Lamport, L. (1994). *LaTeX: A Document Preparation System*, 2nd edition. Addison-Wesley.
- Knuth, D. E. (1984). *The TeXbook*. Addison-Wesley.

**Release status must follow live CI, not the existence of this document.** The privately approved visual comp is neither in repository source nor in workflow artifacts.


## P10.1 recovery hardening — provenance and visual release evidence

The gallery exclusion now operates at three independent points: study creation/reconstruction for both sweep-session/1 and replicated-session/1, methodology auditing, and frozen-manuscript assembly. Exactly **17** credited classic-gallery expressions are registered. The detector uses source fragments distributed throughout the expressions, catching straightforward copied, formatted, embedded and lightly edited variants. It does not attempt to certify independent authorship or catch all semantic rewrites.

The research PDF pathway archives original GLSL, PNG frame evidence and LaTeX source. Three-condition studies contain three representative figures. Nine-draw studies include all nine original GPU frames in the compiled PDF: three treatment panels and six additional appendix observations. Native pdfLaTeX CI checks both formats, all figure XObjects, text bounds, page rasterization and compiler-log diagnostics.

After compiling, both build scripts emit **build-receipt.json** (schema glsl-lab/native-latex-build/1). It records compiler version, SOURCE_DATE_EPOCH, full manuscript SHA-256, 32-character manuscript-derived unique identifier, input TeX and GLSL SHA-256 values, exact compiled PDF SHA-256, and output filename. The independent inspector recomputes these values. The researcher should preserve PDF, build receipt, TeX log and original ZIP as one provenance package.

Playwright also captures only the rendered application at 390 px mobile, mobile drawer expanded, and 1280 px desktop. The academic-ui-visual-audit CI artifact holds these images for comparison with the separately retained approved visual comp. Neither the comp nor its raster stand-in is included in any Git commit. Responsive geometry tests do not establish pixel-perfect comp agreement.

No automated test establishes author rights, novel scientific findings, calibrated hardware equivalence, independent experiment replication, or editorial acceptance. These remain separate provenance and research assessment records.
