export type PickingStyle='pick'|'finger'|'rasgueado'|'mute';
export type StrumDirection='down'|'up';
export type GuitarGestureNote={string:number;note:number;delayMs:number;velocity:number;articulation:'downstroke'|'upstroke'};
export type GuitarGesture={id:string;noteIds:string[];direction:StrumDirection;durationMs:number;intensity:number};
export type GestureParticipant={id:string;note:number;velocity?:number};

export const guitarTuning=[40,45,50,55,59,64] as const;
export const guitarStringNames=['Mi grave','Lá','Ré','Sol','Si','Mi agudo'] as const;
export const guitarOpenNotes=['Mi2','Lá2','Ré3','Sol3','Si3','Mi4'] as const;
export const portugueseNotes=['Dó','Dó♯','Ré','Ré♯','Mi','Fá','Fá♯','Sol','Sol♯','Lá','Lá♯','Si'] as const;

export function midiNoteName(note:number){return portugueseNotes[note%12]+Math.floor(note/12-1)}

export const guitarChords={
 'Em':[0,2,2,0,0,0],
 'G':[3,2,0,0,0,3],
 'C':[null,3,2,0,1,0],
 'D':[null,null,0,2,3,2],
 'Am':[null,0,2,2,1,0],
 'E':[0,2,2,1,0,0],
 'A':[null,0,2,2,2,0]
} satisfies Record<string,(number|null)[]>;

export type GuitarChordName=keyof typeof guitarChords;

export function chordNotes(name:GuitarChordName,direction:StrumDirection='down'){
 const notes=guitarChords[name].flatMap((fret,string)=>fret===null?[]:[{string,note:guitarTuning[string]+fret}]);
 return direction==='down'?notes:notes.reverse();
}

export function pickingDelay(style:PickingStyle){return style==='rasgueado'?24:style==='finger'?62:style==='mute'?30:38}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** A deterministic strum: direction controls order, duration controls the whole gesture,
 * and velocity follows the hand through the strings instead of remaining flat. */
export function strumGesture(name:GuitarChordName,direction:StrumDirection,durationMs=120,intensity=100):GuitarGestureNote[]{
 const notes=chordNotes(name,direction),duration=clamp(Number.isFinite(durationMs)?durationMs:120,18,420),base=clamp(Math.round(Number.isFinite(intensity)?intensity:100),1,127),last=Math.max(1,notes.length-1);
 return notes.map((item,index)=>{const progress=index/last,handAccent=direction==='down'?1.06-progress*.12:.94+progress*.12;return{...item,delayMs:Math.round(duration*progress),velocity:clamp(Math.round(base*handAccent),1,127),articulation:direction==='down'?'downstroke':'upstroke'}});
}

export function gesturePerformance(notes:GestureParticipant[],gesture:GuitarGesture){
 const members=gesture.noteIds.map(id=>notes.find(note=>note.id===id)).filter((note):note is GestureParticipant=>Boolean(note)).sort((a,b)=>gesture.direction==='down'?a.note-b.note:b.note-a.note),last=Math.max(1,members.length-1),duration=clamp(gesture.durationMs,18,420),intensity=clamp(gesture.intensity,1,127);
 return members.map((note,index)=>{const progress=index/last,handAccent=gesture.direction==='down'?1.06-progress*.12:.94+progress*.12,base=(note.velocity??100)*intensity/100,articulation:'downstroke'|'upstroke'=gesture.direction==='down'?'downstroke':'upstroke';return{id:note.id,delayMs:Math.round(duration*progress),velocity:clamp(Math.round(base*handAccent),1,127),articulation}});
}

export function pluckExpression(style:Exclude<PickingStyle,'rasgueado'>,string:number,intensity=100){
 const variation=[-5,2,-2,4,-1,2][clamp(Math.round(string),0,5)],velocity=clamp(Math.round(intensity)+(style==='finger'?variation:0),1,127);
 const articulation:'finger'|'pick'|'mute'=style==='finger'?'finger':style==='mute'?'mute':'pick';
 return{velocity,articulation,durationSeconds:style==='finger'?.95:style==='mute'?.24:.68,mode:'expressive' as const};
}
