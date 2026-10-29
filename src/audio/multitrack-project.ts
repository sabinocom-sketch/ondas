import {validSong,type SongProject} from '../music/song';
import {secondsToTicks,validClipWindow,type ClipWindow,type SnapDivision} from './arrangement-clips';
export type StoredAudioTrack={
 id:string;name:string;audio:Blob;volume:number;pan:number;muted:boolean;solo:boolean;offset:number;clip?:ClipWindow;source?:{blockId:string;trackId:string;project?:SongProject}
};
export type MultitrackProjectV1={version:1;tracks:StoredAudioTrack[];viewSeconds:number;snap:boolean;updatedAt:number};
export type MultitrackProject={version:2;bpm:number;tracks:StoredAudioTrack[];viewTicks:number;snapDivision:SnapDivision|0;updatedAt:number};

const DB='ondas.multitrack.v1',STORE='projects',CURRENT='current';
const request=<T>(value:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error)});
const database=()=>new Promise<IDBDatabase>((resolve,reject)=>{const open=indexedDB.open(DB,1);open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(STORE))open.result.createObjectStore(STORE)};open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error)});

export function validStoredTrack(value:unknown):value is StoredAudioTrack{
 if(!value||typeof value!=='object')return false;const t=value as StoredAudioTrack;
 return typeof t.id==='string'&&typeof t.name==='string'&&t.audio instanceof Blob&&Number.isFinite(t.volume)&&t.volume>=0&&t.volume<=1.5&&Number.isFinite(t.pan)&&t.pan>=-1&&t.pan<=1&&typeof t.muted==='boolean'&&typeof t.solo==='boolean'&&Number.isFinite(t.offset)&&t.offset>=0&&t.offset<=720&&(t.clip===undefined||validClipWindow(t.clip))&&(t.source===undefined||Boolean(t.source&&typeof t.source.blockId==='string'&&typeof t.source.trackId==='string'&&(t.source.project===undefined||validSong(t.source.project))));
}
export function validMultitrackProject(value:unknown):value is MultitrackProject|MultitrackProjectV1{
 if(!value||typeof value!=='object')return false;const p=value as Record<string,unknown>;
 const tracks=p.tracks as unknown[]|undefined,common=Array.isArray(tracks)&&tracks.every(validStoredTrack)&&Number.isFinite(p.updatedAt);return common&&(p.version===1&&[30,60,120].includes(p.viewSeconds as number)&&typeof p.snap==='boolean'||p.version===2&&Number.isInteger(p.bpm)&&Number(p.bpm)>=40&&Number(p.bpm)<=240&&Number.isInteger(p.viewTicks)&&Number(p.viewTicks)>=16&&Number(p.viewTicks)<=4096&&[0,1,2,4,8,16].includes(p.snapDivision as number));
}
export function migrateMultitrackProject(value:unknown,durations:Record<string,number>={}):MultitrackProject|null{
 if(!validMultitrackProject(value))return null;if(value.version===2)return structuredClone(value);
 const bpm=60;return{version:2,bpm,viewTicks:secondsToTicks(value.viewSeconds,bpm),snapDivision:value.snap?1:0,updatedAt:value.updatedAt,tracks:value.tracks.map(track=>{const contentLengthTicks=Math.max(1,secondsToTicks(durations[track.id]??120,bpm));return{...track,clip:{id:track.id,laneId:track.id,startTick:secondsToTicks(track.offset,bpm),durationTicks:contentLengthTicks,contentOffsetTicks:0,contentLengthTicks}}})};
}
export async function loadMultitrackProject(){const db=await database();try{return await request(db.transaction(STORE).objectStore(STORE).get(CURRENT))}finally{db.close()}}
export async function storeMultitrackProject(project:MultitrackProject){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,CURRENT);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
