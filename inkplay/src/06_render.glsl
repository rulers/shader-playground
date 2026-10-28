void main() {
    vec2 p = uv();
    vec3 density = texture(pigmentTex, p).rgb;
    float grain = hash(gl_FragCoord.xy) * .014;
    vec3 paper = vec3(.985, .978, .957) - grain;
    fragColor = vec4(paper * exp(-density * 1.4), 1);
}
