void main() {
    vec2 p = uv(), h = cell();
    vec2 g = .5 * vec2(texture(pressureTex, p + vec2(h.x, 0)).r - texture(pressureTex, p - vec2(h.x, 0)).r, texture(pressureTex, p + vec2(0, h.y)).r - texture(pressureTex, p - vec2(0, h.y)).r);
    vec2 v = velocity(p) - g;
    if(p.x < h.x || p.x > 1. - h.x)
        v.x = 0.;
    if(p.y < h.y || p.y > 1. - h.y)
        v.y = 0.;
    fragColor = vec4(v, 0, 1);
}
