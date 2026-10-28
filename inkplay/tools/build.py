from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]
common=(p/'src/common.glsl').read_text()
shaders={f.stem:'#version 150\n'+common+f.read_text() for f in sorted((p/'src').glob('[0-9]*.glsl'))}
(p/'shaders').mkdir(exist_ok=True)
for name,code in shaders.items():(p/'shaders'/f'{name}.frag').write_text(code)
js='window.INK_SHADERS = '+json.dumps(shaders,ensure_ascii=False)+';\n'
(p/'shaders.js').write_text(js)
s=(p/'index.html').read_text().replace('<script src="shaders.js"></script>','<script>'+js+'</script>').replace('<script src="app.js"></script>','<script>'+(p/'app.js').read_text()+'</script>')
(p/'preview.html').write_text(s)
print('Built six GLSL shaders and offline preview')
