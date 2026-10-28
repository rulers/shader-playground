# Heartfelt — attribution and license

- Work: **Heartfelt** (2017)
- Author: **Martijn Steinrucken / BigWIngs**
- Source: https://www.shadertoy.com/view/ltffzl
- Author profile: https://www.shadertoy.com/user/BigWIngs
- Retrieved: 2026-09-27 from the public Image editor.
- License declared in the source: **Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0)**.
- License: https://creativecommons.org/licenses/by-nc-sa/3.0/
- Legal code: https://creativecommons.org/licenses/by-nc-sa/3.0/legalcode

`original.glsl` preserves the published Image source, including credits and notices. The hash function credits Dave Hoskins in the original source. Original media credits remain in its header; media files are not redistributed here.

`heartfelt_kodelife.frag` is an adaptation distributed under **CC BY-NC-SA 3.0**, not the repository's MIT license. Changes (2026): GLSL 150 entry point and KodeLife uniforms; a new procedural background with analytic blur and optional image sampler; removal of the heart story, keeping continuous rain; fixed rain amount and time offset; mouse input replaced with zero; defined handling of descending/equal smoothstep edges. Music, rain audio and the original background image are not included. The generated preview `../../tutorials/images/heartfelt.png` is also distributed under CC BY-NC-SA 3.0 with this attribution.

When sharing these files or adaptations, retain attribution, indicate changes, link the license, restrict use to noncommercial purposes, and use the same license for adaptations. This notice does not imply author endorsement or grant rights to separately sourced images/audio. See the linked license for the complete terms.

The build script generates the adaptation from the preserved source:

```sh
python3 third_party/heartfelt/tools/build.py
```

## Browser adaptation (2026-10-29)

The complete `rain/` directory (HTML, CSS and JavaScript) is distributed under **CC BY-NC-SA 3.0** as a browser adaptation of Heartfelt by Martijn Steinrucken / BigWIngs. It loads the preserved KodeLife shader and adapts the entry point to WebGL 2 / GLSL ES 3.00. Changes: adjustable rain uniform; pause/resume and restart controls; initial time set to 40 seconds; lightning flashes disabled; bounded render resolution and 30fps drawing; reduced-motion and visibility support; resize and context-recovery handling; attributed static fallback. The procedural background is retained. No original image, music or rain audio is included. The original shader's credits, including Dave Hoskins, remain in its source. These browser files are not covered by the repository's MIT license.

Further UI changes: controls start as a compact native disclosure and expand to the full panel; Escape closes the panel without changing the renderer state. Rendering failures remain visible even when the controls are collapsed. The same CC BY-NC-SA 3.0 terms apply.
