import {noteVelocity,type RollNote} from './composition';
import type {NoteTrack} from './song';

export interface AuditionEngine{
 context?:{currentTime:number};
 prepareSequence(instruments:string[]):Promise<void>;
 sequenceNote(id:string,note:number,start:number,end:number,instrument:string,volume:number,expression:{instrument:string;velocity:number;durationSeconds:number;articulation?:RollNote['articulation'];level:number;mode:'expressive'}):void;
 sequenceOff(id:string,at?:number):void;
}

/** Short-lived notes routed through the same sequence engine as normal playback. */
export class NoteAuditioner{
 private epoch=0;private active?:string;
 constructor(private engine:AuditionEngine){}
 async play(note:RollNote,track:Pick<NoteTrack,'instrument'|'volume'>,bpm:number){
  const epoch=++this.epoch,instrument=track.instrument;
  await this.engine.prepareSequence([instrument]);
  if(epoch!==this.epoch||!this.engine.context)return false;
  this.stopActive();
  const duration=Math.max(.01,note.length*60/bpm/4),start=this.engine.context.currentTime+.015,id=`roll:audition:${epoch}`;
  this.active=id;
  this.engine.sequenceNote(id,note.note,start,start+duration,instrument,track.volume,{instrument,velocity:noteVelocity(note),durationSeconds:duration,articulation:note.articulation,level:track.volume,mode:'expressive'});
  return true;
 }
 cancel(){this.epoch++;this.stopActive()}
 private stopActive(){if(this.active){this.engine.sequenceOff(this.active);this.active=undefined}}
}
