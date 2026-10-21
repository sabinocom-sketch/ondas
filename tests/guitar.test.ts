import {describe,expect,it} from 'vitest';
import {chordNotes,guitarChords,guitarOpenNotes,guitarTuning,midiNoteName,pickingDelay} from '../src/music/guitar';
import {bassOpenNotes,bassStringNames,bassStyleSettings,bassTuning} from '../src/music/bass';

describe('guitar helpers',()=>{
 it('maps standard tuning and frets to MIDI notes',()=>{expect(guitarTuning).toEqual([40,45,50,55,59,64]);expect(chordNotes('Em').map(n=>n.note)).toEqual([40,47,52,55,59,64])});
 it('omits muted strings and reverses an upstroke',()=>{const down=chordNotes('D');expect(down.map(n=>n.string)).toEqual([2,3,4,5]);expect(chordNotes('D','up')).toEqual([...down].reverse())});
 it('defines valid six-string chord shapes',()=>{Object.values(guitarChords).forEach(shape=>expect(shape).toHaveLength(6))});
 it('uses distinct picking timings',()=>{expect(pickingDelay('rasgueado')).toBeLessThan(pickingDelay('pick'));expect(pickingDelay('finger')).toBeGreaterThan(pickingDelay('pick'))});
 it('identifies every guitar string by its open note',()=>{expect(guitarOpenNotes).toEqual(['Mi2','Lá2','Ré3','Sol3','Si3','Mi4']);expect(midiNoteName(66)).toBe('Fá♯4')});
 it('defines a four-string electric bass and four articulations',()=>{expect(bassTuning).toEqual([28,33,38,43]);expect(bassStringNames).toEqual(['Mi','Lá','Ré','Sol']);expect(bassOpenNotes).toEqual(['Mi1','Lá1','Ré2','Sol2']);expect(Object.keys(bassStyleSettings)).toEqual(['finger','pick','slap','mute']);expect(bassStyleSettings.mute.duration).toBeLessThan(bassStyleSettings.finger.duration)});
});
