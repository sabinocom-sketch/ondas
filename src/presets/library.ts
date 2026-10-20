import {defaults,clonePatch,validPatch,type Patch} from '../audio/parameters';
export interface Preset {id:string;name:string;patch:Patch}
const make=(id:string,name:string,edit:(p:Patch)=>void):Preset=>{const patch=clonePatch(defaults);edit(patch);return{id,name,patch}};
export const library:Preset[]=[
make('classic','Synth clássico',()=>{}),
make('piano','Piano sintético',p=>{p.osc[0].wave='triangle';p.osc[1].wave='sine';p.osc[1].octave=1;p.amp={attack:.005,decay:1.2,sustain:.12,release:.3};p.filter.cutoff=3800}),
make('bass','Baixo',p=>{p.osc[0].wave='square';p.osc[0].octave=-1;p.osc[1].octave=-1;p.filter.cutoff=500;p.filter.amount=2200;p.amp={attack:.008,decay:.2,sustain:.65,release:.12};p.reverb.enabled=false}),
make('lead','Lead',p=>{p.osc[1].wave='sawtooth';p.osc[1].detune=12;p.filter.cutoff=6500;p.filter.resonance=3;p.delay.enabled=true}),
make('pad','Pad atmosférico',p=>{p.amp={attack:1.4,decay:1.5,sustain:.8,release:2.5};p.filter.cutoff=1600;p.chorus.enabled=true;p.reverb.mix=.6}),
make('organ','Órgão',p=>{p.osc[0].wave='sine';p.osc[1].wave='sine';p.osc[1].octave=1;p.osc.forEach(o=>o.detune=0);p.amp={attack:.01,decay:.01,sustain:1,release:.08};p.filter.amount=0;p.filter.cutoff=15000}),
make('bell','Bell',p=>{p.osc[0].wave='sine';p.osc[1].wave='triangle';p.osc[1].octave=2;p.mix=.25;p.amp={attack:.005,decay:1.8,sustain:.04,release:1.2};p.filter.cutoff=9000;p.reverb.mix=.4}),
make('electric-piano','Piano elétrico',p=>{p.osc[0].wave='sine';p.osc[1].wave='triangle';p.osc[1].octave=1;p.osc.forEach(o=>o.detune=0);p.mix=.18;p.amp={attack:.005,decay:1.6,sustain:.08,release:.55};p.filter.cutoff=3200;p.filter.amount=1800;p.chorus.enabled=true;p.chorus.mix=.2}),
make('harpsichord','Cravo',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='square';p.osc[1].octave=1;p.mix=.16;p.amp={attack:.005,decay:.65,sustain:0,release:.12};p.filter.cutoff=4800;p.filter.amount=4000;p.filter.envelope={attack:.005,decay:.25,sustain:0,release:.1};p.reverb.mix=.12}),
make('flute','Flauta',p=>{p.osc[0].wave='sine';p.osc[1].wave='triangle';p.osc.forEach(o=>o.detune=0);p.mix=.1;p.amp={attack:.09,decay:.2,sustain:.82,release:.22};p.filter.cutoff=2400;p.filter.amount=250;p.reverb.mix=.24}),
make('clarinet','Clarinete',p=>{p.osc[0].wave='square';p.osc[1].wave='sine';p.osc.forEach(o=>o.detune=0);p.mix=.45;p.amp={attack:.06,decay:.18,sustain:.76,release:.16};p.filter.cutoff=1500;p.filter.amount=900;p.filter.resonance=1.4}),
make('oboe','Oboé',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='square';p.osc.forEach(o=>o.detune=0);p.mix=.28;p.amp={attack:.055,decay:.15,sustain:.75,release:.19};p.filter.cutoff=1900;p.filter.amount=600;p.filter.resonance=3.6;p.reverb.mix=.2}),
make('trumpet','Trompete',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='square';p.mix=.22;p.osc.forEach(o=>o.detune=0);p.amp={attack:.045,decay:.2,sustain:.8,release:.14};p.filter.cutoff=1600;p.filter.amount=4800;p.filter.envelope={attack:.08,decay:.25,sustain:.45,release:.15};p.filter.resonance=1.8}),
make('horn','Trompa',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='triangle';p.mix=.65;p.amp={attack:.18,decay:.35,sustain:.8,release:.4};p.filter.cutoff=750;p.filter.amount=1400;p.filter.envelope={attack:.22,decay:.4,sustain:.5,release:.35};p.reverb.mix=.3}),
make('violin','Violino',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='sawtooth';p.osc[0].detune=-3;p.osc[1].detune=3;p.amp={attack:.18,decay:.3,sustain:.85,release:.45};p.filter.cutoff=3300;p.filter.amount=1100;p.filter.resonance=1.7;p.reverb.mix=.28}),
make('cello','Violoncelo',p=>{p.osc[0].wave='sawtooth';p.osc[1].wave='triangle';p.osc.forEach(o=>o.octave=-1);p.mix=.38;p.amp={attack:.25,decay:.45,sustain:.8,release:.65};p.filter.cutoff=1300;p.filter.amount=750;p.filter.resonance=2;p.reverb.mix=.26}),
make('guitar','Guitarra dedilhada',p=>{p.osc[0].wave='triangle';p.osc[1].wave='sawtooth';p.osc.forEach(o=>o.detune=0);p.mix=.16;p.amp={attack:.005,decay:.9,sustain:0,release:.22};p.filter.cutoff=1300;p.filter.amount=4600;p.filter.envelope={attack:.005,decay:.18,sustain:0,release:.15};p.reverb.mix=.14}),
make('harp','Harpa',p=>{p.osc[0].wave='triangle';p.osc[1].wave='sine';p.osc[1].octave=1;p.mix=.28;p.amp={attack:.009,decay:2.2,sustain:0,release:1.3};p.filter.cutoff=2800;p.filter.amount=2000;p.filter.envelope={attack:.005,decay:.6,sustain:0,release:.4};p.reverb.mix=.38}),
make('marimba','Marimba',p=>{p.osc[0].wave='sine';p.osc[1].wave='sine';p.osc[1].octave=2;p.osc.forEach(o=>o.detune=0);p.mix=.18;p.amp={attack:.005,decay:.42,sustain:0,release:.18};p.filter.cutoff=2200;p.filter.amount=1800;p.filter.envelope={attack:.005,decay:.12,sustain:0,release:.12};p.reverb.mix=.16}),
make('strings','Strings sintéticas',p=>{p.osc[1].wave='sawtooth';p.osc[1].detune=14;p.amp={attack:.4,decay:.6,sustain:.8,release:1.1};p.chorus.enabled=true;p.filter.cutoff=2600})
];
const KEY='ondas.presets.v1';
export function readPresets(storage:Storage=localStorage):Preset[]{try{const list=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(list)?list.filter((x:Preset)=>typeof x.id==='string'&&typeof x.name==='string'&&validPatch(x.patch)):[]}catch{return[]}}
export function writePresets(p:Preset[],storage:Storage=localStorage){storage.setItem(KEY,JSON.stringify(p))}
