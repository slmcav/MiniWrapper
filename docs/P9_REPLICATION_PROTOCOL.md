# P9 — Preregisterable independent GPU replication protocol (design only)

**Date:** 2026-10-10  
**Status:** PROTOCOL PROPOSAL; NO HUMAN SUBJECTS, DEVICE REPLICATION OR INFERENTIAL TEST HAS BEEN RUN  
**Parent findings:** [P8 independent methods assessment](P8_INDEPENDENT_METHODS.md), [13-row evidence register](P8_EVIDENCE_REGISTER.json), [P7 source-claim crosswalk](SOURCE_CLAIM_CROSSWALK.md).  
**Release gate:** independentHumanPeerReviewEstablished = false; publicationAuthorized = false.

## Purpose and hypotheses

Study the reproducibility and portability of **measured RGBA8 WebGL2 shader output** under a preregistered shader, typed graph, uniform treatment and fixed GLSL time. This evaluates *observed framebuffer agreement*, not display photometry, device-wide GLSL compliance, shader originality, statistical significance or publication suitability.

H0 for descriptive comparisons: exact captured RGB8 channels match under a predeclared same-runtime repeated-render protocol. Cross-device differences must be reported as a distribution of observed byte or image differences; no blanket equality hypothesis is presumed. Any statistical hypothesis, variance model or equivalence margin must be preregistered **before outcome inspection**, with reasoning from application needs and an independent pilot. Never select margins post hoc to convert a failure into a pass.

## Experimental units versus observations

A **GPU draw** is one measurement. Three draws in an existing nine-slot counterbalanced session are dependent repeated observations. A **capture session** is a separate initiated protocol run and may also be dependent on previous runs. Define the intended experimental population first: (i) *the same specific browser/GPU stack across restarts*, or (ii) *different GPU/device/browser combinations*. Neither three frames nor nine frames create multiple independent devices. For cross-device inference, independently selected, physically distinct devices/driver stacks—not pixels, frames or merely a repeated URL open—are the high-level sample units.

Treat the device/driver/browser stack as a nested unit with sessions within stacks and draws within sessions. Keep raw unit identifiers pseudonymous and access controlled. If only one stack or one independently launched session is available, report the data **descriptively**; do not compute a population confidence interval or effect p-value. Avoid cross-session independence claims without measured environmental conditions and a justified sampling model.

## Proposed acquisition sequence

1. **Freeze the application and stimuli.** Archive exact Git commit, provenance manifest, source shaders, typed graph, vertex/fragment source, framebuffer dimensions, WebGL uniforms, GLSL time, RGBA8 format and deterministic PNG encoder version. Retain SHA-256 of full source and all raw bytes. Obtain author/license permissions before publication.
2. **Declare device sample frame before exposure to outcomes.** For each stack record a pseudonymous study ID, GPU vendor/model and driver *where permission and platform access allow*, operating system, browser/WebGL build, extensions, precision values, devicePixelRatio, framebuffer format, color-space assumptions, shader compiler warnings, context recovery events, GPU warm-up and thermal state. Existing masked WebGL capability labels alone are not device attestations. Record unavailable variables as unavailable.
3. **Perform an independent preflight** on a known reference shader and readback buffer, with explicit pass/fail logs, WebGL errors and WebGL context-loss monitoring. Ineligible devices and exclusions follow the prespecified rule; none are excluded after comparing target outputs.
4. **Control treatment and order.** Define three scalar uniform levels and a fixed GLSL time. The existing A/B/C, B/C/A, C/A/B schedule balances *serial position* only and is **not randomization or carryover elimination**. For a new design, preregister session-level random assignment to independent balanced orders, reset states where feasible, measure period/carryover, and separate verification-frame draws from analysis units. Collect independent session restarts as explicitly defined, without pretending such restarts are independent devices.
5. **Capture original bytes.** For each draw retain requested uniforms, drawSequence, monotonically recorded clock when available, readback time and browser UTC clock, RGBA8 bytes, PNG bytes, checksum, source/build/study record, ordering and all failures. Check actual framebuffer orientation and pixel pack state. Derive frame-wide encoded-RGB means and RGB8 pairwise differences **only from archived bytes**. Maintain a frozen missingness/exclusion log.
6. **Attempt independent replay.** A second investigator or machine reconstructs exported measurements and images using the frozen source tree and pinned version. Record command output and artifact hashes. A byte-identical replay is *data-consistency reproduction*, not evidence that the original device and sensor circumstances were authentic.
7. **Conduct cross-device acquisition** using the same locked protocol and documented hardware diversity. Publish the full matrix of available/evaluated stacks, failures, skipped treatments and nonmatching outputs. Analyze a hierarchy of devices, sessions and within-session draws; do not treat all pixels as independent outcomes.
8. **Separate colorimetry and performance studies.** Encoded-channel luminance proxies cannot become linear-light/physical luminance without verified framebuffer encoding and a calibrated color-transfer model. CPU-observed times and blocking `readPixels` calls cannot be reported as isolated GPU execution time; timer-query benchmarks require separately validated instrumentation and disjoint handling.
9. **Freeze the analysis plan** before data collection ends, including tolerance, primary effect metric, multiplicity, missingness, stability analysis and sensitivity analyses. A data-dependent choice of margin or post hoc design must be labeled exploratory. If sample size does not support inference, report raw/descriptive results.
10. **Human methodological release** is a separate accountable action after source passages, rights, full reproducibility logs and venue PDF inspection. Software may display these requirements but cannot satisfy or sign them.

