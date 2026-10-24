import {describe,it,expect} from 'vitest';
import {validMultitrackProject} from '../src/audio/multitrack-project';

describe('projeto multipistas persistente',()=>{
 const track={id:'a',name:'Piano',audio:new Blob(['wav'],{type:'audio/wav'}),volume:1,pan:0,muted:false,solo:false,offset:.25};
 it('aceita qualquer quantidade de pistas válida',()=>{expect(validMultitrackProject({version:1,tracks:Array.from({length:24},(_,i)=>({...track,id:String(i)})),viewSeconds:60,snap:true,updatedAt:1})).toBe(true)});
 it('mantém referências opcionais à origem no piano roll',()=>{expect(validMultitrackProject({version:1,tracks:[{...track,source:{blockId:'bloco',trackId:'pista'}}],viewSeconds:60,snap:true,updatedAt:1})).toBe(true);expect(validMultitrackProject({version:1,tracks:[{...track,source:{blockId:1,trackId:'pista'}}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false)});
 it('rejeita metadados ou áudio inválidos',()=>{expect(validMultitrackProject({version:1,tracks:[{...track,audio:'não é áudio'}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false);expect(validMultitrackProject({version:1,tracks:[{...track,pan:2}],viewSeconds:60,snap:true,updatedAt:1})).toBe(false)});
});
