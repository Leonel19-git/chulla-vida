/** Cuatro montajes regionales con fotografías reales ya acreditadas. No son filmaciones del lugar. */
import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';
const require=createRequire(import.meta.url);const ffmpeg=require('ffmpeg-static');
const registry=new Map(JSON.parse(readFileSync('scripts/place-images.json','utf8')).map(x=>[x.id,x]));
const groups={sierra:['gen-02-quilotoa-shalala','gen-09-parque-nacional-cotopaxi','gen-07-banos-de-agua-santa'],costa:['costa-07-ola-y-manglar','costa-03-pacifico-activo','costa-01-raices-de-manabi'],amazonia:['amz-01-reserva-cuyabeno','amz-10-laguna-anango','amz-12-cascada-hola-vida'],galapagos:['gal-01-bartolome-bahia-sullivan','gal-04-kicker-rock-tour-360','gal-08-tintoreras-concha-perla']};
const dir='public/video/regions';mkdirSync(dir,{recursive:true});let credits='# Videos regionales · CHULLA VIDA\n\nMontajes originales con fotografías reales de Wikimedia Commons. Tres tomas por región; movimiento y encuadre adaptados. Sin audio ni textos incrustados. Adaptaciones publicadas bajo CC BY-SA 4.0; se conservan las licencias y créditos de las fotografías de origen.\n\n';
const manifest=[];
for(const [region,ids] of Object.entries(groups)){
 const photos=ids.map(id=>{const r=registry.get(id);if(!r)throw new Error('Falta crédito '+id);return r;});
 const input=photos.flatMap(p=>{const path=resolve('public'+(p.srcLarge||p.src));if(!existsSync(path))throw new Error('Falta foto '+path);return ['-loop','1','-t','3','-i',path];});
 const filters=photos.map((_,i)=>`[${i}:v]scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,zoompan=z='1.02+on*0.0004':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=72:s=720x1280:fps=24,trim=duration=3,setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v${i}]`);
 filters.push('[v0][v1]xfade=transition=fade:duration=0.35:offset=2.65[x1]','[x1][v2]xfade=transition=fade:duration=0.35:offset=5.3[out]');
 const output=resolve(dir,region+'.mp4');const r=spawnSync(ffmpeg,['-y','-loglevel','error','-threads','2',...input,'-filter_complex_threads','1','-filter_complex',filters.join(';'),'-map','[out]','-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',output],{encoding:'utf8'});
 if(r.status!==0)throw new Error(r.stderr||r.error?.message||'No se pudo crear '+region);
 credits+='## '+region+'\n\n'+photos.map(p=>`- [${p.alt}](${p.pageUrl}) — ${p.author}. [${p.license}](${p.licenseUrl||p.pageUrl}). Encuadre vertical y movimiento suave.\n`).join('')+'\n';
 manifest.push({region,src:'/video/regions/'+region+'.mp4',durationSeconds:8.3,kind:'photo_montage',sources:photos.map(p=>({id:p.id,sourceUrl:p.pageUrl,author:p.author,license:p.license}))});console.log('Creado '+region);
}
writeFileSync(dir+'/CREDITS.md',credits.trimEnd()+'\n');writeFileSync(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
