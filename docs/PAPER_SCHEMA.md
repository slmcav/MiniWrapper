# Build evidence schema and scientific integrity

Build receipts are immutable observations. The lab must earn the successful state through compiling both shaders, linking the WebGL program, submitting a frame draw and checking WebGL error status. Merely presenting a green button or syntactically valid JavaScript does not establish success.

Receipt v1 will include schema version, exact shader source and expanded source, identifier of source demo or typed graph, original author attribution, canonical parameter state, frame dimensions and shader-time value, compile/link/draw evidence, optional measured CPU timing, SHA-256 content identifier and capture timestamp. Timestamps are excluded from the source-content digest. Optional measurements remain absent unless observed. Failed builds use a separate failure record and may not be edited into successful ones.

Future paper output consumes the frozen receipt, not mutable editor state. Paper claims carry evidence class: observed, computed, verified-citation, researcher-supplied, hypothesis or missing. Missing values remain clearly marked missing. A reproducible technical report is possible from one shader build; statistical or research-novelty claims require independent study evidence. Generated text remains a research draft for author review.

Paper bundle target: HTML, PDF, BibTeX, build receipt JSON, exact GLSL, captured figure files and integrity manifest. Cite only verified relevant sources and preserve figure/caption provenance. No fake author names, affiliations, measurements, or peer-review declarations.

## Browser integration checkpoint

The Save validated build action is enabled only after the current WebGL program's vertex/fragment compilation, linking, draw submission and gl.getError()==gl.NO_ERROR have been observed. A slider edit, shader switch, reset, failed draw or context loss invalidates the capture. The receipt is produced with src/build-evidence.mjs, verified again, and stored locally under the sha256 key; the JSON can then be exported. These observations do not include unmeasured shader quality or claims of originality.

## Graph-v2 evidence provenance

For validated builder-source records, the frozen receipt contains the complete authored graph (version 1 or 2) and its generated GLSL. The generator refuses any graph that does not deterministically produce the exact stored shader body. A graph-v2 receipt preserves node coordinates, port assignments, parameters and output. Incomplete graphs cannot claim measured success. Any future paper describing generated shader structure must cite this frozen graph and not a later mutable UI state.


## P3 image sampling record

Research records use schema glsl-lab/research-capture/1. Every record links to a verified, content-addressed shader build and archives deterministic RGBA8 point samples from actual WebGL2 readPixels. Each retained sample has bottom-left-origin coordinates defined by center-nearest-grid-v1, a sample byte digest, per-sample metrics, a document content digest, and a capture timestamp excluded from the content identifier. Exports include the original linked shader build receipts, and derived metrics are recomputed from archived bytes during audit.

The reported luma proxy is a Rec.709-weighted *encoded-channel* computation (not linear-light physical luminance). The sampled histogram, clipping measure, and means do not estimate unsampled full-frame values. A reconstructed sample preview is not a publication-quality full-frame figure. P4 papers must describe these limitations explicitly and cannot mislabel sample statistics as frame-wide, temporally replicated, or scientifically novel results.


## Full-resolution figure evidence and within-session series

Figure records use glsl-lab/figure/1. Each full-frame RGBA8 readback has width, height, captured shader time, raw framebuffer digest, deterministic PNG digest, full-frame channel metrics and its linked sampled research-capture digest and shader-build digest. PNG stores the image losslessly with the vertical WebGL-to-PNG orientation adjustment. It is not a compressed screenshot, resynthesized raster or style reference; its input is the observed GPU buffer. The ZIP package includes the original PNG bytes and a JSON manifest. The image's raw bytes remain reconstructable from the PNG and its standard decoding.

Repeated-frame summaries use glsl-lab/frame-series/1. Under invariant source, graph, shader uniforms and viewport, each pair yields a count of frame pixels, mean absolute RGB8 channel difference, maximum RGB channel difference, and fraction of pixels whose three RGB channels are not identical. Shader-time differences and UTC capture timestamps are included. Data can describe visual change across the observed frames; without controlled independent repetitions and calibrated hardware timing, they cannot establish a reproducibility coefficient, algorithm performance, statistical independence or significance. Both the full-frame statistics and original sampled statistics must be correctly labeled in downstream academic writing.

