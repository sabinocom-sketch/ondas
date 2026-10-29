import {describe,it,expect} from 'vitest';
import {MusicalTransport} from '../src/music/transport';

describe('Relógio musical comum',()=>{
 it('converte ticks e segundos sem acumular temporizadores',()=>{const clock={currentTime:10,state:'running'},t=new MusicalTransport(clock,120);expect(t.secondsPerTick).toBe(.125);expect(t.ticksToSeconds(16)).toBe(2);expect(t.secondsToTicks(2)).toBe(16);t.play(8,.05);clock.currentTime=10.55;expect(t.position()).toBeCloseTo(12)});
 it('pausa, procura e retoma preservando a posição musical',()=>{const clock={currentTime:0,state:'running'},t=new MusicalTransport(clock,120);t.play(0,0);clock.currentTime=1;expect(t.pause()).toBe(8);clock.currentTime=4;expect(t.position()).toBe(8);t.seek(20);t.resume(0);clock.currentTime=4.5;expect(t.position()).toBe(24);t.stop();expect(t.position()).toBe(0)});
 it('muda o BPM sem saltar a posição e invalida gerações antigas',()=>{const clock={currentTime:0,state:'running'},t=new MusicalTransport(clock,120),first=t.generation;t.play(0,0);clock.currentTime=.5;expect(t.position()).toBe(4);t.setBpm(60,0);expect(t.position()).toBe(4);clock.currentTime=1;expect(t.position()).toBe(6);expect(t.generation).toBeGreaterThan(first)});
});
