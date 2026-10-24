import {validSong,type SongProject} from '../music/song';
export type StoredAudioTrack={
 id:string;name:string;audio:Blob;volume:number;pan:number;muted:boolean;solo:boolean;offset:number;source?:{blockId:string;trackId:string;project?:SongProject}
};
export type MultitrackProject={version:1;tracks:StoredAudioTrack[];viewSeconds:number;snap:boolean;updatedAt:number};

const DB='ondas.multitrack.v1',STORE='projects',CURRENT='current';
const request=<T>(value:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{value.onsuccess=()=>resolve(value.result);value.onerror=()=>reject(value.error)});
const database=()=>new Promise<IDBDatabase>((resolve,reject)=>{const open=indexedDB.open(DB,1);open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(STORE))open.result.createObjectStore(STORE)};open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error)});

export function validStoredTrack(value:unknown):value is StoredAudioTrack{
 if(!value||typeof value!=='object')return false;const t=value as StoredAudioTrack;
 return typeof t.id==='string'&&typeof t.name==='string'&&t.audio instanceof Blob&&Number.isFinite(t.volume)&&t.volume>=0&&t.volume<=1.5&&Number.isFinite(t.pan)&&t.pan>=-1&&t.pan<=1&&typeof t.muted==='boolean'&&typeof t.solo==='boolean'&&Number.isFinite(t.offset)&&t.offset>=0&&t.offset<=120&&(t.source===undefined||Boolean(t.source&&typeof t.source.blockId==='string'&&typeof t.source.trackId==='string'&&(t.source.project===undefined||validSong(t.source.project))));
}
export function validMultitrackProject(value:unknown):value is MultitrackProject{
 if(!value||typeof value!=='object')return false;const p=value as MultitrackProject;
 return p.version===1&&Array.isArray(p.tracks)&&p.tracks.every(validStoredTrack)&&[30,60,120].includes(p.viewSeconds)&&typeof p.snap==='boolean'&&Number.isFinite(p.updatedAt);
}
export async function loadMultitrackProject(){const db=await database();try{return await request(db.transaction(STORE).objectStore(STORE).get(CURRENT))}finally{db.close()}}
export async function storeMultitrackProject(project:MultitrackProject){const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,CURRENT);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
