# MiniWrapper

A **single-file browser wrapper** for compact GLSL fragment-shader expressions. Open `index.html` in a browser with **WebGL2** enabled; the supplied example is preloaded in the editor and renders automatically. No build system, external libraries, accounts, or server are required.

## Run

1. Open [`index.html`](index.html) directly in a current desktop or mobile browser with WebGL2 support.
2. Edit or replace the shader **body** in the textbox.
3. Select **Render** (or Ctrl/Command + Enter). Use **Pause**, **Resume**, **Reset time**, and **Resolution** as needed.

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

### How the expression works

The expression forms a view ray `d` from pixel location and resolution, advances a sample position `q` for up to **70 iterations**, and accumulates color into the pixel output. Within each iteration, it transforms the sample using logarithmic radial length, an exponential term, and a polar angle. An inner loop doubles `s` from **4** while `s < 1000`, adding a multiscale trigonometric perturbation to `e`. Time `t` animates the transformed field. This describes the computation rather than promising a specific physical interpretation of the imagery.

### Portability note: explicit initialization

The source snippet declares `i`, `e`, `R`, `s`, `q`, and `p` without values, then reads several of them before assignment. GLSL does **not guarantee useful initial values** for these locals. To avoid undefined/driver-dependent behavior, the browser wrapper recognizes these declaration patterns and compiles them with deterministic seeds:

```glsl
float i=0.,e=1.,R=1.,s=4.;
vec3 q=vec3(0.),p=vec3(0.),d=...;
```

The user-visible textbox retains the **original expression verbatim**. Only the declarations above are normalized during compilation; the marching and perturbation equations are unchanged. These seed values are a reproducibility choice, **not** proven original author intent, and other seeds can change the generated image. If you are writing a different shader, initialize its variables explicitly.

## Files

- `index.html` — fully standalone editor, GLSL compiler, WebGL2 canvas, animation loop, and controls.
- `README.md` — usage and explanation of the supplied function.

## Browser compatibility and performance

WebGL2 support and a GPU/driver capable of compiling the provided loops are required. The default **75% rendering scale** reduces load on mobile devices; choose 50% for slower devices or 100% for maximum detail. A compile or driver failure is shown in the on-page status area. The original loop structure is computationally intensive, and visuals/performance may vary by GPU.

## Deployment

This is a static site. Open `index.html` as a local file or serve the repository with any static web host. If you enable GitHub Pages for this repository, publish the root containing `index.html` (subject to repository visibility and account permissions). No backend is needed.