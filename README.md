# MiniWrapper

A **single-file browser wrapper** for compact GLSL fragment-shader expressions. Open `index.html` in a browser with **WebGL2** enabled; the supplied demos are preloaded in the selector and render automatically. No build system, external libraries, accounts, or server are required.

## Run

1. Open [`index.html`](index.html) directly in a current desktop or mobile browser with WebGL2 support.
2. Pick a demo from **Demos** or edit/replace the shader **body** in the textbox.
3. Select **Render** (or Ctrl/Command + Enter). Use **Pause**, **Resume**, **Reset time**, and **Resolution** as needed.
4. Use **Download PNG** for a still frame or **Record video** to capture an animation when the browser supports native canvas recording.

The app compiles the textbox text into a GLSL ES 3.00 fragment shader, draws a full-screen quad, updates time every frame, and reports compile/link errors directly below the editor. If WebGL2 is unavailable, it reports that instead of crashing.

## Included demos

All three supplied shader demos are credited to **@YoheiNishitsuji**. MiniWrapper preserves their compact expressions in the demo selector.

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

## Symbols supplied by the wrapper

| Symbol | GLSL type | Meaning |
| --- | --- | --- |
| `FC` | `vec2` | Current pixel coordinates (`gl_FragCoord.xy`), in framebuffer pixels |
| `r` | `vec2` | Current framebuffer resolution in pixels |
| `t` | `float` | Elapsed animation time in seconds; starts at 0 on Render/Reset |
| `o` | `vec4` | RGBA fragment output; initialized to opaque black for each pixel |
| `hsv(h,s,v)` | `vec3` | HSV-to-RGB conversion returning a color to add to `o.rgb` |
| `rotate3D(angle, axis)` | `mat3` | Axis-angle 3D rotation matrix helper used by the rotating fractal demo |

## Portability notes

Several compact mini-shader snippets rely on implicit starting values that are not guaranteed by GLSL. To keep the demos reproducible across drivers, the wrapper normalizes a few known declaration patterns during compilation:

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
- `README.md` — usage and explanation of the supplied functions.

## Browser compatibility and performance

WebGL2 support and a GPU/driver capable of compiling the provided loops are required. The default **75% rendering scale** reduces load on mobile devices; choose 50% for slower devices or 100% for maximum detail. A compile or driver failure is shown in the on-page status area. The loop structures are computationally intensive, and visuals/performance may vary by GPU.

## Deployment

This is a static site. Open `index.html` as a local file or serve the repository with any static web host. If you enable GitHub Pages for this repository, publish the root containing `index.html`. No backend is needed.