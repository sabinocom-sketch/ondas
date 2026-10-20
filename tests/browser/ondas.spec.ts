import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {test,expect} from '../fixtures';
test.beforeEach(async({page})=>{if(process.env.ONDAS_ISOLATED){const js=readFileSync('dist-test/fixture.js','utf8');const css=readFileSync('src/styles.css','utf8');await page.route('**/*',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/')await route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>'});else if(path==='/fixture.js')await route.fulfill({contentType:'text/javascript; charset=utf-8',body:js});else await route.fulfill({status:404,body:''})})}await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Ativar áudio'}).click()});
test('teclado completo e layout sem overflow',async({page})=>{await expect(page.locator('.key')).toHaveCount(49);await expect(page.locator('.white')).toHaveCount(29);await expect(page.locator('.black')).toHaveCount(20);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByLabel('Deslocar teclado para a direita').click();await expect.poll(()=>page.locator('.piano-scroll').evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);await page.screenshot({path:'test-results/ondas-'+test.info().project.name+'.png',fullPage:true})});
test('acorde multitoque com libertação independente e cancelamento',async({page})=>{for(const [i,n] of [36,40,43].entries())await page.locator('[data-note="'+n+'"]').dispatchEvent('pointerdown',{pointerId:i+1,pointerType:'touch',bubbles:true});await expect(page.locator('.pressed')).toHaveCount(3);await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));return engine.manager.voices.size})).toBe(3);await page.locator('[data-note="40"]').dispatchEvent('pointerup',{pointerId:2,pointerType:'touch'});await expect(page.locator('.pressed')).toHaveCount(2);await page.locator('[data-note="36"]').dispatchEvent('pointercancel',{pointerId:1,pointerType:'touch'});await page.locator('[data-note="43"]').dispatchEvent('lostpointercapture',{pointerId:3,pointerType:'touch'});await expect(page.locator('.pressed')).toHaveCount(0);await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));return engine.manager.voices.size})).toBe(0)});
test('teclado físico, sustain e perda de foco',async({page})=>{await page.locator('h1').click();await page.keyboard.down('a');await page.keyboard.down('d');await page.keyboard.down('g');await expect(page.locator('.pressed')).toHaveCount(3);await page.keyboard.down('Space');await page.keyboard.up('a');await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));return engine.manager.voices.get('key:KeyA')?.released})).toBe(false);await page.keyboard.up('Space');await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));return engine.manager.voices.get('key:KeyA')?.released??true})).toBe(true);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.locator('.pressed')).toHaveCount(0);await page.keyboard.up('d');await page.keyboard.up('g')});
test('presets persistem, modificam parâmetros e podem ser eliminados',async({page})=>{await page.getByLabel('BIBLIOTECA DE SONS').selectOption('bass');await expect(page.getByLabel('Cutoff',{exact:true})).toHaveValue('500');await page.getByLabel('Nome do preset').fill('Meu baixo');await page.getByRole('button',{name:'Guardar',exact:true}).click();await page.reload();await page.getByLabel('BIBLIOTECA DE SONS').selectOption({label:'Meu baixo'});await expect(page.getByLabel('Cutoff',{exact:true})).toHaveValue('500');await page.getByRole('button',{name:'Eliminar',exact:true}).click();await expect(page.getByRole('option',{name:'Meu baixo'})).toHaveCount(0)});
test('suspensão, mudança de separador e recriação do contexto',async({page})=>{await page.locator('h1').click();await page.keyboard.down('a');await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));await engine.context.suspend()});await expect(page.locator('.pressed')).toHaveCount(0);await page.keyboard.up('a');await page.getByRole('button',{name:'Ativar áudio'}).click();await page.keyboard.down('s');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});await expect(page.locator('.pressed')).toHaveCount(0);await page.keyboard.up('s');await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));await engine.dispose()});await page.getByRole('button',{name:'Ativar áudio'}).click();await expect(page.getByText('Áudio ativo',{exact:true})).toBeVisible()});
test('áudio real: sinal, frequência, ADSR, acordes, efeitos e presets',async({page})=>{
 const results=await page.evaluate(async()=>{
 const {VoiceManager}=((window as any).__ondasTest ?? await import('/src/audio/voice-manager.ts'));const {Effects}=((window as any).__ondasTest ?? await import('/src/audio/effects.ts'));const {defaults,clonePatch}=((window as any).__ondasTest ?? await import('/src/audio/parameters.ts'));const {library}=((window as any).__ondasTest ?? await import('/src/presets/library.ts'));
 const rms=(a:Float32Array,start=0,end=a.length)=>{let s=0;for(let i=start;i<end;i++)s+=a[i]*a[i];return Math.sqrt(s/(end-start))};
 const render=async(p:any,notes=[69],fx=false,release=true)=>{const ctx=new OfflineAudioContext(2,48000*2,48000);const effects=fx?new Effects(ctx):null;if(effects)effects.update(p);const out=ctx.createGain();out.gain.value=fx?1:.04;out.connect(effects?effects.input:ctx.destination);const manager=new VoiceManager(ctx,out);notes.forEach((n,i)=>manager.noteOn('n'+i,n,p));const pause=ctx.suspend(.5);const complete=ctx.startRendering();await pause;if(release)notes.forEach((_,i)=>manager.noteOff('n'+i));await ctx.resume();const buffer=await complete;const data=buffer.getChannelData(0);const peak=data.reduce((max,x)=>Math.max(max,Math.abs(x)),0);return{data,rms:rms(data),peak,tail:rms(data,72000),voices:manager.voices.size}};
 const pure=clonePatch(defaults);pure.osc.forEach((o:any)=>{o.wave='sine';o.detune=0});pure.mix=0;pure.filter.amount=0;pure.filter.cutoff=18000;pure.amp={attack:.1,decay:.1,sustain:.5,release:.2};const single=await render(pure);
 let crossings=0;for(let i=14401;i<24000;i++)if(single.data[i-1]<=0&&single.data[i]>0)crossings++;
 const chord=await render(pure,[60,64,67]);const sixteen=await render(defaults,Array.from({length:16},(_,i)=>48+i),true);
 const presets=[];for(const preset of library){const a=await render(preset.patch,[60],true);presets.push({name:preset.name,rms:a.rms,peak:a.peak})}
 const effects=[];for(const name of ['chorus','delay','reverb','compressor']){const off=clonePatch(defaults);['chorus','delay','reverb','compressor'].forEach(n=>off[n].enabled=false);const on=clonePatch(off);on[name].enabled=true;on[name].mix=.7;on.compressor.threshold=-45;const a=await render(off,[60,64,67],true);const b=await render(on,[60,64,67],true);let diff=0;for(let i=0;i<a.data.length;i++)diff+=Math.abs(a.data[i]-b.data[i]);effects.push({name,difference:diff/a.data.length})}
 return{frequency:crossings/.2,early:rms(single.data,0,1200),sustain:rms(single.data,14400,24000),tail:single.tail,cleaned:single.voices,chord:chord.rms,sixteenPeak:sixteen.peak,presets,effects};
 });
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/audio-'+test.info().project.name+'.json',JSON.stringify(results,null,2));
 await test.info().attach('audio-measurements.json',{body:JSON.stringify(results,null,2),contentType:'application/json'});expect(results.frequency).toBeGreaterThan(430);expect(results.frequency).toBeLessThan(450);expect(results.sustain).toBeGreaterThan(results.early);expect(results.tail).toBeLessThan(.00001);expect(results.cleaned).toBe(0);expect(results.chord).toBeGreaterThan(.001);expect(results.sixteenPeak).toBeLessThan(1);expect(results.presets.every(p=>p.rms>.00001)).toBe(true);expect(new Set(results.presets.map(p=>p.rms.toFixed(6))).size).toBe(results.presets.length);expect(results.effects.every(e=>e.difference>.000001)).toBe(true);
});

