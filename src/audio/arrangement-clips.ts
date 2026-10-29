export const ARRANGER_PPQ=4;
export type ClipWindow={id:string;laneId:string;startTick:number;durationTicks:number;contentOffsetTicks:number;contentLengthTicks:number};
export type SnapDivision=1|2|4|8|16;

const integer=(value:number)=>Math.max(0,Math.round(Number.isFinite(value)?value:0));
export const secondsPerTick=(bpm:number)=>60/Math.max(40,Math.min(240,bpm))/ARRANGER_PPQ;
export const secondsToTicks=(seconds:number,bpm:number)=>integer(seconds/secondsPerTick(bpm));
export const ticksToSeconds=(ticks:number,bpm:number)=>integer(ticks)*secondsPerTick(bpm);
export const snapTick=(tick:number,division:SnapDivision|0)=>division?Math.max(0,Math.round(integer(tick)/division)*division):integer(tick);

export function validClipWindow(value:unknown):value is ClipWindow{
 if(!value||typeof value!=='object')return false;const clip=value as ClipWindow;
 return typeof clip.id==='string'&&clip.id.length>0&&typeof clip.laneId==='string'&&clip.laneId.length>0&&Number.isInteger(clip.startTick)&&clip.startTick>=0&&Number.isInteger(clip.durationTicks)&&clip.durationTicks>=1&&Number.isInteger(clip.contentOffsetTicks)&&clip.contentOffsetTicks>=0&&Number.isInteger(clip.contentLengthTicks)&&clip.contentLengthTicks>=1&&clip.contentOffsetTicks+clip.durationTicks<=clip.contentLengthTicks;
}
export const moveClip=(clip:ClipWindow,startTick:number,snap:SnapDivision|0=0):ClipWindow=>({...clip,startTick:snapTick(startTick,snap)});
export const resizeClip=(clip:ClipWindow,durationTicks:number,snap:SnapDivision|0=0):ClipWindow=>({...clip,durationTicks:Math.max(1,Math.min(clip.contentLengthTicks-clip.contentOffsetTicks,snap?snapTick(durationTicks,snap):integer(durationTicks)))});
export const duplicateClip=(clip:ClipWindow,id=crypto.randomUUID(),startTick=clip.startTick+clip.durationTicks):ClipWindow=>({...structuredClone(clip),id,startTick:integer(startTick)});
/** Split semantics: rendered/source content continues at the right-hand offset.
 * A sustained event crossing the cut therefore has one attack in the left clip
 * and a continuation in the right clip, never two attacks at the boundary. */
export function splitClip(clip:ClipWindow,absoluteTick:number,leftId=crypto.randomUUID(),rightId=crypto.randomUUID()):[ClipWindow,ClipWindow]|null{
 const cut=integer(absoluteTick),relative=cut-clip.startTick;if(relative<=0||relative>=clip.durationTicks)return null;
 return[{...structuredClone(clip),id:leftId,durationTicks:relative},{...structuredClone(clip),id:rightId,startTick:cut,durationTicks:clip.durationTicks-relative,contentOffsetTicks:clip.contentOffsetTicks+relative}];
}
export const clipsOverlap=(a:ClipWindow,b:ClipWindow)=>a.laneId===b.laneId&&a.startTick<b.startTick+b.durationTicks&&b.startTick<a.startTick+a.durationTicks;
export type ClipNoteEvent<T extends {start:number;length:number}>={note:T;absoluteStartTick:number;durationTicks:number;attack:boolean};
/** Projects source notes through a clip window. Crossing notes continue on the
 * right side with attack=false, so schedulers can resume without retriggering. */
export function clipNoteEvents<T extends {start:number;length:number}>(clip:ClipWindow,notes:T[]):ClipNoteEvent<T>[]{
 const from=clip.contentOffsetTicks,to=from+clip.durationTicks;return notes.flatMap(note=>{const end=note.start+note.length;if(end<=from||note.start>=to)return[];const visibleStart=Math.max(from,note.start),visibleEnd=Math.min(to,end);return[{note:structuredClone(note),absoluteStartTick:clip.startTick+visibleStart-from,durationTicks:visibleEnd-visibleStart,attack:note.start>=from}]});
}
