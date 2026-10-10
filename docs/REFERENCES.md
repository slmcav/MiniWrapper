# GLSL Lab — reference custody and manuscript-readiness register

Checkpoint: 2026-10-10. This is an editorial source-custody list, **not** an independent academic peer review or a claim that journal standards have been satisfied. The application stores the corresponding machine-readable records in `src/reference-registry.mjs` and checks DOI format, duplicate identifiers, source classes and claim applicability in automated tests.

## Source categories and permissible use

| Citation key | Work and verification source | Status | Permissible use |
|---|---|---|---|
| `khronos-glsl-es300` | Khronos Group, *The OpenGL ES Shading Language 3.00*, Revision 6 (2016); [Khronos ES registry](https://registry.khronos.org/OpenGL/index_es.php) | Metadata checked against official standards registry | GLSL ES 3.00 syntax and language-contract statements |
| `khronos-webgl2` | Khronos Group, *WebGL 2.0 Specification* (living editor draft, 2026); [official WebGL registry](https://registry.khronos.org/webgl/specs/latest/2.0/) | Metadata checked; **editor draft, not finalized journal article** | WebGL2 context and pixel-readback API behavior only |
| `sacks1989` | Sacks, J., Welch, W. J., Mitchell, T. J., and Wynn, H. P. (1989), *Design and Analysis of Computer Experiments*, *Statistical Science*, 4(4), 409–423. [DOI:10.1214/ss/1177012413](https://doi.org/10.1214/ss/1177012413) | DOI and publication metadata checked | Background on controlled computer experiments; **not** evidence that this study meets statistical assumptions |
| `lagae2010` | Lagae, A., et al. (2010), *A Survey of Procedural Noise Functions*, *Computer Graphics Forum*, 29(8), 2579–2600. [DOI:10.1111/j.1467-8659.2010.01827.x](https://doi.org/10.1111/j.1467-8659.2010.01827.x) | Publisher metadata checked | Procedural noise context **only when directly relevant**; not proof that the present shader implements a cited technique |
| `jeremias-quilez2013` | Jeremias, P., and Quilez, I., *Shadertoy: Live Coding for Reactive Shaders* (2013). [DOI:10.1145/2503541.2503644](https://doi.org/10.1145/2503541.2503644). [Author publication page](https://www.poljeremias.com/publication/siggraph2013/) | **Quarantined pending publisher-level bibliographic reconciliation** | Historical orientation only; **excluded** from the automated BibTeX until promotion |

The metadata checks do not demonstrate independent verification of *all claims within* those publications. Primary-source text review, manuscript-specific citation placement, related-work completeness and editorial verification remain distinct future gates.

## Methodology audit

The standalone `src/methodology-audit.mjs` consumes an exported three-condition or nine-frame study and invokes the existing full-data verifier. It recalculates all image samples, PNG provenance and hash-backed records before assigning evidence classes. It reports the exact authenticated study SHA-256, bibliography SHA-256, number of submitted GPU draws, design type and a set of scoped findings.

The audit explicitly records lack of independent experimental replications, actual hardware calibration, a suitable inferential uncertainty model, novelty comparison and independent manuscript sign-off. The method-audit content hash excludes only its audit timestamp; revalidation reproduces the same content from the original study.

**The academic-paper gate remains disabled** even if the study and bibliographic metadata audit both pass. A passing integrity audit is sufficient for a descriptive technical note or draft, **not** for a PhD-standard empirical result, peer-review assertion or journal-ready paper. The proposed future manuscript must cite the exact frozen study and include its experimental limitations, not reconstruct values from mutable UI state.

## Next research/editorial gates

Independent acquisition sessions with documented GPU/driver/environment constraints; appropriately justified experimental design and uncertainty analysis; relevant-work source reading and citation-level sign-off; substantive human review; manuscript-style and PDF/HTML rendering with source-level figure audit. Do not place the approved UI visual contract into the repository.