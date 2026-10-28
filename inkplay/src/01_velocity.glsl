void main() {
    vec2 p = uv(), h = cell();
    vec2 v0 = velocity(p), v = velocity(p - dt * v0 * h);
    vec2 l = velocity(p - vec2(h.x, 0)), r = velocity(p + vec2(h.x, 0));
    vec2 b = velocity(p - vec2(0, h.y)), t = velocity(p + vec2(0, h.y));
    v = mix(v, (l + r + b + t) * .25, .025) * exp(-dt * .7);
 // A fixed, spatially varying curl field breaks the bloom into folds.
    vec2 q = gl_FragCoord.xy * .055;
    vec2 curl = vec2(fbm(q + vec2(0, .08)) - fbm(q - vec2(0, .08)), fbm(q - vec2(.08, 0)) - fbm(q + vec2(.08, 0))) * 90.;
    float water = texture(pigmentTex, p).a;
    v += curl * min(water, 1.) * wetness * dt * 18.;
    vec2 d = relativePoint(gl_FragCoord.xy);
    float s = source(gl_FragCoord.xy);
 // A drop pushes outwards; hand motion carries ink along the stroke.
    v += (d / max(length(d), 1.) * 95. * wetness + impulse * .38) * s;
    float speed = length(v);
    v *= min(1., 180. / max(speed, .001));
    if(p.x < h.x || p.x > 1. - h.x)
        v.x = 0.;
    if(p.y < h.y || p.y > 1. - h.y)
        v.y = 0.;
    fragColor = vec4(v, 0, 1);
}
