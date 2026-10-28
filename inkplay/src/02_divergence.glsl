void main() {
    vec2 p = uv(), h = cell();
    float d = .5 * (velocity(p + vec2(h.x, 0)).x - velocity(p - vec2(h.x, 0)).x + velocity(p + vec2(0, h.y)).y - velocity(p - vec2(0, h.y)).y);
    fragColor = vec4(d, 0, 0, 1);
}
