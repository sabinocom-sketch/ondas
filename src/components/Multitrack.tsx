import {useEffect,useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {engine} from '../audio/engine';
import {WavRecorder} from '../audio/recorder';
import {bufferWav,renderMix,TrackPlayback,trackEnd,type ArrangerClipImport,type AudioTrack,type ComposerSource} from '../audio/multitrack';
import {loadMultitrackProject,storeMultitrackProject,validMultitrackProject} from '../audio/multitrack-project';
const clock=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${Math.floor(n%60).toString().padStart(2,'0')}`;
const precise=(n:number)=>`${clock(n)}.${Math.floor(n%1*10)}`;
function Waveform({buffer}:{buffer:AudioBuffer}){
 const bars=72,data=buffer.getChannelData(0),step=Math.max(1,Math.floor(data.length/bars)),peaks:number[]=[];
 for(let b=0;b<bars;b++){let peak=.04;for(let i=b*step;i<Math.min(data.length,(b+1)*step);i+=Math.max(1,Math.floor(step/24)))peak=Math.max(peak,Math.abs(data[i]));peaks.push(peak)}
 return <svg className="clip-waveform" viewBox={`0 0 ${bars*3} 44`} preserveAspectRatio="none" aria-hidden="true">{peaks.map((peak,i)=><rect key={i} x={i*3} y={22-peak*19} width="1.6" height={Math.max(2,peak*38)} rx=".8"/>)}</svg>
}
export function Multitrack({incoming,onImported,onOpenSource}:{incoming?:ArrangerClipImport|null;onImported?:(id:string)=>void;onOpenSource?:(source:ComposerSource)=>void}={}){
 const [tracks,setTracks]=useState<AudioTrack[]>([]),[mode,setMode]=useState<'idle'|'record'|'play'>('idle'),[busy,setBusy]=useState(false),[seconds,setSeconds]=useState(0),[message,setMessage]=useState(''),[mix,setMix]=useState('');
 const [levels,setLevels]=useState<Record<string,number>>({}),[sampleRate,setSampleRate]=useState(44100),[normalize,setNormalize]=useState(false),[target,setTarget]=useState('mix'),[filename,setFilename]=useState('ondas-mistura'),[viewSeconds,setViewSeconds]=useState(60),[snap,setSnap]=useState(true),[hydrated,setHydrated]=useState(false),[saved,setSaved]=useState(false);
 const invalidate=()=>{if(mixUrl.current){URL.revokeObjectURL(mixUrl.current);mixUrl.current='';setMix('')}};
 const current=useRef<AudioTrack[]>([]),capture=useRef<WavRecorder|null>(null),playback=useRef<TrackPlayback|null>(null),epoch=useRef(0),alive=useRef(false),started=useRef(0),origin=useRef(0),playing=useRef(false),mixUrl=useRef(''),handledImport=useRef('');
 const replace=(next:AudioTrack[])=>{current.current=next;setTracks(next);playback.current?.update(next);if(mixUrl.current){URL.revokeObjectURL(mixUrl.current);mixUrl.current='';setMix('')}};
 const add=(buffer:AudioBuffer,blob:Blob,name:string,offset=0,source?:ComposerSource)=>replace([...current.current,{id:crypto.randomUUID(),name,buffer,blob,url:URL.createObjectURL(blob),volume:1,pan:0,muted:false,solo:false,offset,source}]);
 const stop=async()=>{
  ++epoch.current;playing.current=false;playback.current?.stop();playback.current=null;setMode('idle');
  const recorder=capture.current;capture.current=null;
  if(!recorder){setBusy(false);return}
  const duration=recorder.seconds,blob=recorder.stop();setSeconds(duration);
  if(!duration){setBusy(false);setMessage('A pista terminou antes de receber áudio. Tenta novamente.');return}
  setBusy(true);
  try{const buffer=await engine.context!.decodeAudioData(await blob.arrayBuffer());if(alive.current){add(buffer,blob,`Pista ${current.current.length+1}`,origin.current);setMessage('Pista pronta. Arrasta o clip para o posicionar na música.')}}catch{if(alive.current)setMessage('Não foi possível preparar esta pista. As outras pistas foram mantidas.')}finally{if(alive.current)setBusy(false)}
 };
 useEffect(()=>{
  alive.current=true;
  const interrupt=()=>{if(capture.current||playing.current)void stop();else{++epoch.current}};
  const visibility=()=>{if(document.hidden)interrupt()};
  engine.panicListeners.add(interrupt);document.addEventListener('visibilitychange',visibility);
  const timer=window.setInterval(()=>{setLevels(playback.current?.levels()??{});if(playing.current){const elapsed=origin.current+Math.max(0,(engine.context?.currentTime||0)-started.current);setSeconds(elapsed);if(!capture.current&&elapsed>=trackEnd(current.current))void stop()}},50);
  return()=>{alive.current=false;++epoch.current;window.clearInterval(timer);engine.panicListeners.delete(interrupt);document.removeEventListener('visibilitychange',visibility);capture.current?.dispose();playback.current?.stop();current.current.forEach(t=>URL.revokeObjectURL(t.url));if(mixUrl.current)URL.revokeObjectURL(mixUrl.current)};
 },[]);
 useEffect(()=>{let cancelled=false;(async()=>{try{const stored=await loadMultitrackProject();if(!validMultitrackProject(stored))return;const decoder=new OfflineAudioContext(1,1,44100),restored:AudioTrack[]=[];for(const item of stored.tracks)try{const buffer=await decoder.decodeAudioData(await item.audio.arrayBuffer());restored.push({...item,buffer,blob:item.audio,url:URL.createObjectURL(item.audio)})}catch{/* Mantém as restantes pistas quando um clip está danificado. */}if(!cancelled){current.current=restored;setTracks(restored);setViewSeconds(stored.viewSeconds);setSnap(stored.snap);setSaved(true);if(restored.length)setMessage(`Projeto restaurado com ${restored.length} ${restored.length===1?'pista':'pistas'}.`)}}catch{if(!cancelled)setMessage('Não foi possível restaurar o projeto multipistas deste navegador.')}finally{if(!cancelled)setHydrated(true)}})();return()=>{cancelled=true}},[]);
 useEffect(()=>{if(!hydrated)return;setSaved(false);const timer=window.setTimeout(()=>{void storeMultitrackProject({version:1,tracks:tracks.map(({buffer,url,blob,...track})=>({...track,pan:track.pan??0,audio:blob})),viewSeconds,snap,updatedAt:Date.now()}).then(()=>{if(alive.current)setSaved(true)}).catch(()=>{if(alive.current){setSaved(false);setMessage('O navegador ficou sem espaço para guardar o projeto. Exporta os WAV para não perderes as pistas.')}})},350);return()=>window.clearTimeout(timer)},[tracks,viewSeconds,snap,hydrated]);
 useEffect(()=>{if(!incoming||!hydrated||busy||mode!=='idle'||handledImport.current===incoming.id)return;handledImport.current=incoming.id;add(incoming.buffer,incoming.blob,incoming.name,0,incoming.source);setSeconds(0);setMessage('Composição adicionada como pista. Já podes alinhá-la e misturá-la.');onImported?.(incoming.id)},[incoming,hydrated,busy,mode,onImported]);
 const start=async(record:boolean)=>{
  const ticket=++epoch.current;setBusy(true);setMessage('');
  try{await engine.start();if(ticket!==epoch.current||!alive.current||document.hidden)return;
   const ctx=engine.context!,effects=engine.effects!,position=record?0:(seconds>=trackEnd(current.current)-.05?0:seconds),at=ctx.currentTime+.12;started.current=at;origin.current=position;setSeconds(position);
   if(record)capture.current=new WavRecorder(effects.recordingTap,()=>void stop(),at);
   playback.current=new TrackPlayback(ctx,effects.output,current.current,at,position);playing.current=true;setMode(record?'record':'play');
  }catch(e){capture.current?.dispose();capture.current=null;playback.current?.stop();playback.current=null;playing.current=false;setMode('idle');setMessage('Não foi possível iniciar: '+String(e))}finally{if(alive.current)setBusy(false)}
 };
 const change=(id:string,edit:Partial<AudioTrack>)=>replace(current.current.map(t=>t.id===id?{...t,...edit}:t));
 const seek=(event:ReactPointerEvent<HTMLElement>)=>{if(mode!=='idle')return;const box=event.currentTarget.getBoundingClientRect();setSeconds(Math.max(0,Math.min(viewSeconds,(event.clientX-box.left)/box.width*viewSeconds)))};
 const dragClip=(event:ReactPointerEvent<HTMLButtonElement>,track:AudioTrack)=>{
  if(locked)return;event.preventDefault();event.stopPropagation();
  const clip=event.currentTarget,lane=clip.parentElement!,box=lane.getBoundingClientRect(),startX=event.clientX,startOffset=track.offset,pointerId=event.pointerId;
  const ghost=document.createElement('div');ghost.className='audio-clip-drag-ghost';ghost.textContent=track.source?`${track.name} · largar no piano roll`:track.name;document.body.appendChild(ghost);
  let overRoll=false,finished=false;
  const positionGhost=(e:PointerEvent)=>{ghost.style.transform=`translate3d(${e.clientX+14}px,${e.clientY+14}px,0)`};
  positionGhost(event.nativeEvent);clip.classList.add('dragging');document.body.classList.add('dragging-arranger-clip');clip.setPointerCapture(pointerId);
  const move=(e:PointerEvent)=>{
   positionGhost(e);if(e.clientY<70)window.scrollBy(0,-24);else if(e.clientY>innerHeight-70)window.scrollBy(0,24);
   const roll=document.querySelector<HTMLElement>('[data-composer]:not([hidden])'),target=roll?.getBoundingClientRect();
   overRoll=Boolean(track.source&&target&&target.width&&target.height&&e.clientX>=target.left&&e.clientX<=target.right&&e.clientY>=target.top&&e.clientY<=target.bottom);
   roll?.classList.toggle('clip-drop-target',overRoll);ghost.classList.toggle('over-roll',overRoll);if(overRoll)return;
   let value=Math.max(0,Math.min(viewSeconds-track.buffer.duration,startOffset+(e.clientX-startX)/box.width*viewSeconds));if(snap)value=Math.round(value*4)/4;change(track.id,{offset:value});
  };
  const end=()=>{
   if(finished)return;finished=true;document.querySelector('[data-composer]')?.classList.remove('clip-drop-target');clip.classList.remove('dragging');document.body.classList.remove('dragging-arranger-clip');ghost.remove();
   window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);if(clip.hasPointerCapture(pointerId))clip.releasePointerCapture(pointerId);
   if(overRoll&&track.source)onOpenSource?.(track.source);
  };
  window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
 };
 const importFile=async(file:File)=>{
  setBusy(true);setMessage('');
  try{if(file.size>25*1024*1024)throw new Error('Escolhe um ficheiro até 25 MB.');await engine.start();const buffer=await engine.context!.decodeAudioData(await file.arrayBuffer());if(buffer.duration>120)throw new Error('Cada pista pode ter até 2 minutos.');if(alive.current)add(buffer,bufferWav(buffer),file.name.replace(/\.[^.]+$/,'').slice(0,50))}catch(e){if(alive.current)setMessage('Não foi possível importar: '+String(e))}finally{if(alive.current)setBusy(false)}
 };
 const exportMix=async()=>{setBusy(true);setMessage('');try{const selected=target==='mix'?current.current:current.current.filter(t=>t.id===target).map(t=>({...t,muted:false,solo:false}));const blob=await renderMix(selected,engine.patch.master,{sampleRate,normalize});if(alive.current){if(mixUrl.current)URL.revokeObjectURL(mixUrl.current);mixUrl.current=URL.createObjectURL(blob);setMix(mixUrl.current);setMessage('WAV pronto com volume, panorama e master aplicados.')}}catch(e){if(alive.current)setMessage('Não foi possível exportar: '+String(e))}finally{if(alive.current)setBusy(false)}};
 useEffect(()=>{invalidate()},[engine.patch.master]);
 const locked=busy||mode!=='idle';
 return <section className="multitrack panel" aria-label="Estúdio multipistas">
  <div className="multitrack-heading"><div><span className="eyebrow">CONSTRÓI A TUA MÚSICA</span><h2>Arranjador multipistas</h2></div><span>{tracks.length} {tracks.length===1?'pista':'pistas'} · {hydrated?(saved?'guardado':'a guardar…'):'a restaurar…'}</span></div>
  <p>Grava, importa ou recebe composições do piano roll numa linha temporal. Arrasta os clips, posiciona o cursor e mistura tudo no mesmo espaço.</p>
  <div className="arranger-transport"><div className="transport-buttons"><button aria-label="Nova pista" disabled={locked||!hydrated} onClick={()=>void start(true)}>● Gravar</button><button aria-label="Ouvir pistas" className={mode==='play'?'active':''} disabled={locked||!tracks.length} onClick={()=>void start(false)}>▶ Reproduzir</button><button aria-label="Parar pistas" disabled={mode==='idle'} onClick={()=>void stop()}>■ Parar</button><button disabled={locked} onClick={()=>setSeconds(0)}>↤ Início</button></div><output className={mode==='record'?'recording-clock':''} aria-label="Tempo multipistas">{precise(seconds)}{mode==='record'?' · REC':''}</output><div className="arranger-options"><label>Zoom <select aria-label="Escala da timeline" value={viewSeconds} disabled={locked} onChange={e=>setViewSeconds(Number(e.target.value))}><option value={30}>30 s</option><option value={60}>1 min</option><option value={120}>2 min</option></select></label><label className="snap-option"><input type="checkbox" checked={snap} onChange={e=>setSnap(e.target.checked)}/> Grelha ¼ s</label></div></div>
  <div className="arranger" style={{'--playhead':`${Math.min(100,seconds/viewSeconds*100)}%`} as CSSProperties}>
   <div className="arranger-ruler"><span className="ruler-corner">PISTAS</span><div className="ruler-time" onPointerDown={seek}>{Array.from({length:7},(_,i)=><span key={i} style={{left:`${i/6*100}%`}}>{clock(i/6*viewSeconds)}</span>)}</div></div>
   {tracks.length===0&&<div className="arranger-empty"><strong>A tua primeira pista começa aqui.</strong><span>Grava o sintetizador ou importa um ficheiro de áudio.</span></div>}
   {tracks.map((track,index)=><article className={`arranger-row${track.muted?' muted':''}`} key={track.id} aria-label={`Pista ${index+1}`}>
    <div className="arranger-track-head"><div className="track-title"><strong>{String(index+1).padStart(2,'0')}</strong><input aria-label={`Nome da pista ${index+1}`} value={track.name} maxLength={50} disabled={busy} onChange={e=>change(track.id,{name:e.target.value})}/></div><div className="track-mini-controls"><button title="Silenciar" aria-label={`Silenciar pista ${index+1}`} aria-pressed={track.muted} disabled={busy} onClick={()=>change(track.id,{muted:!track.muted})}>M</button><button title="Solo" aria-label={`Solo da pista ${index+1}`} aria-pressed={track.solo} disabled={busy} onClick={()=>change(track.id,{solo:!track.solo})}>S</button><meter min={0} max={1} value={Math.min(1,levels[track.id]??0)} aria-label={`Nível da pista ${index+1}`}/></div></div>
    <div className="arranger-lane" onPointerDown={seek}><i className="arranger-playhead"/><button className="audio-clip" data-source-block={track.source?.blockId} disabled={locked} onPointerDown={e=>dragClip(e,track)} style={{left:`${track.offset/viewSeconds*100}%`,width:`${Math.max(2.5,Math.min(track.buffer.duration,viewSeconds-track.offset)/viewSeconds*100)}%`}} aria-label={`${track.name}, início ${track.offset.toFixed(2)} segundos. Arrasta para mover.`}><span>{track.name}</span><small>{clock(track.buffer.duration)}</small><Waveform buffer={track.buffer}/></button></div>
   </article>)}
  </div>
   <div className="arranger-hint">Clica na régua para mover o cursor · arrasta um clip para alterar o início · clips do piano roll podem ser arrastados de volta para o editar</div>
  <div className="mixer-heading"><h3>MIXER</h3><span>Volume · panorama · ficheiros</span></div><div className="track-list mixer-list">{tracks.map((track,index)=><article className="audio-track" key={track.id} aria-label={`Mistura da pista ${index+1}`}>
   <div className="track-title"><strong>{String(index+1).padStart(2,'0')}</strong><span>{track.name}</span><span>{clock(track.buffer.duration)}</span></div>
   <div className="track-controls"><label>Volume <input type="range" aria-label={`Volume da pista ${index+1}`} min="0" max="1.5" step="0.01" value={track.volume} disabled={busy} onChange={e=>change(track.id,{volume:Number(e.target.value)})}/><output>{Math.round(track.volume*100)}%</output></label><label>Panorama <input type="range" aria-label={`Panorama da pista ${index+1}`} min="-1" max="1" step="0.01" value={track.pan??0} disabled={busy} onChange={e=>change(track.id,{pan:Number(e.target.value)})}/><output>{!track.pan?'Centro':`${Math.round(Math.abs(track.pan)*100)}% ${track.pan<0?'E':'D'}`}</output></label><button aria-pressed={track.muted} disabled={busy} onClick={()=>change(track.id,{muted:!track.muted})}>Mute</button><button aria-pressed={track.solo} disabled={busy} onClick={()=>change(track.id,{solo:!track.solo})}>Solo</button><label>Início <input type="number" aria-label={`Início da pista ${index+1}`} min="0" max="120" step="0.25" value={track.offset} disabled={locked} onChange={e=>change(track.id,{offset:Math.min(120,Math.max(0,Number(e.target.value)||0))})}/></label><a aria-label="WAV da pista" href={track.url} download={`ondas-${track.name.replace(/[^\p{L}\p{N}_-]/gu,'_')||'pista'}.wav`}>WAV</a><button disabled={locked} onClick={()=>{URL.revokeObjectURL(track.url);replace(current.current.filter(t=>t.id!==track.id))}}>Eliminar</button></div>
  </article>)}</div>
  <div className="mixer-master"><label>Master <input type="range" aria-label="Master do mixer" min="0" max="1" step="0.01" value={engine.patch.master} disabled={busy} onChange={e=>{engine.setPatch({...engine.patch,master:Number(e.target.value)});invalidate()}}/><output>{Math.round(engine.patch.master*100)}%</output></label><button disabled={busy||!tracks.length} onClick={()=>replace(current.current.map(t=>({...t,volume:1,pan:0,muted:false,solo:false})))}>Repor mixer</button></div>
  <section className="export-panel" aria-label="Exportação de áudio"><span className="eyebrow">LEVA O TEU SOM CONTIGO</span><h3>Exportação WAV</h3><div className="export-options">
   <label>Exportar<select aria-label="Conteúdo da exportação" value={target} disabled={locked} onChange={e=>{setTarget(e.target.value);invalidate()}}><option value="mix">Mistura completa</option>{tracks.map((t,i)=><option key={t.id} value={t.id}>Pista {i+1} · {t.name}</option>)}</select></label>
   <label>Nome do ficheiro<input aria-label="Nome do ficheiro WAV" value={filename} maxLength={80} disabled={busy} onChange={e=>setFilename(e.target.value)}/></label>
   <label>Qualidade<select aria-label="Frequência de amostragem" value={sampleRate} disabled={locked} onChange={e=>{setSampleRate(Number(e.target.value));invalidate()}}><option value={44100}>44,1 kHz · 16 bits · estéreo</option><option value={48000}>48 kHz · 16 bits · estéreo</option></select></label>
   <label className="normalize-option"><input type="checkbox" checked={normalize} disabled={locked} onChange={e=>{setNormalize(e.target.checked);invalidate()}}/>Normalizar pico a −1 dBFS</label>
  </div><p className="record-hint">A mistura respeita Mute e Solo. A pista individual inclui o volume, panorama e início, mesmo quando está silenciada. A normalização ajusta o pico final e preserva a dinâmica.</p><div className="multi-actions"><button disabled={locked||!tracks.length||(target!=='mix'&&!tracks.some(t=>t.id===target))} onClick={()=>void exportMix()}>{target==='mix'?'Preparar mistura WAV':'Preparar pista WAV'}</button>{mix&&<a href={mix} download={`${filename.replace(/[^\p{L}\p{N}_-]/gu,'_')||'ondas-exportacao'}.wav`}>Descarregar mistura</a>}</div></section>
  <div className="multi-import"><label>Importar áudio (até 2 min)<input type="file" accept="audio/*,.wav" aria-label="Importar pista áudio" disabled={locked||!hydrated} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importFile(file)}}/></label></div>
  <p className="record-hint">Adiciona quantas pistas o dispositivo conseguir guardar. O projeto multipistas é guardado automaticamente neste navegador, incluindo áudio e mixer. A latência do dispositivo não é compensada automaticamente.</p>
  <p role="status">{busy?'A preparar áudio…':message}</p>
 </section>
}
