# P8 — Independent methodological and primary-literature assessment

**Research date:** 2026-10-10  
**Project:** SN GLSL Lab, `slmcav/MiniWrapper`  
**Relationship to P7:** This is a supplemental, publicly sourced *analytical assessment* of `docs/SOURCE_CLAIM_CROSSWALK.md`, not a reader's authenticated testimony and not a change to an exported manuscript.  
**Scope and epistemic level:** Normative Khronos/ITU clauses were inspected directly; published journal abstracts, publisher records and the creator's Shadertoy page were checked. The entire full text of each journal publication was **not** independently audited. No experimental dataset, real device or GPU was independently rerun in this research session. The assessment is generated analytical research, **not an independent human scholarly sign-off**.

## What the evidence actually supports

The existing source registry correctly separates (a) normative GLSL/WebGL language and interface specifications, (b) statistical methodology, and (c) domain-specific graphics prior art. It does **not** establish that any particular implementation is cross-device numerically invariant or that three or nine frames are statistically independent repetitions.

The official *GLSL ES 3.00*, revision 6, specifies compilation and linking (section 1.3) while explicitly acknowledging implementation-dependent compilation stages. The specification's section 4.6.2 permits distinct evaluations of otherwise identical *nonconstant* expressions within a shader to differ; sections 4.6.3–4.6.4 narrow invariance for constants and exclude undefined values. Accordingly, the applicable claim is **validated execution on the observed WebGL implementation**, not numerical equality on all devices.

The Khronos WebGL 2.0 editor's draft, section “Reading back pixels,” establishes `readPixels` as an API read operation, details `ArrayBufferView` and `PIXEL_PACK_BUFFER` forms and error cases, and states that direct array readback blocks on prior framebuffer rendering. A hash of bytes so obtained permits later consistency checks, but cannot authenticate the physical origin of the bytes, browser environment or observer.

Sacks, Welch, Mitchell and Wynn (1989) describe a statistical process-model approach to *deterministic computer-model outputs* and uncertainty in a derived predictor. This is **not** a statistical justification for treating consecutive draws of the same GPU shader as exchangeable independent replicates. Hurlbert's (1984) analysis defines pseudoreplication in relation to treatment replication and the statistical independence of replicates; applying the terminology to GLSL Lab is our explicit methodological interpretation, not a statement that Hurlbert studied shaders.

ITU-R BT.709-6, section 3.2, defines 0.2126/0.7152/0.0722 coefficients over **nonlinear, primed RGB signals**. The GLSL Lab encoded-channel weighted mean is appropriately called an *encoded-channel proxy*. It is not automatically display luminance, linear-light photometry or necessarily a standards-compliant BT.709 signal: the buffer transfer function, color space, framebuffer configuration and encoding of the values have not been experimentally established.

The Lagae et al. (2010) publisher record describes a survey of procedural noise, but a manuscript may invoke this literature as explanatory prior art **only when** a specific authored shader/graph operator is independently matched to a relevant noise definition. The creators' own Shadertoy page documents the work of Pol Jeremias Vila and Iñigo Quilez in SIGGRAPH '13. That is sufficient for a historical-prior-art candidate, not yet a publisher-reconciled proof of a particular novelty comparison or journal-quality article type.

## Claim-by-claim evidence upgrade crosswalk

