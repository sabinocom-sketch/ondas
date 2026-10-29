export type NoteArticulation='normal'|'soft'|'accented'|'finger'|'pick'|'upstroke'|'downstroke'|'mute'|'slap';
export type ExpressivenessMode='legacy'|'expressive';
export type ExpressiveInput={instrument:string;velocity?:number;durationSeconds?:number;articulation?:NoteArticulation;level?:number;mode?:ExpressivenessMode};
export type ExpressiveParameters={family:'piano'|'guitar'|'bass'|'synth';articulation:NoteArticulation;gain:number;attack?:number;attackScale?:number;brightness?:number;release?:number;filterScale:number;envelopeScale:number;mode:ExpressivenessMode};

const families={
 piano:new Set(['grand-piano','piano','electric-piano','harpsichord']),
 guitar:new Set(['acoustic-guitar','electric-guitar','guitar']),
 bass:new Set(['electric-bass','bass'])
};
const supported={
 piano:new Set<NoteArticulation>(['normal','soft','accented']),
 guitar:new Set<NoteArticulation>(['normal','finger','pick','upstroke','downstroke','mute']),
 bass:new Set<NoteArticulation>(['normal','finger','pick','slap','mute']),
 synth:new Set<NoteArticulation>(['normal','soft','accented'])
};
const finite=(value:number|undefined,fallback:number)=>Number.isFinite(value)?Number(value):fallback;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export const instrumentFamily=(instrument:string):ExpressiveParameters['family']=>families.piano.has(instrument)?'piano':families.guitar.has(instrument)?'guitar':families.bass.has(instrument)?'bass':'synth';
export const supportedArticulations=(instrument:string)=>[...supported[instrumentFamily(instrument)]];
export const validArticulation=(instrument:string,value:unknown):value is NoteArticulation=>typeof value==='string'&&supported[instrumentFamily(instrument)].has(value as NoteArticulation);
export function applyExpressivenessToPatch(patch:Patch,params:ExpressiveParameters){patch.osc.forEach(oscillator=>oscillator.volume*=params.gain);patch.filter.cutoff=Math.min(18000,Math.max(40,patch.filter.cutoff*params.filterScale));patch.filter.amount=Math.min(12000,Math.max(0,patch.filter.amount*params.envelopeScale));if(params.attack!==undefined)patch.amp.attack=params.attack;if(params.attackScale!==undefined)patch.amp.attack=Math.min(5,Math.max(.001,patch.amp.attack*params.attackScale));if(params.release!==undefined)patch.amp.release=params.release;return patch}
export const expressiveSampleParameters=(params:ExpressiveParameters,baseGain=.82)=>({gain:baseGain*params.gain,attack:params.attack,brightness:params.brightness,release:params.release});

/** Pure, deterministic translation from musical intent to bounded audio controls.
 * Legacy mode is deliberately neutral: callers keep their existing velocity path. */
export function expressiveness(input:ExpressiveInput):ExpressiveParameters{
 const family=instrumentFamily(input.instrument),requested=input.articulation??'normal',articulation=validArticulation(input.instrument,requested)?requested:'normal',mode=input.mode??(input.articulation?'expressive':'legacy'),level=clamp(finite(input.level,1),0,1.5);
 if(mode==='legacy')return{family,articulation:'normal',gain:level,filterScale:1,envelopeScale:1,mode};
 const velocity=clamp(Math.round(finite(input.velocity,100)),1,127),ratio=velocity/100,duration=clamp(finite(input.durationSeconds,.5),.01,30);
 const exponent={piano:1.35,guitar:1.08,bass:.92,synth:1}[family],velocityGain=Math.pow(ratio,exponent);
 let articulationGain=1,attack:number|undefined,attackScale:number|undefined,brightness:number|undefined,release:number|undefined,filterScale=1,envelopeScale=1;
 if(family==='piano'){
  brightness=clamp(8200+9800*Math.pow(velocity/127,1.25),2500,18000);attack=velocity<55?.016:.006;release=clamp(.18+duration*.08,.18,.65);filterScale=clamp(.72+velocity/127*.42,.72,1.14);
  if(articulation==='soft'){articulationGain=.82;attack=.022;brightness*=.72;release*=1.12}if(articulation==='accented'){articulationGain=1.06;attack=.003;brightness=Math.min(18000,brightness*1.08);release*=.82}
 }else if(family==='guitar'){
  brightness=clamp(5200+velocity/127*9800,1800,16000);attack=.008;release=clamp(duration*.3,.09,.48);filterScale=clamp(.76+velocity/127*.38,.76,1.14);
  if(input.instrument==='electric-guitar'){brightness=Math.min(17000,brightness*1.06);release=clamp(duration*.42,.14,.78);filterScale=Math.min(1.2,filterScale*1.04)}
  if(articulation==='finger'){articulationGain=.9;attack=.016;brightness*=.72;release*=1.18}if(articulation==='pick'||articulation==='downstroke'){articulationGain=1.02;attack=.004;brightness*=1.05}if(articulation==='upstroke'){articulationGain=.96;attack=.006;brightness*=.94}if(articulation==='mute'){articulationGain=.72;attack=.005;brightness=Math.min(brightness,2600);release=.075;filterScale=.58}
 }else if(family==='bass'){
  brightness=clamp(3000+velocity/127*8500,1600,14500);attack=.014;release=clamp(duration*.34,.08,.55);filterScale=clamp(.78+velocity/127*.32,.78,1.1);
  if(articulation==='finger'){articulationGain=.92;attack=.018;brightness*=.72}if(articulation==='pick'){articulationGain=1.02;attack=.005;brightness*=1.08}if(articulation==='slap'){articulationGain=1.1;attack=.002;brightness=Math.min(16000,brightness*1.3);release=.1;filterScale=1.18}if(articulation==='mute'){articulationGain=.75;attack=.007;brightness=Math.min(brightness,2300);release=.065;filterScale=.55}
 }else{
  filterScale=clamp(.68+velocity/127*.46,.68,1.14);envelopeScale=clamp(.72+velocity/127*.4,.72,1.12);attackScale=clamp(1.28-velocity/127*.43,.85,1.28);
  if(articulation==='soft'){articulationGain=.82;filterScale*=.78;envelopeScale=.82;attackScale*=1.35}if(articulation==='accented'){articulationGain=1.06;filterScale*=1.08;envelopeScale=1.1;attackScale*=.55}
 }
 return{family,articulation,gain:clamp(level*velocityGain*articulationGain,0,1.2),attack:attack===undefined?undefined:clamp(attack,.001,5),attackScale:attackScale===undefined?undefined:clamp(attackScale,.25,2),brightness:brightness===undefined?undefined:clamp(brightness,40,18000),release:release===undefined?undefined:clamp(release,.01,8),filterScale:clamp(filterScale,.4,1.4),envelopeScale:clamp(envelopeScale,.4,1.4),mode};
}
import type {Patch} from './parameters';
