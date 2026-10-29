import {DrumKit} from './drums';
import type {DrumId} from '../music/drum-pattern';
import {defaults,clonePatch,validPatch,type Patch} from './parameters';
import {Effects} from './effects';
import {VoiceManager} from './voice-manager';
import {SamplePlayer,type SampleArticulation,type SampleInstrumentId} from './sampler';
import {SequenceAudio} from './sequence-audio';
import {applyExpressivenessToPatch,expressiveness,expressiveSampleParameters,type ExpressiveInput,type NoteArticulation} from './expressiveness';
export type LiveNoteArticulation=SampleArticulation&{velocity?:number;articulation?:NoteArticulation;durationSeconds?:number;mode?:'legacy'|'expressive'};
export class Engine {
 drums?:DrumKit;context?:AudioContext;effects?:Effects;manager?:VoiceManager;sampler?:SamplePlayer;sampleInstrument?:SampleInstrumentId;activeInstrument='classic';sampleLoading=false;private selectionEpoch=0;private sequence?:SequenceAudio;patch=clonePatch(defaults);listeners=new Set<()=>void>();panicListeners=new Set<()=>void>();
 emit=()=>this.listeners.forEach(fn=>fn());
 async start(){if(!this.context||this.context.state==='closed'){this.drums?.dispose();this.sampler?.dispose();this.sequence?.dispose();this.effects?.dispose();this.context=new AudioContext({latencyHint:'interactive'});this.effects=new Effects(this.context);this.effects.update(this.patch,true);this.drums=new DrumKit(this.context,this.effects.percussionInput);this.manager=new VoiceManager(this.context,this.effects.input,16,this.emit);this.sampler=new SamplePlayer(this.context,this.effects.input);this.sequence=new SequenceAudio(this.context,this.effects.input,()=>this.patch,false,this.emit);this.context.onstatechange=()=>{if(this.context?.state!=='running')this.panic();this.emit()}}await this.context.resume();this.emit()}
 async selectSampleInstrument(id?:SampleInstrumentId){const epoch=++this.selectionEpoch;this.panic();this.sampleInstrument=id;if(id)this.activeInstrument=id;if(!id){this.sampleLoading=false;this.emit();return}this.sampleLoading=true;this.emit();try{await this.start();if(epoch!==this.selectionEpoch)return;await this.sampler!.load(id);if(epoch!==this.selectionEpoch)return;this.sampleInstrument=id}catch(e){if(epoch===this.selectionEpoch)this.sampleInstrument=undefined;throw e}finally{if(epoch===this.selectionEpoch){this.sampleLoading=false;this.emit()}}}
 noteOn(id:string,note:number,articulation:LiveNoteArticulation={}){if(this.context?.state!=='running')return;const enabled=articulation.mode==='expressive'||articulation.velocity!==undefined||articulation.articulation!==undefined,params=enabled?expressiveness({instrument:this.activeInstrument,velocity:articulation.velocity,durationSeconds:articulation.durationSeconds,articulation:articulation.articulation,mode:'expressive'}):null;if(this.sampleInstrument)this.sampler?.noteOn(id,note,params?expressiveSampleParameters(params):articulation);else if(params)this.manager?.noteOn(id,note,applyExpressivenessToPatch(clonePatch(this.patch),params));else this.manager?.noteOn(id,note,this.patch);this.emit()}
 noteOff(id:string){if(this.sampleInstrument)this.sampler?.noteOff(id);else this.manager?.noteOff(id);this.emit()}
 sustain(v:boolean){this.manager?.setSustain(v);this.sampler?.setSustain(v)}
 setPatch(p:Patch){if(!validPatch(p))throw new Error('Parâmetros inválidos');this.patch=clonePatch(p);this.manager?.update(p);this.effects?.update(p);this.emit()}
 drumHit(id:DrumId,velocity:number,at=this.context?.currentTime){if(this.context?.state==='running')this.drums?.trigger(id,velocity,at)}
 async prepareSequence(instruments:string[]){await this.start();await this.sequence!.prepare(instruments)}
 sequenceNote(id:string,note:number,start:number,end:number,instrument='classic',volume=1,expression?:ExpressiveInput){this.sequence?.note(id,note,start,end,instrument,volume,expression);this.emit()}
 sequenceOff(id:string,at=this.context?.currentTime){this.sequence?.off(id,at)}
 stopSequence(){this.drums?.stop();this.sequence?.stop()}
 panic(){this.panicListeners.forEach(fn=>fn());this.manager?.panic();this.sampler?.panic();this.sequence?.stop();this.drums?.stop()}
 async dispose(){this.panic();this.drums?.dispose();this.drums=undefined;this.sampler?.dispose();this.sampler=undefined;this.sequence?.dispose();this.effects?.dispose();if(this.context){this.context.onstatechange=null;if(this.context.state!=='closed')await this.context.close()}this.effects=undefined;this.manager=undefined;this.emit()}
}
export const engine=new Engine();