Each full-resolution figure can include an observed drawSequence and synchronous GPU-readback UTC capturedAt. When included in a repeated-frame series, drawSequence must increase strictly, and exported figures preserve both their observation time and shader-time value. Distinct draw submissions must not be confused with independent experimental trials.

## P3 experiment archive and comparison contract

glsl-lab/sweep-protocol/1 fixes baseline parameters, one manipulated render uniform, a step size, three treatment levels and a fixed shader-time value. glsl-lab/sweep-session/1 contains a distinct user-initiated session ID, verified per-treatment immutable build receipts and pixel samples, full-resolution RGBA8 image bytes in base64, SHA-256 figure records and canonical archive digest. The JSON archive is sufficient to reconstruct the PNGs and verify every stated metric and source.

The descriptive cross-session comparison pairs matching treatment levels and rejects changed shader source, graph, viewport, fixed-time protocol or any held-constant parameter. Separate user-initiated sessions are not statistically independent or platform-controlled experimental trials. Future research papers must describe these observations as a three-condition descriptive example unless additional replicates, calibration and independently verified methods are provided.

## Nine-observation counterbalanced trial schema

The archive schema glsl-lab/replicated-session/1 carries glsl-lab/replicated-protocol/1: baseline uniform settings, treatment variable and three levels, fixed shader time, phase-offset counterbalanced nine-slot schedule, graphics platform capability envelope, nine independently verified shader receipts, full RGBA pixel data, sampled receipts, deterministic full-resolution PNG hashes and capture-time GPU draw sequences.

Each treatment appears once in each serial position of the three-block design. Mean encoded-channel luma is computed from the three *frame-wide mean luma* values, with descriptive sample standard deviation using divisor n-1, and the observed minimum and maximum of those three values. These summaries are not statistical confidence intervals or measures of independent GPU variation. An exported ZIP includes the complete verifiable JSON plus nine lossless PNG files.

Cross-session summaries reject differing protocol, shader/graph/viewport or platform capability labels. Even matching reported values are not proof of physical GPU/driver equivalence. These metadata exclude unmasked GPU identifiers and are intentionally not a device fingerprint. All result claims in a future manuscript must distinguish one observed draw from one independently designed replicate, report the fixed shader time and order, and disclose design limitations.

## P4 scoped reference and audit record

`glsl-lab/methodology-audit/1` contains the verified experiment SHA-256, bibliography-registry SHA-256, evidence-qualified findings, exact observed GPU draw count, treatment-level counts, experimental limitations, and the publication-release blocker set. The audit is itself SHA-256 content-addressed and reproducible from the original study and the frozen bibliography; its observation timestamp is excluded from the content digest.

Reference metadata are machine-audited for DOI formatting and consistency, HTTPS source resolution format, author/year/title completeness, duplicate citation keys and declared claim scopes. Sources not backed by sufficiently reconciled primary metadata are labeled pending and excluded from BibTeX. **Automated metadata checks are not full-text scholarly review, and a verified audit is not an academic paper.** The manuscript generator continues to require a separate human scholarship/review and layout-verification stage.

## P4 manuscript draft file contract

The source of truth is glsl-lab/manuscript-draft/1, a deterministic content-hashed draft descriptor tied to one validated 3-point or 9-frame study and its methodology-audit SHA-256. It contains recorded treatment values and frame-wide encoded-luma summaries, citations admitted by claim scope, original shader identifier/attribution, figure-selection rule, experimental limitations and a **false** academicManuscriptUnlocked flag. The generation timestamp is omitted from its content SHA-256; rebuilding from the same study and audit must reproduce the rest byte-for-byte.

A static HTML renderer uses print CSS, semantic section headings, table and math notation, data-backed figure captions with PNG hashes, a numbered bibliography referencing the original publication metadata and a fully escaped GLSL source appendix. The archive glsl-lab/manuscript-bundle/1 holds a file inventory with SHA-256 digests for the HTML, PNG, study JSON, methodology JSON, BibTeX and exact shader body. The full evidence resides in the study, not in prose reconstructions; the article is an interpretive presentation.

