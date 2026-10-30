import {describe,expect,it,vi} from 'vitest';
import {NoteAuditioner} from '../src/music/audition';

const note={id:'note',note:64,start:0,length:8,velocity:72,articulation:'soft' as const};
const track={instrument:'grand-piano',volume:.7};

describe('pré-escuta do piano roll',()=>{
 it('usa instrumento, altura, duração e velocity sem iniciar o transporte',async()=>{
  const engine={context:{currentTime:2},prepareSequence:vi.fn(async()=>{}),sequenceNote:vi.fn(),sequenceOff:vi.fn()},audition=new NoteAuditioner(engine);
  await audition.play(note,track,120);
  expect(engine.prepareSequence).toHaveBeenCalledWith(['grand-piano']);
  expect(engine.sequenceNote).toHaveBeenCalledWith('roll:audition:1',64,2.015,3.015,'grand-piano',.7,{instrument:'grand-piano',velocity:72,durationSeconds:1,articulation:'soft',level:.7,mode:'expressive'});
 });

 it('corta a voz anterior ao ouvir uma nova altura e cancela preparações obsoletas',async()=>{
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});
  const engine={context:{currentTime:0},prepareSequence:vi.fn().mockImplementationOnce(()=>pending).mockResolvedValue(undefined),sequenceNote:vi.fn(),sequenceOff:vi.fn()},audition=new NoteAuditioner(engine);
  const first=audition.play(note,track,120),second=audition.play({...note,note:67},track,120);release();
  expect(await first).toBe(false);expect(await second).toBe(true);expect(engine.sequenceNote).toHaveBeenCalledTimes(1);
  await audition.play({...note,note:69},track,120);
  expect(engine.sequenceOff).toHaveBeenCalledWith('roll:audition:2');
 });

 it('interrompe a nota ativa sem afetar o transporte principal',async()=>{
  const engine={context:{currentTime:0},prepareSequence:vi.fn(async()=>{}),sequenceNote:vi.fn(),sequenceOff:vi.fn()},audition=new NoteAuditioner(engine);
  await audition.play(note,track,120);audition.cancel();
  expect(engine.sequenceOff).toHaveBeenCalledWith('roll:audition:1');
 });
});
