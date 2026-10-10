# MiniWrapper

A **single-file browser wrapper** for compact GLSL fragment-shader expressions. Open `index.html` in a browser with **WebGL2** enabled; the supplied example is preloaded in the editor and renders automatically. No build system, external libraries, accounts, or server are required.

## Run

1. Open [`index.html`](index.html) directly in a current desktop or mobile browser with WebGL2 support.
2. Edit or replace the shader **body** in the textbox.
3. Select **Render** (or Ctrl/Command + Enter). Use **Pause**, **Resume**, **Reset time**, and **Resolution** as needed.
4. Choose **Rotating 3D fractal** from the **Example** menu to load and render the second compact shader without retyping it.

The app compiles the textbox text into a GLSL ES 3.00 fragment shader, draws a full-screen quad, updates time every frame, and reports compile/link errors directly below the editor. If WebGL2 is unavailable, it reports that instead of crashing.

## Original shader function

The textbox is populated with the exact original compact expression:

```glsl
float i,e,R,s;vec3 q,p,d=vec3(FC.xy/r*.4-vec2(.2,-.8),1);for(q.zy--;i++<70.;){o.rgb+=hsv(.59,R,min(e*s-.15,1.)/40.);s=4.;p=q+=d*e*R*.3;p=vec3(log(R=length(p*1.3)),exp2(-p.z/R),atan(p.y,p.x)*s-t*.3);for(e=--p.y;s<1e3;s+=s)e+=sin(dot(cos(p*s),sin(p.xyx*s+t*.9)))/s*.5;}
```

This is a **fragment-shader body**, not a JavaScript function or a complete shader program. The wrapper supplies the declarations, the `main()` function, the HSV-to-RGB helper, and the drawing pipeline.

### Symbols supplied by the wrapper

| Symbol | GLSL type | Meaning |
| --- | --- | --- |
| `FC` | `vec2` | Current pixel coordinates (`gl_FragCoord.xy`), in framebuffer pixels |
| `r` | `vec2` | Current framebuffer resolution in pixels |
| `t` | `float` | Elapsed animation time in seconds; starts at 0 on Render/Reset |
| `o` | `vec4` | RGBA fragment output; initialized to opaque black for each pixel |
| `hsv(h,s,v)` | `vec3` | HSV-to-RGB conversion returning a color to add to `o.rgb` |
| `rotate3D(angle,axis)` | `mat3` | Axis-angle rotation matrix, with angle in radians and axis as a `vec3`; supported with `vec3 * mat3` and `mat3 * vec3` |

### How the expression works

The expression forms a view ray `d` from pixel location and resolution, advances a sample position `q` for up to **70 iterations**, and accumulates color into the pixel output. Within each iteration, it transforms the sample using logarithmic radial length, an exponential term, and a polar angle. An inner loop doubles `s` from **4** while `s < 1000`, adding a multiscale trigonometric perturbation to `e`. Time `t` animates the transformed field. This describes the computation rather than promising a specific physical interpretation of the imagery.

## Rotating 3D fractal example

The **Rotating 3D fractal** preset contains this second expression exactly as supplied:

```glsl
for(float i,g,e,s;++i<99.;o.rgb+=.01-hsv(.1,g*.016-e*.3,s/2e2)){vec3 p=vec3((FC.xy-.5*r)/r.y*5.+vec2(0,9),g)*rotate3D(-1.1-cos(t*.15)*.1,vec3(1,11.+sin(t)*.15,-1.5));s=2.;for(int i;i++<19;p=vec3(.08,4,-1)-abs(abs(p)*e-vec3(3,4,3)))s*=e=7.1/dot(p,p*.51);g+=p.y/s;s=log2(s)/exp(e);}
```

`rotate3D(float angle, vec3 axis)` is **not a built-in GLSL function**. MiniWrapper supplies an axis-angle `mat3` helper; its exact rotation convention depends on operand order: `vec3 * mat3` treats the vector as a row and is the transpose/inverse of `mat3 * vec3` for the same angle and axis. The chosen implementation preserves the snippet's original operand order.

The expression also declares loop counters and accumulators without initialization. The wrapper seeds this **specific** float loop with `i=0.,g=0.,e=0.,s=0.` and its nested `int i` loop with `i=0`, preventing driver-dependent starting values. Shader arithmetic inside the loops remains unchanged. This shader runs up to 98 outer iterations and 19 inner iterations per pixel and may be expensive on mobile GPUs; switch to 50% Resolution if needed.

### Portability note: explicit initialization

The source snippet declares `i`, `e`, `R`, `s`, `q`, and `p` without values, then reads several of them before assignment. GLSL does **not guarantee useful initial values** for these locals. To avoid undefined/driver-dependent behavior, the browser wrapper recognizes these declaration patterns and compiles them with deterministic seeds:

```glsl
float i=0.,e=1.,R=1.,s=4.;
vec3 q=vec3(0.),p=vec3(0.),d=...;
```

The user-visible textbox retains the **original expression verbatim**. The rotation example's loop declarations are also normalized as described above. Only these known declaration patterns are normalized during compilation; shader equations are unchanged. These seed values are a reproducibility choice, **not** proven original author intent, and other seeds can change the generated image. If you are writing a different shader, initialize its variables explicitly.

## Files

- `index.html` — fully standalone editor, GLSL compiler, WebGL2 canvas, animation loop, and controls.
- `README.md` — usage and explanation of the supplied function.

## Browser compatibility and performance

WebGL2 support and a GPU/driver capable of compiling the provided loops are required. The default **75% rendering scale** reduces load on mobile devices; choose 50% for slower devices or 100% for maximum detail. A compile or driver failure is shown in the on-page status area. The original loop structure is computationally intensive, and visuals/performance may vary by GPU.

## Deployment

This is a static site. Open `index.html` as a local file or serve the repository with any static web host. If you enable GitHub Pages for this repository, publish the root containing `index.html` (subject to repository visibility and account permissions). No backend is needed.