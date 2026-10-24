import {safetyCurve} from './effects';
import {encodeWav} from './recorder';
import type {SongProject} from '../music/song';
export type ComposerSource={blockId:string;trackId:string;project?:SongProject};
export type AudioTrack={id:string;name:string;buffer:AudioBuffer;blob:Blob;url:string;volume:number;pan?:number;muted:boolean;solo:boolean;offset:number;source?:ComposerSource};
export type ArrangerClipImport={id:string;name:string;buffer:AudioBuffer;blob:Blob;source:ComposerSource};
export function trackGain(track:Pick<AudioTrack,'volume'|'muted'|'solo'>,tracks:Pick<AudioTrack,'solo'>[]){return track.muted||(tracks.some(t=>t.solo)&&!track.solo)?0:track.volume}
export function trackEnd(tracks:Pick<AudioTrack,'offset'|'buffer'>[]){return Math.max(0,...tracks.map(t=>t.offset+t.buffer.duration))}
export function bufferWav(buffer:AudioBuffer){
 const blocks:Float32Array[]=[];const l=buffer.getChannelData(0),r=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1));
 for(let start=0;start<buffer.length;start+=16384){const count=Math.min(16384,buffer.length-start),block=new Float32Array(count*2);for(let i=0;i<count;i++){block[i*2]=l[start+i];block[i*2+1]=r[start+i]}blocks.push(block)}
 return new Blob([encodeWav(blocks,buffer.sampleRate)],{type:'audio/wav'});
}
/** Backing tracks bypass the live recording tap, effects and compressor. */
export class TrackPlayback {
 private voices:{id:string;source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode;meter:AnalyserNode;data:Float32Array<ArrayBuffer>}[]=[];
 constructor(ctx:AudioContext,destination:AudioNode,tracks:AudioTrack[],startAt:number,position=0){
  for(const track of tracks){
   const bufferOffset=Math.max(0,position-track.offset),delay=Math.max(0,track.offset-position);
   if(bufferOffset>=track.buffer.duration)continue;
   const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner(),meter=ctx.createAnalyser();meter.fftSize=256;source.buffer=track.buffer;gain.gain.value=trackGain(track,tracks);pan.pan.value=track.pan??0;source.connect(gain).connect(pan).connect(meter).connect(destination);this.voices.push({id:track.id,source,gain,pan,meter,data:new Float32Array(256)});source.start(startAt+delay,bufferOffset)
  }
 }
 update(tracks:AudioTrack[]){for(const voice of this.voices){const track=tracks.find(t=>t.id===voice.id);voice.gain.gain.setTargetAtTime(track?trackGain(track,tracks):0,voice.gain.context.currentTime,.015);voice.pan.pan.setTargetAtTime(track?.pan??0,voice.gain.context.currentTime,.015)}}
 levels(){return Object.fromEntries(this.voices.map(v=>{v.meter.getFloatTimeDomainData(v.data);let peak=0;for(const sample of v.data)peak=Math.max(peak,Math.abs(sample));return [v.id,peak]}))}
 stop(){for(const {source,gain,pan,meter} of this.voices){try{source.stop()}catch{/* Already ended. */}source.disconnect();gain.disconnect();pan.disconnect();meter.disconnect()}this.voices=[]}
}
export function normalizeBuffer(buffer:AudioBuffer){
 let peak=0;for(let ch=0;ch<buffer.numberOfChannels;ch++)for(const sample of buffer.getChannelData(ch))peak=Math.max(peak,Math.abs(sample));
 if(!peak)return;const scale=Math.pow(10,-1/20)/peak;
 for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]*=scale}
}
export async function renderMix(tracks:AudioTrack[],master:number,options:{sampleRate?:number;normalize?:boolean}={}){
 const duration=trackEnd(tracks);if(!duration)throw new Error('Não há áudio para exportar.');
 const rate=options.sampleRate===48000?48000:44100;
 const ctx=new OfflineAudioContext(2,Math.ceil((duration+.02)*rate),rate);const output=ctx.createGain(),safety=ctx.createWaveShaper();output.gain.value=master;safety.curve=safetyCurve();safety.oversample='2x';output.connect(safety).connect(ctx.destination);
 for(const track of tracks){const source=ctx.createBufferSource(),gain=ctx.createGain(),pan=ctx.createStereoPanner();source.buffer=track.buffer;gain.gain.value=trackGain(track,tracks);pan.pan.value=track.pan??0;source.connect(gain).connect(pan).connect(output);source.start(track.offset)}
 const rendered=await ctx.startRendering();if(options.normalize)normalizeBuffer(rendered);return bufferWav(rendered)
}
