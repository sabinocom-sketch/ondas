export const DRUMS=[{id:'kick',name:'Bombo'},{id:'snare',name:'Caixa'},{id:'closedHat',name:'Chimbal fechado'},{id:'openHat',name:'Chimbal aberto'},{id:'clap',name:'Palmas'},{id:'tom',name:'Tom grave'},{id:'conga',name:'Conga'},{id:'shaker',name:'Shaker'}] as const;
export type DrumId=typeof DRUMS[number]['id'];
export interface DrumTrack{id:DrumId;steps:number[];volume:number;muted:boolean}
export interface DrumPattern{tracks:DrumTrack[]}
export const emptyDrums=(steps=64):DrumPattern=>({tracks:DRUMS.map(d=>({id:d.id,steps:Array(steps).fill(0),volume:.8,muted:false}))});
export function validDrums(value:unknown):value is DrumPattern{if(!value||typeof value!=='object')return false;const p=value as DrumPattern,length=p.tracks?.[0]?.steps?.length;return Number.isInteger(length)&&length>=64&&length%16===0&&length<=1048576&&Array.isArray(p.tracks)&&p.tracks.length===DRUMS.length&&new Set(p.tracks.map(t=>t?.id)).size===DRUMS.length&&p.tracks.every(t=>t&&DRUMS.some(d=>d.id===t.id)&&typeof t.muted==='boolean'&&Number.isFinite(t.volume)&&t.volume>=0&&t.volume<=1&&Array.isArray(t.steps)&&t.steps.length===length&&t.steps.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1))}
export function rhythmPreset(style:'rock'|'house'|'latin',length=64):DrumPattern{
 const p=emptyDrums(length);const put=(id:DrumId,steps:number[],v=.65)=>{const track=p.tracks.find(t=>t.id===id)!;for(let bar=0;bar<length/16;bar++)for(const step of steps)track.steps[bar*16+step]=v};
 if(style==='rock'){put('kick',[0,8,10],1);put('snare',[4,12],1);put('closedHat',[0,2,4,6,8,10,12,14]);put('openHat',[15],.5)}
 if(style==='house'){put('kick',[0,4,8,12],1);put('clap',[4,12],.85);put('closedHat',[0,4,8,12],.4);put('openHat',[2,6,10,14],.7);put('shaker',[1,3,5,7,9,11,13,15],.45)}
 if(style==='latin'){put('kick',[0,6,8,14],.8);put('conga',[0,3,6,10,12,15],.8);put('tom',[7,14],.55);put('shaker',[0,2,4,6,8,10,12,14],.6);put('clap',[4,12],.45)}
 return p;
}
