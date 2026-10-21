import {DrumKit} from './drums';
import type {DrumId} from '../music/drum-pattern';
import {defaults,clonePatch,validPatch,type Patch} from './parameters';
import {Effects} from './effects';
import {VoiceManager} from './voice-manager';
import {SamplePlayer,type SampleArticulation,type SampleInstrumentId} from './sampler';
import {sampleLibrary} from './sampler';
import {library} from '../presets/library';
export class Engine {
 drums?:DrumKit;context?:AudioContext;effects?:Effects;manager?:VoiceManager;sampler?:SamplePlayer;sampleInstrument?:SampleInstrumentId;sampleLoading=false;private selectionEpoch=0;private sequenceSamplers=new Map<SampleInstrumentId,SamplePlayer>();patch=clonePatch(defaults);listeners=new Set<()=>void>();panicListeners=new Set<()=>void>();
 emit=()=>this.listeners.forEach(fn=>fn());
 async start(){if(!this.context||this.context.state==='closed'){this.drums?.dispose();this.sampler?.dispose();this.sequenceSamplers.forEach(s=>s.dispose());this.sequenceSamplers.clear();this.effects?.dispose();this.context=new AudioContext({latencyHint:'interactive'});this.effects=new Effects(this.context);this.effects.update(this.patch);this.drums=new DrumKit(this.context,this.effects.percussionInput);this.manager=new VoiceManager(this.context,this.effects.input,16,this.emit);this.sampler=new SamplePlayer(this.context,this.effects.input);this.context.onstatechange=()=>{if(this.context?.state!=='running')this.panic();this.emit()}}await this.context.resume();this.emit()}
 async selectSampleInstrument(id?:SampleInstrumentId){const epoch=++this.selectionEpoch;this.panic();this.sampleInstrument=id;if(!id){this.sampleLoading=false;this.emit();return}this.sampleLoading=true;this.emit();try{await this.start();if(epoch!==this.selectionEpoch)return;await this.sampler!.load(id);if(epoch!==this.selectionEpoch)return;this.sampleInstrument=id}catch(e){if(epoch===this.selectionEpoch)this.sampleInstrument=undefined;throw e}finally{if(epoch===this.selectionEpoch){this.sampleLoading=false;this.emit()}}}
 noteOn(id:string,note:number,articulation?:SampleArticulation){if(this.context?.state!=='running')return;if(this.sampleInstrument)this.sampler?.noteOn(id,note,articulation);else this.manager?.noteOn(id,note,this.patch);this.emit()}
 noteOff(id:string){if(this.sampleInstrument)this.sampler?.noteOff(id);else this.manager?.noteOff(id);this.emit()}
 sustain(v:boolean){this.manager?.setSustain(v);this.sampler?.setSustain(v)}
 setPatch(p:Patch){if(!validPatch(p))throw new Error('Parâmetros inválidos');this.patch=clonePatch(p);this.manager?.update(p);this.effects?.update(p);this.emit()}
 drumHit(id:DrumId,velocity:number,at=this.context?.currentTime){if(this.context?.state==='running')this.drums?.trigger(id,velocity,at)}
 async prepareSequence(instruments:string[]){await this.start();const ids=[...new Set(instruments)].filter((id):id is SampleInstrumentId=>sampleLibrary.some(s=>s.id===id));await Promise.all(ids.map(async id=>{let player=this.sequenceSamplers.get(id);if(!player){player=new SamplePlayer(this.context!,this.effects!.input);this.sequenceSamplers.set(id,player)}if(!player.loaded||player.instrument!==id)await player.load(id)}))}
 sequenceNote(id:string,note:number,start:number,end:number,instrument='classic',volume=1){const sample=this.sequenceSamplers.get(instrument as SampleInstrumentId);if(sample){sample.noteOn(id,note,{gain:.82*volume},start);sample.noteOff(id,end)}else{const source=library.find(p=>p.id===instrument)?.patch??this.patch,p=clonePatch(source);p.osc.forEach(o=>o.volume*=volume);this.manager?.noteOn(id,note,p,start);this.manager?.noteOff(id,end)}this.emit()}
 sequenceOff(id:string,at=this.context?.currentTime){this.manager?.noteOff(id,at);this.sampler?.noteOff(id,at);this.sequenceSamplers.forEach(s=>s.noteOff(id,at))}
 stopSequence(){this.drums?.stop();this.sampler?.stopPrefix('roll:');this.sequenceSamplers.forEach(s=>s.stopPrefix('roll:'));if(!this.manager)return;[...this.manager.voices.values(),...this.manager.retiring].filter(v=>v.id.startsWith('roll:')).forEach(v=>v.dispose())}
 panic(){this.panicListeners.forEach(fn=>fn());this.manager?.panic();this.sampler?.panic();this.sequenceSamplers.forEach(s=>s.panic());this.drums?.stop()}
 async dispose(){this.panic();this.drums?.dispose();this.drums=undefined;this.sampler?.dispose();this.sampler=undefined;this.sequenceSamplers.forEach(s=>s.dispose());this.sequenceSamplers.clear();this.effects?.dispose();if(this.context){this.context.onstatechange=null;if(this.context.state!=='closed')await this.context.close()}this.effects=undefined;this.manager=undefined;this.emit()}
}
export const engine=new Engine();