test('três contactos de toque nativos mantêm captura e independência',async({page})=>{
 const client=await page.context().newCDPSession(page);
 const points=[];for(const [i,n] of [36,40,43].entries()){const box=await page.locator('[data-note="'+n+'"]').boundingBox();if(!box)throw new Error('Tecla invisível');points.push({x:box.x+box.width/2,y:box.y+box.height-28,id:i+1})}
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
 await expect(page.locator('.pressed')).toHaveCount(3);
 // CDP only ends an entire touch sequence. Independent release is covered
 // by the pointer-event test; here we verify capture while one finger moves.
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...points[0],y:points[0].y-190},points[1],points[2]]});
 await expect(page.locator('.pressed')).toHaveCount(3);
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.pressed')).toHaveCount(0);
 await client.detach();
});
test('dezasseis vozes reais, parâmetros em reprodução e limpeza',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const result=await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest ?? await import('/src/audio/engine.ts'));const {clonePatch}=((window as any).__ondasTest ?? await import('/src/audio/parameters.ts'));for(let i=0;i<16;i++)engine.noteOn('test'+i,48+i);const count=engine.manager.voices.size;const p=clonePatch(engine.patch);p.filter.cutoff=700;p.osc[0].detune=20;engine.setPatch(p);engine.noteOff('test9');engine.noteOn('extra',80);const reused=!engine.manager.voices.has('test9')&&engine.manager.voices.has('test0');const cutoff=engine.manager.voices.get('test0').patch.filter.cutoff;const latency=engine.context.baseLatency;engine.panic();return{count,reused,cutoff,latency,remaining:engine.manager.voices.size}});
 expect(result.count).toBe(16);expect(result.reused).toBe(true);expect(result.cutoff).toBe(700);expect(result.remaining).toBe(0);expect(errors).toEqual([]);await test.info().attach('context-metrics.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});

test('modo Tocar e gravação WAV real com reprodução e interrupção',async({page})=>{
 await page.getByRole('button',{name:'Tocar',exact:true}).click();
 await expect(page.locator('.modules')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Ecrã inteiro',exact:true})).toBeVisible();
 expect(await page.locator('.white').first().evaluate(e=>e.getBoundingClientRect().width)).toBe(64);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Gravar',exact:false}).click();
 await page.keyboard.down('a');
 await expect.poll(async()=>page.getByLabel('Duração da gravação').textContent(),{timeout:30000}).not.toBe('00:00');
 await page.keyboard.up('a');
 await page.getByRole('button',{name:'Parar gravação'}).click();
 const link=page.getByRole('link',{name:'Descarregar WAV'});await expect(link).toBeVisible();
 const result=await link.evaluate(async e=>{const data=await (await fetch((e as HTMLAnchorElement).href)).arrayBuffer();const ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(data.slice(0));let peak=0;for(const s of decoded.getChannelData(0))peak=Math.max(peak,Math.abs(s));return{channels:decoded.numberOfChannels,duration:decoded.duration,peak,magic:new TextDecoder().decode(data.slice(0,4))}}finally{await ctx.close()}});
 expect(result.magic).toBe('RIFF');expect(result.channels).toBe(2);expect(result.duration).toBeGreaterThan(.5);expect(result.peak).toBeGreaterThan(.001);
 const download=page.waitForEvent('download');await link.click();expect((await download).suggestedFilename()).toBe('ondas-gravacao.wav');
 await expect(page.getByLabel('Ouvir gravação')).toBeVisible();
 await page.getByRole('button',{name:'Gravar',exact:false}).click();
 await expect.poll(async()=>page.getByLabel('Duração da gravação').textContent(),{timeout:30000}).not.toBe('00:00');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});
 await expect(page.getByRole('button',{name:'Parar gravação'})).toHaveCount(0);
 await expect(page.locator('.recording p[role=status]')).toContainText('interrompida');
 await page.screenshot({path:'artifacts/tocar-'+test.info().project.name+'.png',fullPage:true});
 if(test.info().project.name!=='desktop'){await page.setViewportSize({width:900,height:420});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/tocar-horizontal-'+test.info().project.name+'.png',fullPage:true})}
 await page.getByRole('button',{name:'Explorar',exact:true}).click();await expect(page.locator('.modules')).toBeVisible();
});