| ID | Specific claim under examination | Existing supported level | Stronger evidence required before expansion | Priority |
|---|---|---|---|---|
| P8-C01 | “This exact generated program conforms to GLSL ES 3.00.” | Khronos defines the language; a local compile/link/draw receipt demonstrates observed success only. | Freeze exact source and context, run independent compiler/conformance tooling and enumerated conformance tests; record versions, precision requirements, negative cases and observed scope. Avoid extrapolation to general conformance. | High |
| P8-C02 | “The archived PNG, RGBA bytes and measurements reconstruct the observed sample.” | Deterministic exporter/verifier can establish internal byte consistency. Khronos defines readback APIs. | Independent replay of the complete original archive with recorded scripts and validation logs; independently establish capture-device provenance if physical origin is asserted. | High |
| P8-C03 | “Results are identical across GPUs, drivers or browsers.” | No cross-platform equivalence shown. GLSL §4.6.2 places limits on numeric invariance. | Preregistered multi-device/browser/driver matrix, environment attestations, repeat trials, image-level tolerance metrics and mismatch reporting, controlled color/precision settings. | Critical |
| P8-C04 | “Mean luma measures perceptual or physical luminance.” | A reproducible weighted encoded RGB proxy only. | Identify framebuffer transfer encoding and primaries, map to calibrated linear-light or declared Y' transfer, document alpha/compositing and instrument calibration for physical claims. | High |
| P8-C05 | “Nine frames supply n=3 independent replicates per treatment.” | Three draws per treatment, descriptively summarized; no independence demonstrated. | Define experimental unit and target population, independently initialize sessions/devices, preregister replication and randomization/carryover controls, justify residual and uncertainty models. | Critical |
| P8-C06 | “Cyclic A/B/C, B/C/A, C/A/B counterbalancing removes period or carryover effects.” | Each treatment occupies each serial slot once; this is positional balance, **not** general carryover correction. | Independent repetitions of blocks, order and carryover diagnostics, washout/temporal controls and a design-based analysis. | High |
| P8-C07 | “Small/zero frame differences mean deterministic or reproducible shader behavior.” | Pairwise descriptive RGB8 differences from archived draws at recorded shader times. | Specify equivalence metric and tolerance before experiments, independent repeat sessions and hardware/software controls; separate time dependence from environmental noise. | High |
| P8-C08 | “The build or capture is a reliable GPU speed benchmark.” | CPU-observed elapsed time or a blocking pixel readback cannot isolate GPU execution. | Validated GPU timer queries (where supported), disjoint/context handling, warmed repeated runs, independent instrumentation and timing uncertainty. | High |
| P8-C09 | “This shader implements or improves an established noise method.” | Lagae's publisher metadata supplies a relevant prior-art survey *conditionally*. | Operator-to-definition crosswalk, source-code inspection, citations to original techniques, controlled comparisons and documented performance/error criteria. | High when noise is present |
| P8-C10 | “GLSL Lab introduces a novel shader-language or expression-builder method.” | Novelty is untested; Shadertoy 2013 already documents interactive reactive shader authoring. | Exhaustive scoped related-work review (Shadertoy and graph editors among others), substantive formal distinction, benchmark against baselines, primary publisher metadata and expert assessment. | Critical |
| P8-C11 | “The PDF is PhD-/journal-approved or independently peer reviewed.” | The PDF and source bundle can be reconstructed; review packet remains unsigned and pending. | Identified accountable author/reviewers, verified permissions, complete primary-source passages, journal formatting and independent scientific/editorial decision. | Critical |
| P8-C12 | “Sacks et al. justify confidence intervals or statistical significance for these captures.” | The article provides methodological context for computer-model output prediction under a specified model. | A defensible stochastic model, experimental independence, estimand, fitted diagnostic evidence and qualified statistical review. No inferential claims with present data. | Critical |
| P8-C13 | “Supporting reader notes establish that passages were truly checked or that science was approved.” | P7 stores user-declared reading statements and detects later dossier mutation. | Identity/provenance corroboration, actual source passage examination, attributable independent review and release workflow outside any self-declared note count. | Critical |

**Status of all stronger claims:** NOT ESTABLISHED. No publisher record, standard, AI-authored assessment or hash upgrades a manuscript's scientific approval. Evidence absence is a bounded result, **not** proof the underlying assertion is false.

## Methodological judgments

**Experimental unit:** A shader draw is an observation. Separate draws of the same program on one runtime can be correlated and are not automatically independent treatment replicates. Repeated independent sessions could support a broader analysis *if* the study defines the unit, protocols and assumptions. The 9-draw, counterbalanced design is useful as an instrumented feasibility demonstration.

**Statistical model:** The three per-condition values can be reported as `n=3 observed draws`, observed range and descriptive sample SD. Intervals, p-values, generalized treatment effects, device reliability claims and reproducibility coefficients are not justified by that summary.

**Color measurement:** Preserve the existing encoded-proxy formula and numbers. Their exact reproducibility is meaningful; the additional step to linear luminance must be explicit and cannot be inferred from the familiar BT.709 coefficients.

**Portability:** Compile/link success and `gl.getError()==NO_ERROR` support local execution. Numeric invariance, absence of undefined shader state, graphics quality and comparisons between platforms require distinct investigations.

**Authorship and intellectual property:** Programmatically deriving a manuscript from a shader does not grant rights in the original shader, citations, graphical figures or authorship claims. Preserve demo attribution and require an author-controlled rights review.

