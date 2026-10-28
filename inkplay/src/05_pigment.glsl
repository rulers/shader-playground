void main() {
    vec2 p = uv(), h = cell();
    vec4 old = texture(pigmentTex, p);
 // Artistic wetting-front expansion, added to the incompressible flow.
    vec2 grad = .5 * vec2(texture(pigmentTex, p + vec2(h.x, 0)).a - texture(pigmentTex, p - vec2(h.x, 0)).a, texture(pigmentTex, p + vec2(0, h.y)).a - texture(pigmentTex, p - vec2(0, h.y)).a);
    vec2 spread = -grad * wetness * 15. * clamp(old.a * 2., 0., 1.);
    spread *= min(1., 22. / max(length(spread), .001));
    vec2 back = p - dt * (velocity(p) * clamp(old.a * 3., 0., 1.) + spread) * h;
    vec4 c = texture(pigmentTex, back);
    vec4 average = (texture(pigmentTex, back - vec2(h.x, 0)) + texture(pigmentTex, back + vec2(h.x, 0)) + texture(pigmentTex, back - vec2(0, h.y)) + texture(pigmentTex, back + vec2(0, h.y))) * .25;
    c = mix(c, average, min(.24, wetness * .13) * clamp(old.a * 3., 0., 1.));
    c.a *= exp(-dt * .18); // drying freezes marks instead of erasing them
    float s = source(gl_FragCoord.xy);
 // Store optical density, not display RGB: overlapping pigments darken.
    c.rgb += -log(clamp(inkColor, vec3(.015), vec3(.98))) * s * .38;
    c.a += s * .55;
    fragColor = clamp(c, 0., 12.);
}