test('piano isolado em ecrã inteiro, alternativa e vinte instrumentos com sinal',async({page})=>{
 await expect(page.locator('#preset option')).toHaveCount(20);
 await page.getByLabel('BIBLIOTECA DE SONS').selectOption('flute');
 await expect(page.getByLabel('Cutoff',{exact:true})).toHaveValue('2400');
 await page.getByRole('button',{name:'Piano em ecrã inteiro',exact:true}).click();
 await expect(page.locator('.piano-full')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('piano'))).toBe(true);
 const size=await page.locator('.piano-full').boundingBox();expect(size?.y).toBe(0);
 await page.keyboard.down('a');await expect(page.locator('.pressed')).toHaveCount(1);await page.keyboard.up('a');
 await page.screenshot({path:'artifacts/piano-inteiro-'+test.info().project.name+'.png'});
 await page.getByRole('button',{name:'Sair do piano em ecrã inteiro'}).click();await expect(page.locator('.piano-full')).toHaveCount(0);
 await expect(page.getByLabel('BIBLIOTECA DE SONS')).toBeEnabled();
 await page.evaluate(()=>{document.querySelector('.piano')!.requestFullscreen=()=>Promise.reject(new Error('Unsupported'))});
 await page.getByRole('button',{name:'Piano em ecrã inteiro',exact:true}).click();await expect(page.locator('.piano-full')).toBeVisible();
 expect(await page.evaluate(()=>document.querySelector('.toolbar')!.hasAttribute('inert'))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('.piano-full')).toHaveCount(0);
 expect(await page.evaluate(()=>document.querySelector('.toolbar')!.hasAttribute('inert'))).toBe(false);
 const signals=await page.evaluate(async()=>{const {library,VoiceManager}=((window as any).__ondasTest??{...await import('/src/presets/library.ts'),...await import('/src/audio/voice-manager.ts')});const results=[];for(const preset of library){const ctx=new OfflineAudioContext(1,24000,24000);const gain=ctx.createGain();gain.gain.value=.04;gain.connect(ctx.destination);const manager=new VoiceManager(ctx,gain);manager.noteOn('test',60,preset.patch);const buffer=await ctx.startRendering();let sum=0;for(const x of buffer.getChannelData(0))sum+=x*x;manager.panic();results.push({id:preset.id,rms:Math.sqrt(sum/buffer.length)})}return results});
 expect(signals).toHaveLength(20);expect(signals.every((s:any)=>s.rms>.00001)).toBe(true);expect(new Set(signals.map((s:any)=>s.rms.toFixed(7))).size).toBe(20);
 await test.info().attach('instrumentos.json',{body:JSON.stringify(signals,null,2),contentType:'application/json'});
});

