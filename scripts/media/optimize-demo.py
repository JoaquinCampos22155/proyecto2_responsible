from pathlib import Path
from PIL import Image
import json, hashlib
root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'docs/qa/demo-image-prompts.json').read_text())
out=root/'frontend/public/demo-news';out.mkdir(parents=True,exist_ok=True)
for entry in manifest['images']:
    image=Image.open(entry['path']).convert('RGB')
    entry['variants']=[]
    for width in (480,800,1200):
        target=out/f"{entry['id']}-{width}.webp"
        resized=image.resize((width,round(image.height*width/image.width)),Image.Resampling.LANCZOS)
        resized.save(target,'WEBP',quality=78,method=6)
        entry['variants'].append({'width':width,'height':resized.height,'bytes':target.stat().st_size,'path':str(target.relative_to(root))})
        target.with_suffix('.webp.json').write_text(json.dumps({'prompt':entry['prompt'],'origin':'Built-in image_gen; resized and encoded to WebP without semantic editing'},indent=2))
    primary=root/entry['variants'][-1]['path']
    entry['revision']=hashlib.sha256(primary.read_bytes()).hexdigest()[:16]
(root/'docs/qa/demo-image-prompts.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'images':len(manifest['images']),'variants':sum(len(e['variants']) for e in manifest['images']),'totalBytes':sum(v['bytes'] for e in manifest['images'] for v in e['variants']),'largestBytes':max(v['bytes'] for e in manifest['images'] for v in e['variants'])}))
