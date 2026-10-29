export type SampleInstrumentId='grand-piano'|'acoustic-guitar'|'electric-guitar'|'electric-bass';
export type SampleInstrument={id:SampleInstrumentId;name:string;folder:string;roots:string[]};
const CDN='https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/';
export const sampleLibrary:SampleInstrument[]=[
 {id:'grand-piano',name:'Piano de cauda real',folder:'piano',roots:['C2','A2','C3','A3','C4','A4','C5','A5','C6']},
 {id:'acoustic-guitar',name:'Guitarra acústica real',folder:'guitar-acoustic',roots:['D2','A2','D3','A3','D4','A4','C5']},
 {id:'electric-guitar',name:'Guitarra elétrica real',folder:'guitar-electric',roots:['Cs2','A2','Ds3','A3','Ds4','A4','Ds5','A5','C6']},
 {id:'electric-bass',name:'Baixo elétrico real',folder:'bass-electric',roots:['E1','E2','E3','E4']}
];
const names:Record<string,number>={C:0,Cs:1,D:2,Ds:3,E:4,F:5,Fs:6,G:7,Gs:8,A:9,As:10,B:11};
export const noteMidi=(name:string)=>{const match=/^([A-G]s?)(\d)$/.exec(name);if(!match)throw new Error('Nota de sample inválida');return(Number(match[2])+1)*12+names[match[1]]};

async function sampleResponse(url:string){
 if(!('caches'in globalThis))return fetch(url);
 const cache=await caches.open('ondas-instrumentos-v1'),stored=await cache.match(url);if(stored)return stored;
 const response=await fetch(url,{mode:'cors'});if(response.ok)await cache.put(url,response.clone());return response;
}

export type SampleArticulation={gain?:number;attack?:number;brightness?:number;release?:number};
type SampleVoice={id:string;source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;released:boolean;started:number;release:number;dispose:()=>void};
export class SamplePlayer{
 private buffers:{note:number;buffer:AudioBuffer}[]=[];private voices=new Map<string,SampleVoice>();private retiring=new Set<SampleVoice>();private sustain=false;private loadEpoch=0;instrument?:SampleInstrumentId;
 constructor(private ctx:BaseAudioContext,private destination:AudioNode,readonly limit=16){}
 get voiceCount(){return this.voices.size}
 get loaded(){return this.buffers.length>0}
 async load(id:SampleInstrumentId){
  const ticket=++this.loadEpoch,instrument=sampleLibrary.find(item=>item.id===id);if(!instrument)throw new Error('Instrumento desconhecido');
  const decoded=await Promise.all(instrument.roots.map(async root=>{const url=`${CDN}${instrument.folder}/${root}.mp3`,response=await sampleResponse(url);if(!response.ok)throw new Error(`Não foi possível descarregar ${instrument.name}`);return{note:noteMidi(root),buffer:await this.ctx.decodeAudioData(await response.arrayBuffer())}}));
  if(ticket!==this.loadEpoch)return;this.panic();this.buffers=decoded;this.instrument=id;
 }
 noteOn(id:string,note:number,articulation:SampleArticulation={},at=this.ctx.currentTime){if(!this.buffers.length)return;this.release(id,.012);if(this.voices.size>=this.limit){const all=[...this.voices.values()],oldest=all.find(v=>v.released)||all[0];this.release(oldest.id,.015)}const sample=this.buffers.reduce((best,item)=>Math.abs(item.note-note)<Math.abs(best.note-note)?item:best),source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),level=articulation.gain??.82,attack=articulation.attack??.009,start=Math.max(this.ctx.currentTime,at);source.buffer=sample.buffer;source.playbackRate.value=Math.pow(2,(note-sample.note)/12);filter.type='lowpass';filter.frequency.value=articulation.brightness??18000;filter.Q.value=.45;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+attack);source.connect(filter).connect(gain).connect(this.destination);let disposed=false;const voice:SampleVoice={id,source,gain,filter,released:false,started:start,release:Math.max(.01,Math.min(8,articulation.release??.12)),dispose:()=>{if(disposed)return;disposed=true;if(this.voices.get(id)===voice)this.voices.delete(id);this.retiring.delete(voice);source.onended=null;try{source.stop()}catch{}source.disconnect();filter.disconnect();gain.disconnect();source.buffer=null}};this.voices.set(id,voice);source.onended=voice.dispose;source.start(start)}
 noteOff(id:string,at=this.ctx.currentTime){const voice=this.voices.get(id);if(!voice)return;if(this.sustain&&at<=this.ctx.currentTime)voice.released=true;else this.release(id,voice.release,at)}
 setSustain(value:boolean){this.sustain=value;if(!value)for(const [id,voice]of this.voices)if(voice.released)this.release(id,voice.release)}
 private release(id:string,time=.12,at=this.ctx.currentTime){const voice=this.voices.get(id);if(!voice)return;this.voices.delete(id);if(this.retiring.size>=this.limit)this.retiring.values().next().value?.dispose();this.retiring.add(voice);voice.released=true;const now=Math.max(voice.started,at);voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(.0001,now,Math.max(.005,time/4));try{voice.source.stop(now+time)}catch{/* A amostra já terminou. */}}
 stopPrefix(prefix:string){for(const id of[...this.voices.keys()])if(id.startsWith(prefix))this.release(id,.015);for(const voice of[...this.retiring])if(voice.id.startsWith(prefix))voice.dispose()}
 panic(){for(const voice of[...this.voices.values(),...this.retiring])voice.dispose();this.voices.clear();this.retiring.clear();this.sustain=false}
 dispose(){this.loadEpoch++;this.panic();this.buffers=[];this.instrument=undefined}
}
