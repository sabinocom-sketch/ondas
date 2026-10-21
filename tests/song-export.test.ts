import {afterEach,describe,it,expect,vi} from 'vitest';
import {renderSongWav} from '../src/audio/song-export';
import {Engine} from '../src/audio/engine';
import {Effects} from '../src/audio/effects';
import {SequenceAudio} from '../src/audio/sequence-audio';
import {DrumKit} from '../src/audio/drums';
import {defaults,clonePatch} from '../src/audio/parameters';
import {emptySong,newTrack,validSong,migrateComposition,storeSong,loadSong} from '../src/music/song';

function audioContext(){
 const sources:any[]=[],oscillators:any[]=[],nodes:any[]=[];
 const param=()=>({value:0,setValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn(),cancelAndHoldAtTime:vi.fn(),setTargetAtTime:vi.fn()});
 let ctx:any;
 const node=(kind:string)=>{const n:any={kind,context:ctx,connect:vi.fn(function(this:any){return this}),disconnect:vi.fn(),gain:param(),frequency:param(),Q:param(),detune:param(),delayTime:param(),threshold:param(),ratio:param(),knee:param(),attack:param(),release:param(),playbackRate:param(),start:vi.fn(),stop:vi.fn()};nodes.push(n);return n};
 const buffer=(channels=2,length=8)=>{const data=Array.from({length:channels},()=>new Float32Array(length));return{duration:length/44100,length,numberOfChannels:channels,getChannelData:(i:number)=>data[i],copyToChannel:(input:Float32Array,ch:number)=>data[ch].set(input)}};
 ctx={currentTime:0,sampleRate:44100,destination:{},decodeAudioData:vi.fn(async()=>buffer(1,44100)),createBuffer:vi.fn(buffer),createGain:()=>node('gain'),createDelay:()=>node('delay'),createConvolver:()=>node('convolver'),createDynamicsCompressor:()=>node('compressor'),createWaveShaper:()=>node('shaper'),createAnalyser:()=>node('analyser'),createBiquadFilter:()=>node('filter'),createOscillator:()=>{const n=node('oscillator');oscillators.push(n);return n},createBufferSource:()=>{const n=node('sample');sources.push(n);return n},startRendering:vi.fn(async()=>buffer())};
 return{ctx,sources,oscillators,nodes,buffer};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});