## Primary outcome and calculation contract

Primary observational outputs: frame-wide mean absolute RGB8 channel difference between declared matched trials, maximum absolute RGB8 channel difference, fraction of changed RGB pixels, and exact-equality count. Each difference is paired only where shader/graph/parameter/GLSL time/size/capture semantics match under the preregistered design. Secondary observational outputs: mean of encoded-channel luma proxy and per-treatment descriptive n, min/max and standard deviation. Define *image location and channel ordering* from the archive. Missing/failing frames count toward the retention and error audit, not toward invented data.

If estimating portability, specify the unit-level aggregate (for example the mean of session medians per device), target population and dependence structure in advance. Do not use a pixel bootstrap or all nine draws as independent device-level replicates. Report every device's deviation rather than reducing cross-device heterogeneity to a single PASS badge.

## Minimal provenance specimen record (not a measured result)

```json
{
  "schema": "glsl-lab/external-replication-plan/1",
  "status": "NOT_EXECUTED",
  "p8Claims": ["P8-C03", "P8-C05", "P8-C06", "P8-C07", "P8-C12"],
  "appSourceCommit": null,
  "experimentUnitDefinition": null,
  "deviceSamplingPlan": null,
  "driverBrowserControls": null,
  "predeclaredEquivalenceMargin": null,
  "primaryEndpoint": "mean absolute RGB8 channel difference",
  "observedDraws": 0,
  "independentlySelectedDeviceStacks": 0,
  "externalReviewSigned": false,
  "publicationAuthorized": false
}
```

Null means **not yet determined**; it is not a successful verification. This protocol is documentation for prospective work, not a machine-generated experimental receipt. Review decisions, authenticated identities and genuine publications are never inferred from imported user declarations or content hashes.

## Explicit methodological references

- Khronos Group. *The OpenGL ES Shading Language* (3.00, Rev. 6, 2016), particularly §§4.5–4.6, https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf.
- Khronos Group. *WebGL 2.0 Specification*, “Reading back pixels”, https://registry.khronos.org/webgl/specs/latest/2.0/.
- Sacks, J., Welch, W. J., Mitchell, T. J. and Wynn, H. P. (1989), “Design and Analysis of Computer Experiments”, *Statistical Science* 4(4):409–423, https://doi.org/10.1214/ss/1177012413.
- Hurlbert, S. H. (1984), “Pseudoreplication and the Design of Ecological Field Experiments”, *Ecological Monographs* 54(2):187–211, https://doi.org/10.2307/1942661.
- ITU-R Recommendation BT.709-6 (2015), §§3.1–3.5, https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.709-6-201506-i!!pdf-e.pdf.
- Lagae, A., et al. (2010), “A Survey of Procedural Noise Functions”, *Computer Graphics Forum* 29(8):2579–2600, https://doi.org/10.1111/j.1467-8659.2010.01827.x.

These references provide contracts and methodological framing; reading this protocol does not imply a full text audit of all papers, a study that has been run, or peer review by an external scientist.
