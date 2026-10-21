import {describe,it,expect,vi} from 'vitest';
import {emptyComposition} from '../src/music/composition';
import {SongPlayer,diatonicChord,duplicateBlock,emptySong,inScale,loadSong,migrateComposition,newBlock,newTrack,nearestScaleNote,storeSong,validSong,type SongProject} from '../src/music/song';

const note=(id:string,note=60,start=0,length=4)=>({id,note,start,length});
function project():SongProject{
 const song=emptySong(),block=song.blocks[0];
 block.tracks=[{...newTrack('Piano','piano'),id:'piano-track',notes:[note('c4')]},{...newTrack('Guitarra','electric-guitar'),id:'guitar-track',volume:.6,notes:[note('e4',64)]}];
 return {...song,bpm:120,loop:false,blocks:[block],order:[block.id]};
}
function fake(){return {context:{currentTime:0,state:'running'},prepareSequence:vi.fn(async()=>{}),sequenceNote:vi.fn(),drumHit:vi.fn(),stopSequence:vi.fn(),listeners:new Set<()=>void>(),panicListeners:new Set<()=>void>()}}

describe('Projeto multipistas',()=>{
 it('migra a composição v1 sem perder notas, bateria, BPM ou ciclo',()=>{const legacy={...emptyComposition(),bpm:96,loop:false,notes:[note('legacy',67,8,2)]};const next=migrateComposition(legacy)!;expect(next.version).toBe(2);expect(next.bpm).toBe(96);expect(next.loop).toBe(false);expect(next.blocks[0].tracks[0].notes).toEqual(legacy.notes);expect(validSong(next)).toBe(true)});
 it('guarda, lê e ignora dados corrompidos',()=>{let value:string|null=null;const storage={getItem:(key:string)=>key==='ondas.song.v2'?value:null,setItem:(_key:string,next:string)=>value=next} as Storage;const original=project();storeSong(original,storage);expect(loadSong(storage)).toEqual(original);value='{inválido';expect(validSong(loadSong(storage))).toBe(true)});
 it('duplica um bloco de forma independente e insere-o na ordem',()=>{const original=project(),source=original.blocks[0],next=duplicateBlock(original,source.id),copy=next.blocks[1];expect(next.order).toEqual([source.id,copy.id]);expect(copy.id).not.toBe(source.id);expect(copy.tracks[0].id).not.toBe(source.tracks[0].id);copy.tracks[0].notes[0].note=72;expect(source.tracks[0].notes[0].note).toBe(60)});
 it('valida instrumentos e limites do formato v2',()=>{const p=project();expect(validSong(p)).toBe(true);expect(validSong({...p,blocks:[{...p.blocks[0],tracks:[{...p.blocks[0].tracks[0],instrument:'desconhecido'}]}]})).toBe(false);expect(migrateComposition({version:2})).toBeNull()});
});

describe('Ajuda harmónica',()=>{
 it('reconhece a escala, ajusta novas notas e cria tríades diatónicas',()=>{expect(inScale(60,0,'major')).toBe(true);expect(inScale(61,0,'major')).toBe(false);expect(nearestScaleNote(61,0,'major')).toBe(60);expect(diatonicChord(0,'major',0)).toEqual([60,64,67]);expect(diatonicChord(9,'minor',0)).toEqual([69,72,76])});
});

describe('Transporte multipistas',()=>{
 it('prepara e agenda instrumentos simultâneos com volume por pista',async()=>{vi.useFakeTimers();try{const e=fake(),changed=vi.fn(),player=new SongPlayer(e,changed),p=project();await player.start(p);expect(e.prepareSequence).toHaveBeenCalledWith(['piano','electric-guitar']);expect(e.sequenceNote).toHaveBeenCalledTimes(2);expect(e.sequenceNote.mock.calls.map(c=>c.slice(1))).toEqual([[60,.05,.55,'piano',.8],[64,.05,.55,'electric-guitar',.6]]);player.stop();expect(e.stopSequence).toHaveBeenCalled();player.dispose()}finally{vi.useRealTimers()}});
 it('respeita mute/solo e não duplica eventos na mesma janela',async()=>{vi.useFakeTimers();try{const e=fake(),player=new SongPlayer(e,()=>{}),p=project();p.blocks[0].tracks[1].solo=true;await player.start(p);expect(e.sequenceNote).toHaveBeenCalledTimes(1);expect(e.sequenceNote.mock.calls[0][4]).toBe('electric-guitar');player.tick();expect(e.sequenceNote).toHaveBeenCalledTimes(1);player.dispose()}finally{vi.useRealTimers()}});
 it('percorre blocos na ordem e termina no limite quando o ciclo está desligado',async()=>{vi.useFakeTimers();try{const e=fake(),player=new SongPlayer(e,()=>{}),p=project(),second=newBlock('Refrão');second.id='refrain';second.tracks=[{...newTrack('Baixo','electric-bass'),id:'bass',notes:[note('bass-note',48)]}];p.blocks.push(second);p.order=[second.id,p.blocks[0].id];await player.start(p);expect(e.sequenceNote.mock.calls[0][4]).toBe('electric-bass');e.context.currentTime=8.06;player.tick();expect(e.sequenceNote.mock.calls.some(c=>c[4]==='piano')).toBe(true);e.context.currentTime=16.1;player.tick();expect(player.running).toBe(false);player.dispose()}finally{vi.useRealTimers()}});
});