The generated document is a **descriptive manuscript draft**, and cannot state or imply PhD acceptance, journal peer review, experimental independence, statistical significance or novel graphics results. Human scholarship, publication-license checks, independent replication where needed, final source-level review and editorial sign-off are outside the automated manuscript writer. Browser printing can produce a PDF through the user's print destination; it does not itself establish automated publication-quality PDF typesetting or page-by-page QA.

## P5 PDF and editorial receipt

`src/research-pdf.mjs` is a separate deterministic layout/serialization layer for the already verified `glsl-lab/manuscript-draft/1`. It emits A4 PDF 1.4, fonts and text instructions, original framebuffer-derived embedded RGB images, chronological figure selection, and archived treatment values. PNG sources remain separately preserved in the ZIP. Unsupported characters can be transliterated to ASCII by base-font encoding, requiring human proofreading.

`glsl-lab/editorial-review-packet/1` references the exact manuscript, experiment and methodology hashes while recording **NOT_SUBMITTED_FOR_REVIEW**, all reviewer identity fields null, all criteria pending, and publication authorization false. A machine cannot upgrade this record to peer reviewed; forged flags fail checksum/reproducibility checks. A full manuscript bundle inventories `manuscript.pdf` and `review-packet.json` with SHA-256 digests in addition to other source artifacts.

PDF proofing requires independent `pdfinfo`, `pdftotext` and image rendering; the accepted output still needs human inspection for heading hierarchy, text fit, equation glyphs, figure clipping and final publication format. An unreviewed descriptive report must never be represented as an accepted journal article or dissertation merely because it generates PDF.

## P6 research-bundle audit verdict

`glsl-lab/bundle-verification/1` is emitted only after successful independent reconstruction of a complete `glsl-lab/manuscript-bundle/1` archive. The imported ZIP is untrusted input; only stored uncompressed files within the bounded size and safe-name envelope are supported. The manifest is not itself trusted: original study bytes, all figure hash links, metadata, manuscript, PDF, bibliography and unsigned review record are regenerated and compared byte-for-byte against the original exported ZIP.

The receipt reports reproducibility status, study/manuscript/audit SHA-256, figure counts, archive inventory and explicit false manuscript-review and publication-authorized flags. A machine PASS cannot authenticate the origin of image evidence and is not human scholarly review. The source-tree Git commit remains part of reproducibility: changes in bibliography metadata or layout code may require invoking the matching historical version. A future archive schema should carry a signed toolchain/provenance reference or support verifiable migrations without altering original observations.


## Producer code lineage

The complete manuscript bundle additionally includes `source-lineage.json`, an explicit Git snapshot and an inventory of 20 producing and verification source files identified by their Git blob SHA-1 object IDs. The source inventory is itself listed and SHA-256 hashed within the bundle file manifest. CI recomputes blob IDs from the literal bytes of each checked-out file and fails if source evolves without a corresponding revision of the pinned snapshot. A cross-release re-import must have matching source lineage. This describes generating code identity, **not** authorship or reviewer identity, and does not license claims beyond the research audit.

## P7 external source-reading dossier

`glsl-lab/source-review-dossier/1` consists of independently declared source assessments bound to `glsl-lab/editorial-review-packet/1` through its immutable checksum and its source study/manuscript/audit hashes. Each entry stores a specific cited reference ID, relevant author-provided source URL, the claim in question, page/section locator, prose rationale, assessment classification, user-declared name and UTC entry time. Entries are SHA-256-addressed and re-imported with integrity verification. All source notes remain in a **supplementary dossier**, not the exported peer-review packet or research ZIP. The `publicationAuthorized` and `independentPeerReviewEstablished` values remain false.

The original packet and cited-reference list must remain unreviewed at import. A content hash cannot demonstrate who wrote a note or whether the source was accessed. Independent attributed sign-off remains an external step.

## Claim-level source assessment index

`glsl-lab/source-claim-crosswalk/1` reports reviewed versus unassessed citations and bounded claim-by-claim declared support, revision or contradiction. The index does not infer semantic equivalence between differently worded claims, silently resolve reviewer disagreement, or certify any person as a reviewer. A separate source-review dossier is the sole factual input; every crosswalk can be regenerated from that immutable note set and the original unsigned paper review packet. It does **not** join or modify the canonical verified research ZIP.
