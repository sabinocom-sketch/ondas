export type PickingStyle='pick'|'finger'|'rasgueado';

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

export function chordNotes(name:GuitarChordName,direction:'down'|'up'='down'){
 const notes=guitarChords[name].flatMap((fret,string)=>fret===null?[]:[{string,note:guitarTuning[string]+fret}]);
 return direction==='down'?notes:notes.reverse();
}

export function pickingDelay(style:PickingStyle){return style==='rasgueado'?24:style==='finger'?62:38}
