# MiniWrapper

A **single-file browser wrapper** for compact GLSL fragment-shader expressions. Open `index.html` in a browser with **WebGL2** enabled; the supplied demos are preloaded in the selector and render automatically. No build system, external libraries, accounts, or server are required.

## GLSL Lab (mobile-first Play prototype)

[Open GLSL Lab](glsl-lab.html) from the button at the top of the classic editor, or open [the dedicated page](glsl-lab.html) directly. The Lab is a separate static HTML page so the 17-demo classic editor and its video recording remain unchanged.

The **Play** panel currently supports three source demos (Original field, Rotating 3D fractal, Log-polar bloom), all credited to **@YoheiNishitsuji**. Its five real-time controls are Shape size (zoom), Turn the view (orientation), Movement speed (time), Color shift (HSV hue), and Brightness (HSV value). The controls update WebGL2 uniforms without recompiling the shader; changing the selected demo compiles that demo once.

The preview stays visible while scrolling on small screens. **Understand · Code** shows the unchanged compact GLSL expression and the currently applied parameter values. Pause, restart, reset controls, copy expression, and Save PNG are available. This is an intentionally limited **Play prototype**, not a claim that arbitrary GLSL can be automatically converted into draggable blocks. The other 14 demos, custom shader authoring, and native video export remain in the classic editor.

This page uses plain HTML/CSS/JavaScript with no build step or dependency. GitHub Pages serves it at `/MiniWrapper/glsl-lab.html`.

## Run

1. Open [`index.html`](index.html) directly in a current desktop or mobile browser with WebGL2 support.
2. Pick a demo from **Demos** or edit/replace the shader **body** in the textbox.
3. Select **Render** (or Ctrl/Command + Enter). Use **Pause**, **Resume**, **Reset time**, and **Resolution** as needed.
4. Use **Download PNG** for a still frame or **Record video** to capture an animation when the browser supports native canvas recording.

The app compiles the textbox text into a GLSL ES 3.00 fragment shader, draws a full-screen quad, updates time every frame, and reports compile/link errors directly below the editor. If WebGL2 is unavailable, it reports that instead of crashing.

## Included demos

All **17 supplied shader demos** are credited to **@YoheiNishitsuji**. MiniWrapper preserves the supplied compact expressions verbatim in the demo selector, with compatibility initialization applied only when compiling. Demos 4–17 are the additional snippets from the October 2026 batch.

### 1. Original field (@YoheiNishitsuji)

```glsl
float i,e,R,s;vec3 q,p,d=vec3(FC.xy/r*.4-vec2(.2,-.8),1);for(q.zy--;i++<70.;){o.rgb+=hsv(.59,R,min(e*s-.15,1.)/40.);s=4.;p=q+=d*e*R*.3;p=vec3(log(R=length(p*1.3)),exp2(-p.z/R),atan(p.y,p.x)*s-t*.3);for(e=--p.y;s<1e3;s+=s)e+=sin(dot(cos(p*s),sin(p.xyx*s+t*.9)))/s*.5;}
```

### 2. Rotating 3D fractal (@YoheiNishitsuji)

```glsl
for(float i,g,e,s;++i<99.;o.rgb+=.01-hsv(.1,g*.016-e*.3,s/2e2)){vec3 p=vec3((FC.xy-.5*r)/r.y*5.+vec2(0,9),g)*rotate3D(-1.1-cos(t*.15)*.1,vec3(1,11.+sin(t)*.15,-1.5));s=2.;for(int i;i++<19;p=vec3(.08,4,-1)-abs(abs(p)*e-vec3(3,4,3)))s*=e=7.1/dot(p,p*.51);g+=p.y/s;s=log2(s)/exp(e);}
```

### 3. Log-polar bloom (@YoheiNishitsuji)

