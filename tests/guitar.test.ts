import {describe,expect,it} from 'vitest';
import {chordNotes,guitarChords,guitarTuning,pickingDelay} from '../src/music/guitar';

describe('guitar helpers',()=>{
 it('maps standard tuning and frets to MIDI notes',()=>{expect(guitarTuning).toEqual([40,45,50,55,59,64]);expect(chordNotes('Em').map(n=>n.note)).toEqual([40,47,52,55,59,64])});
 it('omits muted strings and reverses an upstroke',()=>{const down=chordNotes('D');expect(down.map(n=>n.string)).toEqual([2,3,4,5]);expect(chordNotes('D','up')).toEqual([...down].reverse())});
 it('defines valid six-string chord shapes',()=>{Object.values(guitarChords).forEach(shape=>expect(shape).toHaveLength(6))});
 it('uses distinct picking timings',()=>{expect(pickingDelay('rasgueado')).toBeLessThan(pickingDelay('pick'));expect(pickingDelay('finger')).toBeGreaterThan(pickingDelay('pick'))});
});
