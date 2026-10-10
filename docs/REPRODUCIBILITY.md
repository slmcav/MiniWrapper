# P6 — Offline verification and citation-level source boundaries

**Checkpoint:** 10 October 2026. The research bundle verifier is a deterministic evidence-consistency tool, not a reviewer or identity-verification service.

## Offline replication of the exported research archive

An exported manuscript ZIP contains the complete source study JSON and full framebuffer bytes; a separate methodology audit; the manuscript HTML, PDF, original GLSL, BibTeX and unsigned reviewer checklist; lossless PNG figures; and a file-level SHA-256 manifest.

Use Node.js 22 or later, from a checkout of this repository:

```sh
node scripts/verify-research-zip.mjs /path/to/glsl-research-manuscript-xxxx.zip
node scripts/verify-research-zip.mjs /path/to/glsl-research-manuscript-xxxx.zip --receipt /path/to/reproducibility-receipt.json
```

The validator checks the bounded uncompressed ZIP structure and file CRCs; reads only JSON and binary data (it **never executes archived GLSL, HTML or JavaScript**); rebuilds the figures, PNGs, full-frame measurements, source receipts, manuscript, PDF and reviewer packet; and compares the **entire regenerated ZIP byte-for-byte** against the imported one. A changed file, reference, receipt, review status, central directory or figure must fail. Successful verification returns the original manuscript, study and methodology hashes and a separately dated, unsigned verification receipt.

**Limitations:** This is an internal consistency and reproducibility check, not evidence that the original pixel data came from a particular GPU, person or independently performed study. A malicious party can construct a wholly synthetic but internally consistent archive. SHA-256 is not an authorship signature. No statistical significance, originality or publication status follows from a PASS.

The canonical archive is tied to the producing **source-code version and schema versions**. Later bibliography or formatting changes can intentionally invalidate byte-for-byte comparisons when using a different release of the verifier; archive the corresponding Git commit hash with the study and rerun against that version. Cross-version migrations need their own version-specific verification rules and must never silently rewrite historical evidence.

## Explicit claim-to-source reconciliation

| Claim scope | Primary published source | Permissible interpretation | Review boundary |
|---|---|---|---|
| GLSL ES 3.00 language | [Khronos GLSL ES 3.00 Revision 6](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), dated 29 January 2016 | Shader language semantics | Does not prove all shaders or GPUs produce identical pixels |
| WebGL2 drawing and pixel readback | [Khronos WebGL 2.0 current editor draft](https://registry.khronos.org/webgl/specs/latest/2.0/), GLSL ES 3.00 support and API sections | WebGL2 rendering and readback contract; explicitly an editor draft/work in progress | Does not prove calibration, pixel colorimetry or driver equivalence |
| Computer experiment methods | [Sacks, Welch, Mitchell and Wynn (1989)](https://doi.org/10.1214/ss/1177012413), *Statistical Science* 4(4):409–423 | Research-design background and the distinction between computer-model runs and inferential models | Their methodology does not validate confidence intervals for nine serial WebGL draws |
| Procedural noise survey | [Lagae et al. (2010)](https://doi.org/10.1111/j.1467-8659.2010.01827.x), *Computer Graphics Forum* 29(8):2579–2600 | Context for actual shader noise operators when directly relevant | Not cited by default for arbitrary shader visuals |
| Shadertoy history | [Jeremias Vila and Quilez (2013), author publication page](https://www.poljeremias.com/publication/siggraph2013/), ACM SIGGRAPH 2013 Computer Animation Festival | Background on live-coded procedural shaders | Still pending ACM publisher record reconciliation and specific manuscript suitability before promotion |

Metadata and accessible published abstracts have been cross-checked; that is **not** the same as reading all supporting passages of the full text, certifying a literature review, or obtaining identifiable independent scholarly feedback. The exported editorial packet keeps those checks pending.

## Model-based study interpretation

Three fixed treatment levels, or nine serial framebuffer draws in a cyclic order, provide a **descriptive illustration**. The app reports a full-frame encoded-channel luma proxy, not calibrated physical luminance. It does not establish experimental independence, device invariance or research novelty.

A future claim of PhD-quality original research requires a stated research question, appropriate prior-art analysis, independent experimental design, documented hardware/software conditions, inferential framework when warranted, explicit source-level reviewer signoff, and publication-format verification. The generator must not provide these claims by implication.

The approved final-product visual comp stays entirely outside GitHub.

## Exact-byte archive identification

A PASS receipt includes `archiveSha256`, the SHA-256 digest of the **original unmodified ZIP bytes** (in addition to the separately content-addressed study, audit and manuscript). This makes it possible to identify which exact exported archive a machine verification checked. The offline CLI prints the digest and includes it in `--receipt` JSON; the browser verification view also displays it. The digest is an alteration detector, **not** a digital signature, identity attestation, or a proof that the underlying GPU observations actually took place.

## Frozen source-lineage handoff

Every newly exported manuscript ZIP now contains `source-lineage.json`, pinning **20 generator, renderer, validator, editor and package files** to their Git blob SHA-1 identifiers and an exact Git snapshot commit. This file is inventoried with a SHA-256 digest in the manuscript bundle. The imported-bundle verifier must match it to the installed release before regenerating the article; different releases must not silently claim to reproduce historical output.

The regression suite independently computes `SHA-1("blob " + byte_length + NUL + bytes)` for every pinned file and fails if the working tree differs from the freeze. This enforces explicit lineage updates when rendering, bibliography or evidence code changes. Git object IDs identify public code content; they are not signatures of the developer, experimenter or reviewer. The entire exported ZIP also has its own SHA-256 receipt, distinct from all file and scientific-study digests.

Reproduce against the source snapshot identified in the archive, or obtain an explicitly reviewed compatible migration rather than overriding mismatched lineage. The snapshot may precede documentation-only commits while referring to identical pinned computational source bytes.

## Independently attributable reviewer notes

The mobile research workspace includes an optional, supplementary `glsl-lab/source-review-dossier/1` export for a human reader's citation-specific assessment. It requires the original unsigned review packet and records the manuscript/study/audit hashes, individual cited work, claim, source URL, page/section locator, assessment, rationale and self-declared reviewer name. A subsequent import checks content consistency against the original unsigned packet. **These notes are not included in the canonical research ZIP**, so external review cannot silently overwrite the frozen manuscript, PDF or source evidence. A PASS on the supplemental dossier cannot authenticate reader identity or authorize publication. The primary-source scope limits are documented in `docs/SOURCE_CLAIM_CROSSWALK.md`.

## P7 source-crosswalk provenance

A supplemental `glsl-lab/source-claim-crosswalk/1` JSON file is generated only after the original `editorial-review-packet/1` and a linked `source-review-dossier/1` pass integrity verification. It preserves the original manuscript, review-packet and dossier hashes, citation-by-citation coverage, claim-specific assessment classes and competing user-declared readings. The source URL cannot be substituted for another HTTPS document. The crosswalk is deterministic apart from its separately recorded creation time and can be rebuilt from its exact dossier.

The **publicationAuthorized** and **independentHumanVerification** fields remain false. A crosswalk showing agreement among several reader-declared notes cannot substitute for checking the actual source pages, independently establishing reader identity, reproducing an experiment, or receiving editorial authorization. The crosswalk never rewrites the manuscript ZIP.
