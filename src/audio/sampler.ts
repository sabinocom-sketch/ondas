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

export type SampleArticulation={gain?:number;attack?:number;brightness?:number};
type SampleVoice={source:AudioBufferSourceNode;gain:GainNode;filter:BiquadFilterNode;released:boolean};
export class SamplePlayer{
 private buffers:{note:number;buffer:AudioBuffer}[]=[];private voices=new Map<string,SampleVoice>();private sustain=false;private loadEpoch=0;instrument?:SampleInstrumentId;
 constructor(private ctx:AudioContext,private destination:AudioNode){}
 get voiceCount(){return this.voices.size}
 async load(id:SampleInstrumentId){
  const ticket=++this.loadEpoch,instrument=sampleLibrary.find(item=>item.id===id);if(!instrument)throw new Error('Instrumento desconhecido');
  const decoded=await Promise.all(instrument.roots.map(async root=>{const url=`${CDN}${instrument.folder}/${root}.mp3`,response=await sampleResponse(url);if(!response.ok)throw new Error(`Não foi possível descarregar ${instrument.name}`);return{note:noteMidi(root),buffer:await this.ctx.decodeAudioData(await response.arrayBuffer())}}));
  if(ticket!==this.loadEpoch)return;this.panic();this.buffers=decoded;this.instrument=id;
 }
 noteOn(id:string,note:number,articulation:SampleArticulation={}){if(!this.buffers.length)return;this.release(id,.012);const sample=this.buffers.reduce((best,item)=>Math.abs(item.note-note)<Math.abs(best.note-note)?item:best),source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),level=articulation.gain??.82,attack=articulation.attack??.009;source.buffer=sample.buffer;source.playbackRate.value=Math.pow(2,(note-sample.note)/12);filter.type='lowpass';filter.frequency.value=articulation.brightness??18000;filter.Q.value=.45;gain.gain.setValueAtTime(.0001,this.ctx.currentTime);gain.gain.exponentialRampToValueAtTime(level,this.ctx.currentTime+attack);source.connect(filter).connect(gain).connect(this.destination);const voice={source,gain,filter,released:false};this.voices.set(id,voice);source.onended=()=>{if(this.voices.get(id)===voice)this.voices.delete(id);source.disconnect();filter.disconnect();gain.disconnect()};source.start()}
 noteOff(id:string){const voice=this.voices.get(id);if(!voice)return;if(this.sustain)voice.released=true;else this.release(id)}
 setSustain(value:boolean){this.sustain=value;if(!value)for(const [id,voice]of this.voices)if(voice.released)this.release(id)}
 private release(id:string,time=.12){const voice=this.voices.get(id);if(!voice)return;this.voices.delete(id);const now=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(.0001,now,Math.max(.005,time/4));try{voice.source.stop(now+time)}catch{/* A amostra já terminou. */}}
 panic(){for(const id of[...this.voices.keys()])this.release(id,.015);this.sustain=false}
 dispose(){this.loadEpoch++;this.panic();this.buffers=[]}
}
