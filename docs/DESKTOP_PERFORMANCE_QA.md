# GLSL Lab / MiniWrapper - desktop WebGL performance remediation

## Scope and frozen scientific semantics

This release addresses **live presentation cost**, not experimental measurement algorithms. The initial classic editor scaled pixels by up to `2 * devicePixelRatio * resolution` without a desktop fragment-budget ceiling and issued a draw on every display refresh. Shader workloads with up to ~100 raymarching iterations per pixel can disproportionately load a high-resolution/high-refresh display. The Lab separately performed canvas geometry measurement and `gl.getError()` on every frame.

### Live preview policy

| Surface | Desktop Balanced mode | Full detail | Phone (<=820px) |
| --- | --- | --- | --- |
| Classic | Max 520,000 fragment pixels/frame, drawn at most 60 fps | User-selected scale without preview pixel cap | Original scale and presentation |
| GLSL Lab | Max 390,000 fragment pixels/frame, drawn at most 60 fps | Original device-pixel-ratio preview | Original scale and presentation |

The budget is applied to **both dimensions equally**, preserving the rendered aspect ratio. Explicit Full detail remains available when more live pixel detail is wanted. The classic's 50/75/100% selection is retained. These numbers are *target limits*, not a guaranteed frame rate or a diagnosis of a particular graphics card.

Both renderers cease scheduling preview draws when the canvas leaves the visible viewport and resume when visible. Shader animation uses wall-clock timestamps rather than interpreting a skipped presentation tick as a fixed simulation step. The Lab caches canvas geometry and recomputes it only on resize/profile changes.

### Scientific source integrity

For controlled research observations the Lab still executes an explicit WebGL draw, checks GL errors and reads the **actual RGBA8 framebuffer pixels**, recording their exact viewport dimensions in every observation. All released measurement, manuscript, SHA-256, image and reproduction checks remain in place. Live preview error checks are sampled after compilation and periodically; **all exported build receipts independently check `gl.getError()` at capture**. Full-resolution scientific evidence means the complete actual selected framebuffer, not a fictitious claim of a larger reference raster.

Changing the preview profile invalidates the previous build evidence until the new framebuffer is successfully rendered. A shift in canvas pixel dimensions yields a different valid observed image, correctly reflected in its hash; it is not presented as the same experiment.

### Researcher-facing diagnostics

Classic and Lab show observed preview framebuffer dimensions and a one-second average presentation FPS, never an invented device benchmark. Hovering the metric exposes the browser-reported WebGL renderer; a software fallback such as SwiftShader is flagged in the classic editor. GPU vendor names are *local diagnostic observations*, not guarantees about the physical adapter used by the OS.

If desktop performance remains poor with Balanced selected, verify the browser is actually using hardware acceleration via `chrome://gpu` or `edge://gpu`. Compare the reported WebGL renderer against the expected discrete GPU. Driver configuration, GPU selection and browser security settings are independent of GLSL Lab source.

### Verification

- Desktop browser E2E proves the classic framebuffer stays within the 520k pixel ceiling at a large viewport, drawn frames are bounded, and the phone's scale formula is preserved.
- Lab browser E2E validates actual live FPS text, the 390k pixel ceiling, offscreen pause/resume, and unchanged shader identity when changing preview detail.
- WebGL error-query E2E verifies that continuous previews do not synchronously query the GPU driver every frame, but a research receipt always does.
- Existing source hash, lossless RGBA capture, source quarantine, nine-draw experiment, PDF and full graduate workflow E2E gates remain mandatory.

These tests run on CI's software WebGL renderer and cannot demonstrate the actual frame rate of a user's RTX 4070 Ti. A device-specific performance claim requires a measured test on that machine.

## References

- Khronos Group, [WebGL 2.0 Specification](https://registry.khronos.org/webgl/specs/latest/2.0/) - context, framebuffer, draw and readback API behavior.
- Khronos Group, [OpenGL ES 3.0 Specification](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf) - command submission, error state and rendering semantics.