test('piano roll: editar, guardar, reproduzir acordes e gravar composição',async({page})=>{
 test.setTimeout(180000);
 await page.getByRole('button',{name:'Compor',exact:true}).click();
 await expect(page.getByRole('region',{name:'Piano roll',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();
 await page.getByLabel('Duração da nota',{exact:true}).fill('16');
 await page.getByRole('button',{name:'Nova nota',exact:true}).click();
 await page.getByLabel('Nota da composição',{exact:true}).selectOption('64');await page.getByLabel('Início da nota',{exact:true}).fill('1');
 await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();
 await expect(page.locator('[data-roll-note]')).toHaveCount(2);
 const note=page.locator('[data-roll-note]').last();await page.locator('.roll-scroll').scrollIntoViewIfNeeded();await page.locator('.roll-scroll').evaluate(e=>{e.scrollTop=(95-64)*28-100;e.scrollLeft=0});const box=await note.boundingBox();if(!box)throw new Error('Nota não visível');
 await page.mouse.move(box.x+12,box.y+12);await page.mouse.down();await page.mouse.move(box.x+44,box.y-16,{steps:4});await page.mouse.up();
 await expect(page.getByLabel('Início da nota',{exact:true})).toHaveValue('2');await expect(page.getByLabel('Nota da composição',{exact:true})).toHaveValue('65');
 await page.getByRole('button',{name:'Desfazer',exact:true}).click();await note.click();await expect(page.getByLabel('Nota da composição',{exact:true})).toHaveValue('64');
 const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar ficheiro',exact:true}).click();const file=await saved;expect(file.suggestedFilename()).toBe('ondas-composicao.json');const path=test.info().outputPath('composicao.json');await file.saveAs(path);const composition=JSON.parse(readFileSync(path,'utf8'));expect(composition.notes).toHaveLength(2);
 await page.reload();await page.getByRole('button',{name:'Compor',exact:true}).click();await expect(page.locator('[data-roll-note]')).toHaveCount(2);
 await page.getByLabel('Ficheiro de composição',{exact:true}).setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"notes":[null]}')});await expect(page.locator('.roll-status')).toContainText('Composição inválida');await expect(page.locator('[data-roll-note]')).toHaveCount(2);
 await page.getByRole('button',{name:'Limpar composição',exact:true}).click();await expect(page.locator('[data-roll-note]')).toHaveCount(0);
 await page.getByLabel('Ficheiro de composição',{exact:true}).setInputFiles({name:'composicao.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(composition))});await expect(page.locator('[data-roll-note]')).toHaveCount(2);
 await page.getByRole('button',{name:'Gravar',exact:false}).click();await page.getByRole('button',{name:'Reproduzir composição'}).click();
 await expect(page.getByRole('button',{name:'Parar composição'})).toBeVisible();
 await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return [...engine.manager.voices.keys()].filter(id=>id.startsWith('roll:')).length}),{timeout:30000}).toBeGreaterThanOrEqual(2);
 await expect(page.getByLabel('Andamento BPM')).toBeDisabled();await expect.poll(()=>page.getByLabel('Duração da gravação').textContent(),{timeout:30000}).not.toBe('00:00');
 await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));engine.noteOn('manual-test',72)});
 await page.getByRole('button',{name:'Parar composição'}).click();
 expect(await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return engine.manager.voices.has('manual-test')})).toBe(true);
 await page.getByRole('button',{name:'Pânico',exact:true}).click();
 await page.getByRole('button',{name:'Parar gravação'}).click();
 const peak=await page.getByRole('link',{name:'Descarregar WAV'}).evaluate(async el=>{const b=await(await fetch((el as HTMLAnchorElement).href)).arrayBuffer(),v=new DataView(b);let peak=0;for(let i=44;i<b.byteLength;i+=2)peak=Math.max(peak,Math.abs(v.getInt16(i,true)));return peak});expect(peak).toBeGreaterThan(10);
 await page.getByRole('button',{name:'Reproduzir composição'}).click();await page.getByRole('button',{name:'Pânico',exact:true}).click();await expect(page.getByRole('button',{name:'Parar composição'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'artifacts/compor-'+test.info().project.name+'.png',fullPage:true});
});

