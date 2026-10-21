import {emptyDrums,validDrums,type DrumPattern,type DrumId} from './drum-pattern';
export const STEPS=64,LOW=24,HIGH=95;
export interface RollNote{id:string;note:number;start:number;length:number}
export interface Composition{version:1;bpm:number;loop:boolean;notes:RollNote[];drums?:DrumPattern}
export const emptyComposition=():Composition=>({version:1,bpm:110,loop:true,notes:[],drums:emptyDrums()});
export function validComposition(x:unknown):x is Composition{
 if(!x||typeof x!=='object')return false;const p=x as Composition;
 return (p.drums===undefined||validDrums(p.drums))&&p.version===1&&Number.isInteger(p.bpm)&&p.bpm>=40&&p.bpm<=240&&typeof p.loop==='boolean'&&Array.isArray(p.notes)&&p.notes.length<=256&&new Set(p.notes.map(n=>n?.id)).size===p.notes.length&&p.notes.every(n=>n&&typeof n.id==='string'&&n.id.length>0&&n.id.length<=80&&Number.isInteger(n.note)&&n.note>=LOW&&n.note<=HIGH&&Number.isInteger(n.start)&&n.start>=0&&n.start<STEPS&&Number.isInteger(n.length)&&n.length>=1&&n.start+n.length<=STEPS);
}
export function fitNote(n:RollNote):RollNote{return{...n,note:Math.max(LOW,Math.min(HIGH,Math.round(n.note))),start:Math.max(0,Math.min(STEPS-1,Math.round(n.start))),length:Math.max(1,Math.min(STEPS-Math.max(0,Math.min(STEPS-1,Math.round(n.start))),Math.round(n.length)))}}
export function notesAt(p:Composition,elapsed:number){const position=Math.max(0,elapsed)/(60/p.bpm/4),cycle=Math.floor(position/STEPS);if(!p.loop&&cycle>0)return{step:STEPS,cycle,notes:[]};const step=position%STEPS;return{step,cycle,notes:p.notes.filter(n=>step>=n.start&&step<n.start+n.length)}}
const KEY='ondas.composition.v1';
export function loadComposition(storage:Storage=localStorage):Composition{try{const p=JSON.parse(storage.getItem(KEY)||'null');return validComposition(p)?p:emptyComposition()}catch{return emptyComposition()}}
export function storeComposition(p:Composition,storage:Storage=localStorage){storage.setItem(KEY,JSON.stringify(p))}
export const noteName=(note:number)=>['Dó','Dó♯','Ré','Ré♯','Mi','Fá','Fá♯','Sol','Sol♯','Lá','Lá♯','Si'][note%12]+(Math.floor(note/12)-1);

export const hasEvents=(p:Composition)=>p.notes.length>0||Boolean(p.drums?.tracks.some(t=>!t.muted&&t.volume>0&&t.steps.some(v=>v>0)));
interface SequencerEngine{
 drumHit?(id:DrumId,velocity:number,at?:number):void;start():Promise<void>;context?:{currentTime:number;state:string};sequenceNote(id:string,note:number,start:number,end:number):void;sequenceOff(id:string,at?:number):void;stopSequence():void;
 listeners:Set<()=>void>;panicListeners:Set<()=>void>;
}
/** Foreground transport follows the audio clock, not accumulated timer ticks. */
export class RollPlayer{
 private timer?:ReturnType<typeof setInterval>;private epoch=0;private origin=0;private scheduledStep=0;private composition=emptyComposition();running=false;private starting=false;readonly lookAhead=.12;
 constructor(private engine:SequencerEngine,private changed:(step:number,running:boolean)=>void){engine.listeners.add(this.state);engine.panicListeners.add(this.stop)}
 private state=()=>{if(this.engine.context?.state!=='running'&&this.running)this.stop()};
 async start(p:Composition){this.stop();if(!hasEvents(p))return;const epoch=++this.epoch;this.starting=true;await this.engine.start();if(epoch!==this.epoch)return;this.starting=false;this.composition=JSON.parse(JSON.stringify(p));this.origin=this.engine.context!.currentTime+.05;this.scheduledStep=0;this.running=true;this.tick();this.timer=setInterval(()=>this.tick(),25)}
 private schedule(step:number,stepTime:number,stepDuration:number){const cycle=Math.floor(step/STEPS),index=step%STEPS;if(!this.composition.loop&&cycle>0)return;for(const track of this.composition.drums?.tracks??[])if(!track.muted&&track.volume>0&&track.steps[index]>0)this.engine.drumHit?.(track.id,track.volume*track.steps[index],stepTime);for(const note of this.composition.notes)if(note.start===index){const id=`roll:${this.epoch}:${cycle}:${note.id}`;this.engine.sequenceNote(id,note.note,stepTime,stepTime+note.length*stepDuration)}}
 tick(){if(!this.running)return;const t=this.engine.context;if(!t||t.state!=='running'){this.stop();return}const stepDuration=60/this.composition.bpm/4,elapsed=t.currentTime-this.origin;if(!this.composition.loop&&elapsed>=STEPS*stepDuration){this.stop();return}const horizon=Math.max(0,t.currentTime+this.lookAhead-this.origin),last=Math.floor(horizon/stepDuration);while(this.scheduledStep<=last&&(this.composition.loop||this.scheduledStep<STEPS)){const at=this.origin+this.scheduledStep*stepDuration;this.schedule(this.scheduledStep,at,stepDuration);this.scheduledStep++}const visual=notesAt(this.composition,Math.max(0,elapsed));this.changed(visual.step,true)}
 stop=()=>{this.epoch++;const wasActive=this.running||this.starting;this.running=false;this.starting=false;clearInterval(this.timer);this.engine.stopSequence();if(wasActive)this.changed(0,false)};
 dispose(){this.stop();this.engine.listeners.delete(this.state);this.engine.panicListeners.delete(this.stop)}
}
