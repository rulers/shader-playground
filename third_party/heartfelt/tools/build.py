"""Build the GLSL 150 adaptation from the attributed upstream source."""
from pathlib import Path
p = Path(__file__).resolve().parents[1]
s = (p / 'original.glsl').read_text()
preamble = '''#version 150
// KodeLife adaptation, 2026. CC BY-NC-SA 3.0; see NOTICE.md.
// Original: https://www.shadertoy.com/view/ltffzl
uniform vec2 resolution;
uniform float time;
out vec4 fragColor;

// 0: built-in procedural lights; 1: your image, with mipmaps enabled.
#define USE_IMAGE 0
// Rain-only mode: -1 = automatic, otherwise 0..1.
const float RAIN_AMOUNT = -1.0;
const float TIME_OFFSET = 0.0;
#if USE_IMAGE
uniform sampler2D backgroundTexture;
#endif
#define iResolution vec3(resolution, 1.0)
#define iTime (time + TIME_OFFSET)
#define iMouse vec4(0.0)

// Explicitly support descending/equal edges (undefined in GLSL smoothstep).
float safeStep(float a, float b, float x) {
    if (abs(b-a) < 1e-7) return step(a, x);
    float u = clamp((x-a)/(b-a), 0.0, 1.0);
    return u*u*(3.0-2.0*u);
}

// New background: analytic Gaussian lights, no external media required.
// Variance grows with LOD, approximating blur while preserving light energy.
vec3 sampleBackground(vec2 uv, float lod) {
#if USE_IMAGE
    return textureLod(backgroundTexture, uv, lod).rgb;
#else
    vec3 col = mix(vec3(.025,.045,.08), vec3(.12,.18,.24), clamp(uv.y,0.,1.));
    vec2 q = uv;
    q.x *= resolution.x / max(resolution.y, 1.0);
    float blur = exp2(lod) / 720.0;
    for (int i=0; i<36; ++i) {
        float k = float(i);
        vec2 pos = vec2(fract(sin(k*17.13+1.)*437.1)*1.8,
                        .08+fract(sin(k*31.7+4.)*719.3)*.75);
        float r = .006+.016*fract(sin(k*7.7)*451.);
        float variance = r*r+blur*blur;
        vec2 d = q-pos;
        vec3 tint = mix(vec3(1.,.24,.07),vec3(.12,.65,1.),step(.5,fract(k*.618)));
        col += tint*2.5*(r*r/variance)*exp(-dot(d,d)/(2.*variance));
    }
    return col;
#endif
}

'''
s = s.replace('#define S(a, b, t) smoothstep(a, b, t)', '#define S(a, b, t) safeStep(a, b, t)')
# Remove the heart-only branches; preserve their rain-mode else branches.
lines = []
in_heart = False
keep = True
for line in s.splitlines():
    if line.strip() == '#define HAS_HEART':
        continue
    if line.strip() == '#ifdef HAS_HEART':
        in_heart, keep = True, False
        continue
    if in_heart and line.strip() == '#else':
        keep = True
        continue
    if in_heart and line.strip() == '#endif':
        in_heart, keep = False, True
        continue
    if keep and 'HAS_HEART' not in line:
        lines.append(line)
s = '\n'.join(lines)
s = s.replace('    float heart = 0.;', '')
s = s.replace('    //col = vec3(heart);', '')
s = s.replace('vec3 col = textureLod(iChannel0, UV+n, focus).rgb;', 'vec3 col = sampleBackground(UV+n, focus);')
s = s.replace('float maxBlur = mix(3., 6., rainAmount);', 'if (RAIN_AMOUNT >= 0.0) rainAmount = clamp(RAIN_AMOUNT, 0.0, 1.0);\n    float maxBlur = mix(3., 6., rainAmount);')
(p / 'heartfelt_kodelife.frag').write_text(preamble+s+'\n\nvoid main() { mainImage(fragColor, gl_FragCoord.xy); }\n')