test('bateria: passos, acentos, compassos, ficheiros e áudio sincronizado',async({page})=>{
 test.setTimeout(180000);await page.getByRole('button',{name:'Compor',exact:true}).click();
 await expect(page.locator('.drum-step')).toHaveCount(128);
 const first=page.getByRole('button',{name:'Bombo, passo 1',exact:true});await first.click();await expect(first).toHaveAttribute('data-velocity','0.65');await first.click();await expect(first).toHaveAttribute('data-velocity','1');await first.click();await expect(first).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'Compasso 2',exact:true}).click();await page.getByRole('button',{name:'Bombo, passo 17',exact:true}).click();await page.getByRole('button',{name:'Repetir este compasso nos quatro'}).click();await page.getByRole('button',{name:'Compasso 4',exact:true}).click();await expect(page.getByRole('button',{name:'Bombo, passo 49',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Ritmo de bateria',{exact:true}).selectOption('rock');await page.getByRole('button',{name:'Silenciar Caixa',exact:true}).click();await expect(page.getByRole('button',{name:'Silenciar Caixa',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('Volume Bombo',{exact:true}).focus();await page.keyboard.press('Home');for(let i=0;i<10;i++)await page.keyboard.press('ArrowRight');await expect(page.getByLabel('Volume Bombo',{exact:true})).toHaveValue('0.5');
 const saved=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar ficheiro',exact:true}).click();const download=await saved;const path=test.info().outputPath('bateria.json');await download.saveAs(path);const composition=JSON.parse(readFileSync(path,'utf8'));expect(composition.drums.tracks).toHaveLength(8);expect(composition.drums.tracks[0].volume).toBe(.5);expect(composition.drums.tracks[1].muted).toBe(true);
 await page.reload();await page.getByRole('button',{name:'Compor',exact:true}).click();await expect(page.getByLabel('Volume Bombo',{exact:true})).toHaveValue('0.5');
 await page.getByRole('button',{name:'Limpar bateria',exact:true}).click();await expect(page.getByRole('button',{name:'Reproduzir composição'})).toBeDisabled();
 await page.getByLabel('Ritmo de bateria',{exact:true}).selectOption('house');await page.getByRole('button',{name:'Gravar',exact:false}).click();await page.getByRole('button',{name:'Reproduzir bateria + piano',exact:false}).click();
 await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return engine.drums.activeCount}),{timeout:30000}).toBeGreaterThan(0);
 expect(await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return engine.manager.voices.size})).toBe(0);
 await expect.poll(()=>page.getByLabel('Duração da gravação').textContent(),{timeout:30000}).not.toBe('00:00');await page.getByRole('button',{name:'Parar bateria + piano',exact:false}).click();await page.getByRole('button',{name:'Parar gravação'}).click();
 const peak=await page.getByRole('link',{name:'Descarregar WAV'}).evaluate(async el=>{const b=await(await fetch((el as HTMLAnchorElement).href)).arrayBuffer(),v=new DataView(b);let peak=0;for(let i=44;i<b.byteLength;i+=2)peak=Math.max(peak,Math.abs(v.getInt16(i,true)));return peak});expect(peak).toBeGreaterThan(10);
 await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();await page.getByLabel('Duração da nota',{exact:true}).fill('64');await page.getByRole('button',{name:'Reproduzir bateria + piano',exact:false}).click();
 await expect.poll(()=>page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return engine.drums.activeCount>0&&engine.manager.voices.size>0}),{timeout:30000}).toBe(true);
 await page.getByRole('button',{name:'Pânico',exact:true}).click();await expect(page.getByRole('button',{name:'Parar composição'})).toHaveCount(0);expect(await page.evaluate(async()=>{const {engine}=((window as any).__ondasTest??await import('/src/audio/engine.ts'));return engine.drums.activeCount+engine.manager.voices.size})).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.drum-sequencer').screenshot({path:'artifacts/bateria-'+test.info().project.name+'.png'});
 const legacy={version:1,bpm:110,loop:true,notes:[{id:'old',note:60,start:0,length:4}]};await page.getByLabel('Ficheiro de composição',{exact:true}).setInputFiles({name:'antiga.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await expect(page.locator('[data-roll-note]')).toHaveCount(1);await expect(page.locator('.drum-step[aria-pressed=true]')).toHaveCount(0);
 const signals=await page.evaluate(async()=>{const api=(window as any).__ondasTest??{...await import('/src/audio/drums.ts'),...await import('/src/music/drum-pattern.ts'),...await import('/src/audio/effects.ts'),...await import('/src/audio/parameters.ts')};const results=[];for(const {id} of api.DRUMS){const ctx=new OfflineAudioContext(2,24000,24000),effects=new api.Effects(ctx);effects.update(api.defaults);const kit=new api.DrumKit(ctx,effects.percussionInput);kit.trigger(id,1);const output=await ctx.startRendering();let energy=0,peak=0;for(const x of output.getChannelData(0)){energy+=x*x;peak=Math.max(peak,Math.abs(x))}kit.dispose();effects.dispose();results.push({id,rms:Math.sqrt(energy/output.length),peak})}return results});
 expect(signals).toHaveLength(8);expect(signals.every((s:any)=>s.rms>.00001&&s.peak<1)).toBe(true);expect(new Set(signals.map((s:any)=>s.rms.toFixed(7))).size).toBe(8);await test.info().attach('sons-bateria.json',{body:JSON.stringify(signals,null,2),contentType:'application/json'});
});

