import {VoiceManager} from './voice-manager';
import {SamplePlayer,sampleLibrary,type SampleInstrumentId} from './sampler';
import {clonePatch,defaults,type Patch} from './parameters';
import {library} from '../presets/library';

/** Shared playback/export routing. Offline queues are not live voice slots. */
export class SequenceAudio {
 readonly manager:VoiceManager;
 private samplers=new Map<SampleInstrumentId,SamplePlayer>();
 constructor(private ctx:BaseAudioContext,private input:AudioNode,private patch:()=>Patch=()=>defaults,private offline=false,changed=()=>{}){
  this.manager=new VoiceManager(ctx,input,offline?Infinity:16,changed);
 }
 async prepare(instruments:string[]){
  const ids=[...new Set(instruments)].filter((id):id is SampleInstrumentId=>sampleLibrary.some(s=>s.id===id));
  await Promise.all(ids.map(async id=>{let player=this.samplers.get(id);if(!player){player=new SamplePlayer(this.ctx,this.input,this.offline?Infinity:16);this.samplers.set(id,player)}if(!player.loaded||player.instrument!==id)await player.load(id)}));
 }
 note(id:string,note:number,start:number,end:number,instrument='classic',volume=1){
  const sample=this.samplers.get(instrument as SampleInstrumentId);
  if(sample){sample.noteOn(id,note,{gain:.82*volume},start);sample.noteOff(id,end);return}
  if(sampleLibrary.some(s=>s.id===instrument))throw new Error('O instrumento ainda não foi carregado.');
  const p=clonePatch(library.find(p=>p.id===instrument)?.patch??this.patch());
  p.osc.forEach(o=>o.volume*=volume);
  this.manager.noteOn(id,note,p,start);this.manager.noteOff(id,end);
 }
 off(id:string,at=this.ctx.currentTime){this.manager.noteOff(id,at);this.samplers.forEach(s=>s.noteOff(id,at))}
 stop(){this.manager.panic();this.samplers.forEach(s=>s.panic())}
 dispose(){this.manager.panic();this.samplers.forEach(s=>s.dispose());this.samplers.clear()}
}
