import {emptyDrums,type DrumId} from './drum-pattern';
import type {NoteTrack,SongBlock,SongProject} from './song';

const note=(id:string,note:number,start:number,length:number,velocity:number,articulation?:NoteTrack['notes'][number]['articulation'])=>({id,note,start,length,velocity,...(articulation?{articulation}:{})});
const track=(id:string,name:string,instrument:string,notes:NoteTrack['notes'],gestures?:NoteTrack['gestures']):NoteTrack=>({id,name,instrument,volume:.72,muted:false,solo:false,notes,...(gestures?{gestures}:{})});

function drums(){
 const pattern=emptyDrums();pattern.swing=56;pattern.humanizeTimingMs=9;pattern.humanizeVelocity=6;pattern.humanizeSeed=20261029;
 const put=(id:DrumId,steps:number[],velocity:number)=>{const row=pattern.tracks.find(item=>item.id===id)!;for(const step of steps)row.steps[step]=velocity};
 put('kick',[0,8,16,24,32,40,48,56],118);put('snare',[4,12,20,28,36,44,52,60],108);put('snare',[10,26,42,58],32);
 put('closedHat',Array.from({length:32},(_,index)=>index*2),72);put('openHat',[14,30,46,62],88);put('shaker',[3,7,11,15,19,23,27,31,35,39,43,47,51,55,59,63],48);
 return pattern;
}

function verse():SongBlock{
 const acoustic=[note('a-low',45,0,8,88,'finger'),note('a-mid',52,0,8,92,'finger'),note('a-high',60,0,8,96,'finger'),note('a-pick',64,12,4,104,'pick')];
 return{id:'reference-verse',name:'Referência A — dinâmica',steps:64,drums:drums(),tracks:[
  track('reference-piano-a','Piano','grand-piano',[note('p-soft',60,0,12,48,'soft'),note('p-normal',64,0,12,86,'normal'),note('p-accent',67,0,12,118,'accented'),note('p-overlap',72,8,12,96,'normal')]),
  track('reference-acoustic-a','Guitarra acústica','acoustic-guitar',acoustic,[{id:'acoustic-down',noteIds:['a-low','a-mid','a-high'],direction:'down',durationMs:140,intensity:96}]),
  track('reference-electric-a','Guitarra elétrica','electric-guitar',[note('e-pick',52,16,8,96,'downstroke'),note('e-up',59,20,8,82,'upstroke'),note('e-mute',64,28,4,112,'mute')]),
  track('reference-bass-a','Baixo','electric-bass',[note('b-finger',40,0,8,78,'finger'),note('b-pick',43,16,6,96,'pick'),note('b-slap',45,32,4,120,'slap'),note('b-mute',47,48,4,88,'mute')]),
  track('reference-synth-a','Sintetizador','classic',[note('s-soft',60,32,12,54,'soft'),note('s-normal',67,36,12,88,'normal'),note('s-accent',72,40,8,118,'accented')]),
 ]};
}

function chorus():SongBlock{
 const electric=[note('eg-low',52,0,8,106,'pick'),note('eg-mid',59,0,8,102,'pick'),note('eg-high',64,0,8,98,'pick')];
 return{id:'reference-chorus',name:'Referência B — conjunto',steps:64,drums:drums(),tracks:[
  track('reference-piano-b','Piano','grand-piano',[note('pc1',60,0,16,92,'normal'),note('pc2',64,0,16,104,'accented'),note('pc3',67,0,16,110,'accented')]),
  track('reference-acoustic-b','Guitarra acústica','acoustic-guitar',[note('af1',57,16,6,76,'finger'),note('af2',64,20,6,82,'finger'),note('af3',69,24,6,88,'pick')]),
  track('reference-electric-b','Guitarra elétrica','electric-guitar',electric,[{id:'electric-up',noteIds:['eg-low','eg-mid','eg-high'],direction:'up',durationMs:110,intensity:108}]),
  track('reference-bass-b','Baixo','electric-bass',[note('bc1',36,0,8,92,'finger'),note('bc2',43,16,8,108,'pick'),note('bc3',40,32,4,122,'slap')]),
  track('reference-synth-b','Sintetizador','classic',[note('sc1',48,0,32,62,'soft'),note('sc2',55,8,32,92,'normal'),note('sc3',67,16,24,116,'accented')]),
 ]};
}

/** Regression fixture for the complete expressive instrument stack. */
export function phase4ReferenceSong():SongProject{
 const blocks=[verse(),chorus()];return{version:2,bpm:104,loop:true,key:0,scale:'minor',restrictToScale:false,blocks,order:blocks.map(block=>block.id)};
}
