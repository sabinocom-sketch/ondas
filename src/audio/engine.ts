import {DrumKit} from './drums';
import type {DrumId} from '../music/drum-pattern';
import {defaults,clonePatch,validPatch,type Patch} from './parameters';
import {Effects} from './effects';
import {VoiceManager} from './voice-manager';
export class Engine {
 drums?:DrumKit;context?:AudioContext;effects?:Effects;manager?:VoiceManager;patch=clonePatch(defaults);listeners=new Set<()=>void>();panicListeners=new Set<()=>void>();
 emit=()=>this.listeners.forEach(fn=>fn());
 async start(){if(!this.context||this.context.state==='closed'){this.drums?.dispose();this.effects?.dispose();this.context=new AudioContext({latencyHint:'interactive'});this.effects=new Effects(this.context);this.effects.update(this.patch);this.drums=new DrumKit(this.context,this.effects.percussionInput);this.manager=new VoiceManager(this.context,this.effects.input,16,this.emit);this.context.onstatechange=()=>{if(this.context?.state!=='running')this.panic();this.emit()}}await this.context.resume();this.emit()}
 noteOn(id:string,note:number){if(this.context?.state==='running')this.manager?.noteOn(id,note,this.patch)}
 noteOff(id:string){this.manager?.noteOff(id)}
 sustain(v:boolean){this.manager?.setSustain(v)}
 setPatch(p:Patch){if(!validPatch(p))throw new Error('Parâmetros inválidos');this.patch=clonePatch(p);this.manager?.update(p);this.effects?.update(p);this.emit()}
 drumHit(id:DrumId,velocity:number){if(this.context?.state==='running')this.drums?.trigger(id,velocity)}
 sequenceOff(id:string){this.manager?.voices.get(id)?.release()}
 stopSequence(){this.drums?.stop();if(!this.manager)return;[...this.manager.voices.values(),...this.manager.retiring].filter(v=>v.id.startsWith('roll:')).forEach(v=>v.dispose())}
 panic(){this.panicListeners.forEach(fn=>fn());this.manager?.panic();this.drums?.stop()}
 async dispose(){this.panic();this.drums?.dispose();this.drums=undefined;this.effects?.dispose();if(this.context){this.context.onstatechange=null;if(this.context.state!=='closed')await this.context.close()}this.effects=undefined;this.manager=undefined;this.emit()}
}
export const engine=new Engine();
