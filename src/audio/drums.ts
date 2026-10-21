import {DRUMS,type DrumId} from '../music/drum-pattern';
const durations:Record<DrumId,number>={kick:.65,snare:.32,closedHat:.09,openHat:.65,clap:.3,tom:.6,conga:.38,shaker:.14};
/** Deterministic one-shot percussion, generated locally without sample downloads. */
export function drumSamples(id:DrumId,sampleRate:number):Float32Array{
 const data=new Float32Array(Math.ceil(durations[id]*sampleRate));let seed=DRUMS.findIndex(d=>d.id===id)+79,previous=0,phase=0;
 for(let i=0;i<data.length;i++){const t=i/sampleRate;seed=(seed*16807)%2147483647;const noise=seed/2147483647*2-1,high=(noise-previous)*.5;previous=noise;let value=0;
  if(id==='kick'){phase+=2*Math.PI*(45+115*Math.exp(-t*35))/sampleRate;value=.9*Math.sin(phase)*Math.exp(-t*9)+.15*high*Math.exp(-t*160)}
  if(id==='snare')value=.65*noise*Math.exp(-t*18)+.35*Math.sin(2*Math.PI*185*t)*Math.exp(-t*28);
  if(id==='closedHat')value=.65*high*Math.exp(-t*58);
  if(id==='openHat')value=.55*high*Math.exp(-t*8);
  if(id==='clap'){const burst=t<.036?Math.exp(-(t%.012)*250):.5*Math.exp(-(t-.036)*23);value=.8*high*burst}
  if(id==='tom'){phase+=2*Math.PI*(85+75*Math.exp(-t*24))/sampleRate;value=.8*Math.sin(phase)*Math.exp(-t*10)+.07*noise*Math.exp(-t*60)}
  if(id==='conga')value=(.6*Math.sin(2*Math.PI*185*t)+.25*Math.sin(2*Math.PI*287*t))*Math.exp(-t*15)+.1*high*Math.exp(-t*100);
  if(id==='shaker')value=.65*high*Math.sin(Math.PI*Math.min(1,t/.14))*Math.exp(-t*16);
  const attack=Math.min(1,t/.001),tail=Math.min(1,(data.length-1-i)/(sampleRate*.005));data[i]=Math.max(-1,Math.min(1,value))*attack*Math.max(0,tail);
 }
 return data;
}
export class DrumKit{
 private buffers=new Map<DrumId,AudioBuffer>();
 private hits=new Set<{id:DrumId;source:AudioBufferSourceNode;gain:GainNode;cleanup:()=>void}>();
 readonly limit=32;
 constructor(readonly ctx:BaseAudioContext,private target:AudioNode){for(const {id} of DRUMS){const samples=drumSamples(id,ctx.sampleRate),buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);buffer.copyToChannel(samples,0);this.buffers.set(id,buffer)}}
 get activeCount(){return this.hits.size}
 trigger(id:DrumId,velocity=1,at=this.ctx.currentTime){if(!this.buffers.has(id)||!Number.isFinite(velocity)||velocity<=0)return;
  if(id==='closedHat')for(const hit of this.hits)if(hit.id==='openHat')hit.cleanup();
  if(this.hits.size>=this.limit)this.hits.values().next().value?.cleanup();
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.buffers.get(id)!;gain.gain.value=Math.min(1,velocity);source.connect(gain).connect(this.target);
  let timer:ReturnType<typeof setTimeout>|undefined;let cleaned=false;
  const hit={id,source,gain,cleanup:()=>{if(cleaned)return;cleaned=true;clearTimeout(timer);source.onended=null;try{source.stop()}catch{}source.disconnect();gain.disconnect();source.buffer=null;this.hits.delete(hit)}};
  this.hits.add(hit);source.onended=hit.cleanup;source.start(Math.max(this.ctx.currentTime,at));
  if('resume' in this.ctx&&!('startRendering' in this.ctx))timer=setTimeout(hit.cleanup,Math.max(0,(at-this.ctx.currentTime+durations[id]+.2)*1000));
 }
 stop(){for(const hit of this.hits)hit.cleanup()}
 dispose(){this.stop();this.buffers.clear()}
}
