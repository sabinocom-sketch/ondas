import {describe,it,expect} from 'vitest';
import {migrateMultitrackProject,validMultitrackProject} from '../src/audio/multitrack-project';

describe('projeto multipistas persistente',()=>{
 const track={id:'a',name:'Piano',audio:new Blob(['wav'],{type:'audio/wav'}),volume:1,pan:0,muted:false,solo:false,offset:.25};
 it('aceita qualquer quantidade de pistas válida',()=>{expect(validMultitrackProject({version:1,tracks:Array.from({length:24},(_,i)=>({...track,id:String(i)})),viewSeconds:60,snap:true,updatedAt:1})).toBe(true)});
 it('mantém referências opcionais à origem no piano roll',()=>{expect(validMultitrackProject({version:1,tracks:[{...track,source:{blockId:'bloco',trackId:'pista'}}],viewSeconds:60,snap:true,updatedAt:1})).toBe(true);expect(validMultitrackProject({version:1,tracks:[{...track,source:{blockId:1,trackId:'pista'}}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false)});
 it('rejeita metadados ou áudio inválidos',()=>{expect(validMultitrackProject({version:1,tracks:[{...track,audio:'não é áudio'}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false);expect(validMultitrackProject({version:1,tracks:[{...track,pan:2}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false)});
 it('migra deterministicamente pistas antigas para clips em ticks',()=>{const old={version:1 as const,tracks:[track],viewSeconds:60,snap:true,updatedAt:1},first=migrateMultitrackProject(old,{a:8})!,second=migrateMultitrackProject(first)!;expect(first).toMatchObject({version:2,bpm:60,viewTicks:240,snapDivision:1});expect(first.tracks[0].clip).toMatchObject({id:'a',laneId:'a',startTick:1,durationTicks:32,contentOffsetTicks:0,contentLengthTicks:32});expect(second).toEqual(first)});
 it('preserva projetos v2 com clips, referências musicais e velocity',()=>{const migrated=migrateMultitrackProject({version:1,tracks:[{...track,source:{blockId:'b',trackId:'t'}}],viewSeconds:30,snap:false,updatedAt:1},{a:4})!;expect(validMultitrackProject(migrated)).toBe(true);expect(migrated.tracks[0].source).toEqual({blockId:'b',trackId:'t'});expect(migrated.snapDivision).toBe(0)});
});