test('multipistas: overdub isolado, mistura, controlos e importação',async({page})=>{
 test.setTimeout(180000);const panel=page.getByRole('region',{name:'Estúdio multipistas'});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // Make a known backing WAV; a silent overdub must not contain it.
 const {encodeWav}=await import('../../src/audio/recorder');const samples=new Float32Array(44100*2*8);for(let i=0;i<samples.length/2;i++)samples[i*2]=samples[i*2+1]=.2*Math.sin(i/44100*Math.PI*440*2);
 await panel.getByLabel('Importar pista áudio').setInputFiles({name:'Base.wav',mimeType:'audio/wav',buffer:Buffer.from(encodeWav([samples],44100))});
 await expect(panel.locator('.audio-track')).toHaveCount(1);await panel.getByRole('button',{name:'Nova pista'}).click();
 await expect.poll(()=>panel.getByLabel('Tempo multipistas').textContent(),{timeout:30000}).not.toContain('00:00');
 const audible=await page.evaluate(()=>{const e=(window as any).__ondasTest.engine;const data=new Float32Array(e.effects.analyser.fftSize);e.effects.analyser.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs))});expect(audible).toBeGreaterThan(.001);
 await panel.getByRole('button',{name:'Parar pistas'}).click();await expect(panel.locator('.audio-track')).toHaveCount(2);
 const silent=await panel.locator('.audio-track').nth(1).getByRole('link',{name:'WAV da pista'}).getAttribute('href');
 const peak=await page.evaluate(async url=>{const view=new DataView(await(await fetch(url!)).arrayBuffer());let peak=0;for(let i=44;i<view.byteLength;i+=2)peak=Math.max(peak,Math.abs(view.getInt16(i,true)));return peak},silent);expect(peak).toBe(0);
 await panel.getByLabel('Nome da pista 1').fill('Piano base');await panel.getByLabel('Início da pista 1').fill('0.25');
 await panel.getByRole('button',{name:'Preparar mistura WAV'}).click();await expect(panel.getByRole('link',{name:'Descarregar mistura'})).toBeVisible({timeout:30000});
 const mix=await panel.getByRole('link',{name:'Descarregar mistura'}).getAttribute('href');
 const mixed=await page.evaluate(async url=>{const view=new DataView(await(await fetch(url!)).arrayBuffer());let peak=0,early=0;for(let i=44;i<view.byteLength;i+=2){const v=Math.abs(view.getInt16(i,true));peak=Math.max(peak,v);if(i<44100*.2*4)early=Math.max(early,v)}return {peak,early}},mix);expect(mixed.peak).toBeGreaterThan(100);expect(mixed.early).toBe(0);
 await panel.locator('.audio-track').nth(1).getByRole('button',{name:'Solo',exact:true}).click();await panel.getByRole('button',{name:'Preparar mistura WAV'}).click();await expect(panel.getByRole('link',{name:'Descarregar mistura'})).toBeVisible({timeout:30000});const solo=await panel.getByRole('link',{name:'Descarregar mistura'}).getAttribute('href');expect(await page.evaluate(async url=>{const v=new DataView(await(await fetch(url!)).arrayBuffer());let p=0;for(let i=44;i<v.byteLength;i+=2)p=Math.max(p,Math.abs(v.getInt16(i,true)));return p},solo)).toBe(0);
 await panel.getByRole('button',{name:'Nova pista'}).click();await page.evaluate(()=>{(window as any).__ondasTest.engine.noteOn('multitrack-test',60)});await expect.poll(()=>panel.getByLabel('Tempo multipistas').textContent(),{timeout:30000}).not.toContain('00:00');await page.evaluate(()=>{(window as any).__ondasTest.engine.noteOff('multitrack-test')});await panel.getByRole('button',{name:'Parar pistas'}).click();await expect(panel.locator('.audio-track')).toHaveCount(3);const live=await panel.locator('.audio-track').nth(2).getByRole('link',{name:'WAV da pista'}).getAttribute('href');expect(await page.evaluate(async url=>{const v=new DataView(await(await fetch(url!)).arrayBuffer());let p=0;for(let i=44;i<v.byteLength;i+=2)p=Math.max(p,Math.abs(v.getInt16(i,true)));return p},live)).toBeGreaterThan(100);
 await panel.getByRole('button',{name:'Ouvir pistas'}).click();await page.getByRole('button',{name:'Pânico',exact:true}).click();await expect(panel.getByRole('button',{name:'Parar pistas'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await panel.screenshot({path:'artifacts/multipistas-'+test.info().project.name+'.png'});expect(errors).toEqual([]);
});

test('multipistas: mais de oito pistas persistem depois de recarregar',async({page})=>{
 const panel=page.getByRole('region',{name:'Estúdio multipistas'}),{encodeWav}=await import('../../src/audio/recorder');
 const samples=new Float32Array(4410*2);for(let i=0;i<samples.length/2;i++)samples[i*2]=samples[i*2+1]=.1*Math.sin(i/44100*Math.PI*440*2);
 const wav=Buffer.from(encodeWav([samples],44100));
 for(let i=1;i<=9;i++)await panel.getByLabel('Importar pista áudio').setInputFiles({name:`Pista-${i}.wav`,mimeType:'audio/wav',buffer:wav});
 await expect(panel.locator('.audio-track')).toHaveCount(9);await panel.getByLabel('Nome da pista 9').fill('Nona pista');await expect(panel.getByText('9 pistas · guardado',{exact:true})).toBeVisible({timeout:30000});
 await page.reload({waitUntil:'domcontentloaded'});const restored=page.getByRole('region',{name:'Estúdio multipistas'});await expect(restored.locator('.audio-track')).toHaveCount(9,{timeout:30000});await expect(restored.getByLabel('Nome da pista 9')).toHaveValue('Nona pista');await expect(restored.getByText('Projeto restaurado com 9 pistas.')).toBeVisible();
});

test('mixer: panorama e exportação normalizada a 48 kHz',async({page})=>{
 const panel=page.getByRole('region',{name:'Estúdio multipistas'});
 const {encodeWav}=await import('../../src/audio/recorder');
 const data=new Float32Array(44100*2*8);for(let i=0;i<data.length/2;i++)data[i*2]=data[i*2+1]=.1*Math.sin(i/44100*Math.PI*880);
 await panel.getByLabel('Importar pista áudio').setInputFiles({name:'Sinal.wav',mimeType:'audio/wav',buffer:Buffer.from(encodeWav([data],44100))});
 await expect(panel.locator('.audio-track')).toHaveCount(1);
 await panel.getByLabel('Panorama da pista 1').focus();await page.keyboard.press('Home');
 await panel.getByLabel('Frequência de amostragem').selectOption('48000');
 await panel.getByLabel('Normalizar pico').check();
 await panel.getByLabel('Nome do ficheiro WAV').fill('a-minha-musica');
 await panel.getByRole('button',{name:'Preparar mistura WAV'}).click();
 const link=panel.getByRole('link',{name:'Descarregar mistura'});await expect(link).toBeVisible();await expect(link).toHaveAttribute('download','a-minha-musica.wav');
 const audio=await link.evaluate(async el=>{const view=new DataView(await(await fetch((el as HTMLAnchorElement).href)).arrayBuffer());let left=0,right=0;for(let i=44;i<view.byteLength;i+=4){left=Math.max(left,Math.abs(view.getInt16(i,true)));right=Math.max(right,Math.abs(view.getInt16(i+2,true)))}return{rate:view.getUint32(24,true),left,right}});
 expect(audio.rate).toBe(48000);expect(audio.left/32768).toBeCloseTo(Math.pow(10,-1/20),3);expect(audio.right).toBeLessThan(2);
 await panel.getByLabel('Panorama da pista 1').focus();await page.keyboard.press('End');await expect(link).toHaveCount(0);
 await panel.getByRole('button',{name:'Ouvir pistas'}).click();await expect.poll(()=>panel.getByLabel('Nível da pista 1').getAttribute('value')).not.toBe('0');await panel.getByRole('button',{name:'Parar pistas'}).click();
 await panel.getByRole('button',{name:'Mute',exact:true}).click();
 const option=await panel.getByLabel('Conteúdo da exportação').locator('option').nth(1).getAttribute('value');await panel.getByLabel('Conteúdo da exportação').selectOption(option!);
 await panel.getByRole('button',{name:'Preparar pista WAV'}).click();await expect(link).toBeVisible();
 await panel.getByLabel('Master do mixer').focus();await page.keyboard.press('Home');await expect(link).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await panel.screenshot({path:'artifacts/mixer-'+test.info().project.name+'.png'});
});
