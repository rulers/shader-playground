void main() {
    vec2 p = uv(), h = cell();
    float a = texture(pressureTex, p - vec2(h.x, 0)).r + texture(pressureTex, p + vec2(h.x, 0)).r + texture(pressureTex, p - vec2(0, h.y)).r + texture(pressureTex, p + vec2(0, h.y)).r;
    fragColor = vec4((a - texture(divergenceTex, p).r) * .25, 0, 0, 1);
}
