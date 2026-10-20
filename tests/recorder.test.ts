import {describe,it,expect} from 'vitest';
import {encodeWav} from '../src/audio/recorder';
describe('WAV PCM estéreo',()=>{
 it('escreve o cabeçalho, taxa e amostras intercaladas com saturação',()=>{
  const wav=encodeWav([new Float32Array([-1,1,0,.5]),new Float32Array([-2,2,NaN,Infinity])],48000),v=new DataView(wav);
  expect(new TextDecoder().decode(wav.slice(0,4))).toBe('RIFF');expect(new TextDecoder().decode(wav.slice(8,12))).toBe('WAVE');
  expect(v.getUint32(4,true)).toBe(52);expect(v.getUint16(22,true)).toBe(2);expect(v.getUint32(24,true)).toBe(48000);expect(v.getUint32(28,true)).toBe(192000);expect(v.getUint16(32,true)).toBe(4);expect(v.getUint16(34,true)).toBe(16);expect(v.getUint32(40,true)).toBe(16);
  expect(Array.from({length:8},(_,i)=>v.getInt16(44+i*2,true))).toEqual([-32768,32767,0,16384,-32768,32767,0,0]);
 });
 it('permite um WAV vazio válido',()=>{const v=new DataView(encodeWav([],44100));expect(v.byteLength).toBe(44);expect(v.getUint32(40,true)).toBe(0)});
});

it('termina no limite e desliga apenas o ramo de gravação',async()=>{
 const {WavRecorder}=await import('../src/audio/recorder');
 const {vi}=await import('vitest');
 const processor={onaudioprocess:null as any,connect:vi.fn(),disconnect:vi.fn()};
 const silent={gain:{value:1},connect:vi.fn(),disconnect:vi.fn()};processor.connect.mockReturnValue(silent);
 const source={context:{sampleRate:2,createScriptProcessor:()=>processor,createGain:()=>silent,destination:{}},connect:vi.fn(),disconnect:vi.fn()};
 let blob:Blob|undefined;const capture=new WavRecorder(source as unknown as AudioNode,()=>{blob=capture.stop()});
 processor.onaudioprocess({inputBuffer:{getChannelData:(ch:number)=>new Float32Array(300).fill(ch?.25:.5)}});
 expect(capture.seconds).toBe(120);expect(blob?.size).toBe(44+240*4);expect(processor.onaudioprocess).toBeNull();expect(source.disconnect).toHaveBeenCalledWith(processor);expect(silent.gain.value).toBe(0);
 capture.dispose();expect(processor.disconnect).toHaveBeenCalledTimes(1);
});

