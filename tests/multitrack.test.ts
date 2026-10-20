import {describe,it,expect} from 'vitest';
import {trackGain,trackEnd,bufferWav,normalizeBuffer} from '../src/audio/multitrack';
describe('mistura multipistas',()=>{
 it('respeita mute, solo e volume sem modificar as pistas',()=>{
  const a={volume:.3,muted:false,solo:false},b={volume:1.2,muted:false,solo:true};
  expect(trackGain(a,[a,b])).toBe(0);expect(trackGain(b,[a,b])).toBe(1.2);expect(trackGain({...b,muted:true},[a,b])).toBe(0);expect(trackGain(a,[a])).toBe(.3);
 });
 it('inclui o deslocamento da última pista na duração',()=>{expect(trackEnd([])).toBe(0);expect(trackEnd([{offset:5,buffer:{duration:2} as AudioBuffer},{offset:0,buffer:{duration:4} as AudioBuffer}])).toBe(7)});
 it('duplica áudio mono para um WAV estéreo',async()=>{const blob=bufferWav({length:2,numberOfChannels:1,sampleRate:44100,getChannelData:()=>new Float32Array([.5,-.5])} as unknown as AudioBuffer);const view=new DataView(await blob.arrayBuffer());expect(view.getUint32(40,true)).toBe(8);expect(view.getInt16(44,true)).toBe(view.getInt16(46,true));expect(view.getInt16(48,true)).toBe(view.getInt16(50,true))});
});

describe('normalização de exportação',()=>{
 it('preserva o equilíbrio estéreo e coloca o pico a -1 dBFS',()=>{
  const channels=[new Float32Array([.1,-.2]),new Float32Array([.4,-.1])];
  normalizeBuffer({numberOfChannels:2,getChannelData:(ch:number)=>channels[ch]} as AudioBuffer);
  expect(channels[1][0]).toBeCloseTo(Math.pow(10,-1/20),6);
  expect(channels[0][1]/channels[1][0]).toBeCloseTo(-.5,6);
 });
 it('mantém silêncio sem produzir valores inválidos',()=>{
  const data=new Float32Array(4);normalizeBuffer({numberOfChannels:1,getChannelData:()=>data} as unknown as AudioBuffer);
  expect([...data]).toEqual([0,0,0,0]);
 });
});
