import {describe,it,expect} from 'vitest';
import {noteMidi,sampleLibrary} from '../src/audio/sampler';

describe('instrumentos reais leves',()=>{
 it('converte nomes de samples para notas MIDI',()=>{expect(noteMidi('C4')).toBe(60);expect(noteMidi('Cs2')).toBe(37);expect(noteMidi('A5')).toBe(81)});
 it('oferece piano, guitarras e baixo com poucos samples',()=>{expect(sampleLibrary.map(i=>i.id)).toEqual(['grand-piano','acoustic-guitar','electric-guitar','electric-bass']);expect(sampleLibrary.every(i=>i.roots.length<=9)).toBe(true)});
});