```glsl
float i,e,R,s;vec3 q,p,d=vec3((FC.xy-.5*r)/r.y,.8);for(q.z--;i++<99.;){o.rgb+=hsv(.1,-e,e/1.5e1);p=q+=d*max(e,.004)*R*.22;p=vec3(log2(R=length(p))-t*.3,e=asin(-p.z/R-.01)-.9,atan(p.x,p.y)*2.5-t*.3);for(s=2.;s<1e3/(i*.3);s+=s)e+=abs(dot(sin(p.yzx*s),cos(p.yzx*s)))/s;}
```

### Demos 4–17

The remaining fourteen expressions are included verbatim in `index.html` and are selectable as **Demo 4** through **Demo 17** (each labeled `(@YoheiNishitsuji)`). These cover iterative log-polar transformations, rotated fields, harmonic ray-marching, particle-like projections, and other procedural fragment programs. The numbered names intentionally avoid inventing original titles for unnamed snippets.

A few source expressions leave local counters uninitialized; Demo 5 also references an otherwise undeclared `s`. MiniWrapper supplies deterministic fallback initializations in the compiled shader rather than silently modifying the saved/demo expressions. For Demo 5, `s=0.` is an implementation fallback, **not** a value supplied by the original expression.

## Symbols supplied by the wrapper

| Symbol | GLSL type | Meaning |
| --- | --- | --- |
| `FC` | `vec2` | Current pixel coordinates (`gl_FragCoord.xy`), in framebuffer pixels |
| `r` | `vec2` | Current framebuffer resolution in pixels |
| `t` | `float` | Elapsed animation time in seconds; starts at 0 on Render/Reset |
| `o` | `vec4` | RGBA fragment output; initialized to opaque black for each pixel |
| `hsv(h,s,v)` | `vec3` | HSV-to-RGB conversion returning a color to add to `o.rgb` |
| `rotate3D(angle, axis)` | `mat3` | Axis-angle 3D rotation matrix helper used by the rotating fractal demo |
| `rotate2D(angle)` | `mat2` | 2D planar rotation matrix for shader snippets that multiply `vec2` values by a matrix |
| `PI` | `float` | Mathematical constant π used by Demo 5 |

## Portability notes

Several compact mini-shader snippets rely on implicit starting values that are not guaranteed by GLSL. The wrapper includes additional narrowly targeted initialization patterns for the new demo loop counters and vectors, alongside the original patterns. To keep the demos reproducible across drivers, the wrapper normalizes a few known declaration patterns during compilation:

```glsl
float i=0.,e=1.,R=1.,s=4.;
vec3 q=vec3(0.),p=vec3(0.),d=...;
for(float i=0.,g=0.,e=0.,s=0.; ... )
for(int i=0; ... )
```

The user-visible textbox retains the original compact expressions. Only these known declarations are normalized during compilation; the mathematical bodies of the shaders are unchanged.

## Export support

- **PNG** export uses the current canvas frame.
- **WebM/MP4** export (depending on browser support) uses the browser's native `canvas.captureStream()` and `MediaRecorder` support. A pulsing red dot appears immediately to the right of the recording button while the recorder is active, disappearing on Stop, recording completion, or an error.
- On browsers without native recording support, the video recording button is disabled.

## Files

- `index.html` — fully standalone editor, GLSL compiler, WebGL2 canvas, animation loop, demo selector, and export controls.
- `glsl-lab.html` — mobile-first Play/Understand workspace with three original demos, five live GPU controls, and PNG export.
- `README.md` — usage and explanation of the supplied functions.

## Browser compatibility and performance

WebGL2 support and a GPU/driver capable of compiling the provided loops are required. The default **75% rendering scale** reduces load on mobile devices; choose 50% for slower devices or 100% for maximum detail. A compile or driver failure is shown in the on-page status area. The loop structures are computationally intensive, and visuals/performance may vary by GPU.

## Deployment

This is a static site. Open `index.html` as a local file or serve the repository with any static web host. If you enable GitHub Pages for this repository, publish the root containing `index.html`. No backend is needed.