**Novelty:** Neither the 2013 Shadertoy creator record nor the 2010 Lagae survey alone exhausts the relevant prior art. The former establishes an earlier shader-coding venue; it cannot prove the precise operator graph or validation method was already developed, nor that GLSL Lab is novel.

## Research source register and exact loci

1. **Khronos Group (2016).** *The OpenGL ES Shading Language*, language 3.00, revision 6, 29 January 2016; cover; §§1.3, 4.5, 4.6.2–4.6.4. https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf — official complete specification directly inspected.
2. **Khronos Group.** *WebGL 2.0 Specification*, living editor's draft; “Reading back pixels” (`readPixels` array-buffer overload and blocking semantics), “Writing to the drawing buffer.” https://registry.khronos.org/webgl/specs/latest/2.0/ — official normative draft directly inspected; version should be frozen when publication is considered.
3. **ITU-R (2015).** *Recommendation BT.709-6: Parameter values for the HDTV standards for production and international programme exchange*, §§1.2, 3.1–3.5, especially §3.2 (primed RGB coefficients). https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.709-6-201506-i!!pdf-e.pdf — official recommendation directly inspected. It has not been asserted that WebGL buffer values necessarily use BT.709 encoding.
4. **Sacks, J., Welch, W. J., Mitchell, T. J., & Wynn, H. P. (1989).** “Design and Analysis of Computer Experiments.” *Statistical Science* 4(4):409–423. https://doi.org/10.1214/ss/1177012413 — bibliographic record and published abstract reviewed; full paper not audited here.
5. **Hurlbert, S. H. (1984).** “Pseudoreplication and the Design of Ecological Field Experiments.” *Ecological Monographs* 54(2):187–211. https://doi.org/10.2307/1942661 — publisher record and published abstract reviewed; the GPU application is an analogy and needs independent experimental-design judgment.
6. **Lagae, A., et al. (2010).** “A Survey of Procedural Noise Functions.” *Computer Graphics Forum* 29(8):2579–2600. https://doi.org/10.1111/j.1467-8659.2010.01827.x — publisher metadata and abstract reviewed, not an operator-by-operator full-text study.
7. **Jeremias Vila, P., & Quilez, I. (2013).** “Shadertoy: live coding for reactive shaders.” *SIGGRAPH '13: ACM SIGGRAPH 2013 Computer Animation Festival.* https://www.poljeremias.com/publication/siggraph2013/ ; candidate DOI https://doi.org/10.1145/2503541.2503644 — creator's abstract reviewed; direct ACM publisher confirmation of the precise DOI/publication record remains pending. Preserve the source registry's quarantine.

## Application custody and strict non-approval contract

P7's `glsl-lab/source-review-dossier/1` accepts only sources already cited by a specific frozen manuscript and captures **declared reader interpretations**. Its `glsl-lab/source-claim-crosswalk/1` merely indexes them. These are not suitable as the sole factual source for this P8 evaluation, since the present assessment includes an additional normative standard (ITU) and methodological work (Hurlbert) not yet cited by every frozen manuscript.

Preserve this P8 analysis in **separate, read-only research custody**, accompanied by `docs/P8_EVIDENCE_REGISTER.json`. It is not grafted onto original manuscript citations, review packets, experimental measurements, PDF pages, source-lineage records or signed approvals. Data fields distinguish `evidenceBasis`, `supportedInference`, `requiredNextEvidence`, `strongerClaimEstablished:false` and `reviewAuthority:'none'`. The app may expose such assessments as editorial findings, **never** as validated source-passage confirmations or independent reviewer certifications.

**P8 completion means:** an explicit prioritized evidence-claim map and provenance of sources are recorded. **P8 does not mean:** full-text literature review complete, independent replication performed, PhD-level methodological endorsement, or publication release granted.

## Immediate follow-on operations

P9 should prioritize a formally specified **independent experimental-unit and cross-device replication protocol**, supported by an explicit GPU/driver/browser matrix, color-space contract, precision/undefined-value audits, controls and preregistered equivalence thresholds. Separately, reconcile the Shadertoy ACM publisher record and construct an operator-level related-work matrix for actual shader or graph code. A later standalone external reviewer may sign off on a manuscript only after examining sources, experiment, rights and exported figures; software cannot sign on their behalf.
