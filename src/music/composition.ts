import {emptyDrums,validDrums,type DrumPattern,type DrumId} from './drum-pattern';
export const STEPS=64,LOW=48,HIGH=95;
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
 drumHit?(id:DrumId,velocity:number):void;start():Promise<void>;context?:{currentTime:number;state:string};noteOn(id:string,note:number):void;sequenceOff(id:string):void;stopSequence():void;
 listeners:Set<()=>void>;panicListeners:Set<()=>void>;
}
/** Foreground transport follows the audio clock, not accumulated timer ticks. */
export class RollPlayer{
 private drumStep=-1;private timer?:ReturnType<typeof setInterval>;private epoch=0;private origin=0;private active=new Set<string>();private composition=emptyComposition();running=false;private starting=false;
 constructor(private engine:SequencerEngine,private changed:(step:number,running:boolean)=>void){engine.listeners.add(this.state);engine.panicListeners.add(this.stop)}
 private state=()=>{if(this.engine.context?.state!=='running'&&this.running)this.stop()};
 async start(p:Composition){this.stop();if(!hasEvents(p))return;const epoch=++this.epoch;this.starting=true;await this.engine.start();if(epoch!==this.epoch)return;this.starting=false;this.composition=JSON.parse(JSON.stringify(p));this.origin=this.engine.context!.currentTime;this.running=true;this.drumStep=-1;this.tick();this.timer=setInterval(()=>this.tick(),20)}
 tick(){if(!this.running)return;const t=this.engine.context;if(!t||t.state!=='running'){this.stop();return}const now=notesAt(this.composition,t.currentTime-this.origin);if(now.step===STEPS){this.stop();return}
 const absoluteStep=now.cycle*STEPS+Math.floor(now.step);
 if(absoluteStep!==this.drumStep){this.drumStep=absoluteStep;const index=Math.floor(now.step);for(const track of this.composition.drums?.tracks??[])if(!track.muted&&track.volume>0&&track.steps[index]>0)this.engine.drumHit?.(track.id,track.volume*track.steps[index])}
 const next=new Set(now.notes.map(n=>`roll:${this.epoch}:${now.cycle}:${n.id}`));
 const previous=this.active;this.active=next;
 previous.forEach(id=>{if(!next.has(id))this.engine.sequenceOff(id)});
 now.notes.forEach(n=>{const id=`roll:${this.epoch}:${now.cycle}:${n.id}`;if(!previous.has(id))this.engine.noteOn(id,n.note)});
 this.changed(now.step,true);
 }
 stop=()=>{this.epoch++;const wasActive=this.running||this.starting;this.running=false;this.starting=false;clearInterval(this.timer);this.active.clear();this.engine.stopSequence();if(wasActive)this.changed(0,false)};
 dispose(){this.stop();this.engine.listeners.delete(this.state);this.engine.panicListeners.delete(this.stop)}
}