describe('Exportação de composições completas',()=>{
 it('preserva 24 notas de amostras, 40 impactos e mais de 32 notas sintetizadas antes de renderizar',async()=>{
  const a=audioContext(),p=emptySong();p.bpm=120;p.loop=false;
  p.blocks[0].tracks=[{...newTrack('Baixo','electric-bass'),notes:Array.from({length:24},(_,i)=>({id:'bass-'+i,note:28,start:i*2,length:1}))},{...newTrack('Synth','classic'),notes:Array.from({length:48},(_,i)=>({id:'synth-'+i,note:60,start:i,length:1}))}];
  p.blocks[0].drums.tracks[0].steps=Array.from({length:64},(_,i)=>i<40?1:0);
  let snapshot:any;
  a.ctx.startRendering.mockImplementation(async()=>{snapshot={sources:[...a.sources],sourceDisconnected:a.sources.filter(n=>n.disconnect.mock.calls.length).length,oscillatorDisconnected:a.oscillators.filter(n=>n.disconnect.mock.calls.length).length};return a.buffer()});
  vi.stubGlobal('OfflineAudioContext',vi.fn(function(){return a.ctx}));vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})));
  const blob=await renderSongWav(p);
  expect(snapshot.sources).toHaveLength(64);expect(snapshot.sourceDisconnected).toBe(0);expect(snapshot.oscillatorDisconnected).toBe(0);
  expect(a.oscillators).toHaveLength(97); // 48 dual-oscillator voices + shared chorus LFO.
  expect(a.nodes.filter(n=>n.kind==='compressor')).toHaveLength(1);
  expect(a.sources.every(n=>n.disconnect.mock.calls.length>0)).toBe(true);
  expect(new TextDecoder().decode((await blob.arrayBuffer()).slice(0,4))).toBe('RIFF');
 });
 it('preserva instrumentos e volumes idênticos nos caminhos ao vivo e offline',async()=>{
  const live=audioContext(),offline=audioContext();
  for(const [a,isOffline] of [[live,false],[offline,true]] as const){const sequence=new SequenceAudio(a.ctx,{} as AudioNode,()=>defaults,isOffline);sequence.note('test',28,.05,.5,'bass',.4)}
  const left=live.oscillators.map(n=>({wave:n.type,freq:n.frequency.value,detune:n.detune.value})),right=offline.oscillators.map(n=>({wave:n.type,freq:n.frequency.value,detune:n.detune.value}));
  expect(left).toEqual(right);
  expect(live.nodes.filter(n=>n.kind==='gain').map(n=>n.gain.value)).toEqual(offline.nodes.filter(n=>n.kind==='gain').map(n=>n.gain.value));
 });
 it('aplica o master fornecido e liberta recursos se o carregamento de amostras falhar',async()=>{
  const a=audioContext(),patch=clonePatch(defaults),p=emptySong(),update=vi.spyOn(Effects.prototype,'update');patch.master=0;patch.delay.enabled=true;patch.delay.mix=.4;p.blocks[0].tracks[0].notes=[{id:'x',note:60,start:0,length:4}];
  vi.stubGlobal('OfflineAudioContext',vi.fn(function(){return a.ctx}));await renderSongWav(p,patch);
  expect(update).toHaveBeenCalledExactlyOnceWith(patch,true);
  const failed=audioContext();vi.stubGlobal('OfflineAudioContext',vi.fn(function(){return failed.ctx}));vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));
  p.blocks[0].tracks[0].instrument='grand-piano';await expect(renderSongWav(p)).rejects.toThrow('descarregar');
  expect(failed.ctx.startRendering).not.toHaveBeenCalled();expect(failed.nodes.every(n=>n.disconnect.mock.calls.length>0)).toBe(true);
 });
 it('agenda o corte do chimbal na hora musical, preservando os impactos anteriores',()=>{
  const a=audioContext(),kit=new DrumKit(a.ctx,{} as AudioNode,Infinity);
  kit.trigger('openHat',1,.5);kit.trigger('closedHat',1,.75);
  expect(a.sources[0].stop).toHaveBeenCalledWith(.75);expect(a.sources[0].disconnect).not.toHaveBeenCalled();
  for(let i=0;i<80;i++)kit.trigger('kick',1,1+i*.25);
  expect(a.sources.every(n=>!n.disconnect.mock.calls.length)).toBe(true);kit.dispose();
 });
 it('mantém timbres da composição e notas manuais independentes ao mudar o master ou sustain',async()=>{
  const a=audioContext(),e=new Engine();Object.assign(a.ctx,{state:'running',resume:async()=>{},close:async()=>{}});
  vi.stubGlobal('AudioContext',vi.fn(function(){return a.ctx}));await e.prepareSequence(['bass']);
  e.noteOn('manual',60);e.sustain(true);e.sequenceNote('roll:test',28,.05,.5,'bass',.6);
  const voices=a.oscillators.slice(-2),before=voices.map(n=>n.type),p=clonePatch(defaults);p.master=.3;p.osc.forEach(o=>o.wave='square');
  e.setPatch(p);expect(voices.map(n=>n.type)).toEqual(before);expect(e.manager!.voices.get('manual')!.patch.osc[0].wave).toBe('square');
  expect(voices.every(n=>n.stop.mock.calls.some((call:any[])=>call[0]>.5))).toBe(true);
  e.stopSequence();expect(e.manager!.voices.has('manual')).toBe(true);expect(voices.every(n=>n.disconnect.mock.calls.length>0)).toBe(true);
  await e.dispose();
 });
 it('respeita a ordem de blocos repetidos, mute e solo na exportação',async()=>{
  const a=audioContext(),p=emptySong(),first=p.blocks[0];p.bpm=120;
  first.tracks=[{...newTrack('Solo','classic'),solo:true,notes:[{id:'c',note:60,start:0,length:1}]},{...newTrack('Oculta','classic'),notes:[{id:'e',note:64,start:0,length:1}]}];
  const second=structuredClone(first);second.id='second';second.tracks[0].notes[0].start=4;second.tracks[1].muted=true;p.blocks.push(second);p.order=[second.id,first.id,second.id];
  let starts:number[]=[];a.ctx.startRendering.mockImplementation(async()=>{starts=a.oscillators.slice(1).map(n=>n.start.mock.calls[0][0]);return a.buffer()});
  vi.stubGlobal('OfflineAudioContext',vi.fn(function(){return a.ctx}));await renderSongWav(p);
  expect(starts).toEqual([.55,.55,8.05,8.05,16.55,16.55]);
 });
 it('mantém notas graves em guardar/abrir e continua a migrar projetos antigos',()=>{
  const p=emptySong();p.blocks[0].tracks[0].notes=[{id:'e1',note:28,start:0,length:4}];expect(validSong(p)).toBe(true);
  let value='';const storage={getItem:()=>value,setItem:(_k:string,v:string)=>value=v} as Storage;
  storeSong(p,storage);expect(loadSong(storage).blocks[0].tracks[0].notes[0].note).toBe(28);
  expect(migrateComposition({version:1,bpm:110,loop:false,notes:[{id:'old',note:60,start:0,length:4}]})?.blocks[0].tracks[0].notes[0].note).toBe(60);
 });
});
