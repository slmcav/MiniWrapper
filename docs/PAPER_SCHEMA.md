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
