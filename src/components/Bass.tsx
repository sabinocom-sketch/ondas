import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {MusicalInput} from '../music/input';
import {bassExpression,bassOpenNotes,bassStringNames,bassStyleSettings,bassTuning,type BassPickingStyle} from '../music/bass';
import {midiNoteName} from '../music/guitar';

const marks=new Set([3,5,7,9,12,15]);

export function Bass({input}:{input:MusicalInput}){
 const [style,setStyle]=useState<BassPickingStyle>('finger');
 const [frets,setFrets]=useState([0,0,0,0]);
 const [vibrating,setVibrating]=useState<Set<number>>(new Set());
 const [last,setLast]=useState('Mi1');
 const [intensity,setIntensity]=useState(100);
 const timers=useRef<number[]>([]);
 const pulse=(string:number)=>{setVibrating(old=>new Set(old).add(string));timers.current.push(window.setTimeout(()=>setVibrating(old=>{const next=new Set(old);next.delete(string);return next}),style==='slap'?520:360))};
 const pluck=(string:number,note=bassTuning[string]+frets[string])=>{const id=`bass:${string}:${performance.now()}`,setting=bassStyleSettings[style];setLast(midiNoteName(note));pulse(string);void input.down(id,note,bassExpression(style,intensity));timers.current.push(window.setTimeout(()=>input.up(id),setting.duration))};
 const touch=(event:PointerEvent<HTMLButtonElement>,string:number,fret:number)=>{event.preventDefault();setFrets(old=>old.map((value,index)=>index===string?fret:value));pluck(string,bassTuning[string]+fret)};
 useEffect(()=>{const down=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('input,select,textarea,button')||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;const number=Number(event.key);if(number>=1&&number<=4){event.preventDefault();pluck(4-number)}};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down)},[frets,style]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 return <section className="guitar bass panel" aria-label="Baixo elétrico">
  <div className="panel-heading"><div><span className="eyebrow">01 / BAIXO ELÉTRICO INTERATIVO</span><h2>Graves que se sentem.</h2></div><div className="bass-readout"><small>ÚLTIMA NOTA</small><strong>{last}</strong></div></div>
  <div className="guitar-controls"><fieldset><legend>Estilo de picking · seleciona um</legend>{(Object.entries(bassStyleSettings) as [BassPickingStyle,(typeof bassStyleSettings)[BassPickingStyle]][]).map(([value,setting])=><button key={value} title={setting.description} aria-pressed={style===value} onClick={()=>setStyle(value)}>{setting.label}</button>)}</fieldset><label>Intensidade <span>{intensity}</span><input aria-label="Intensidade do baixo" type="range" min={20} max={127} value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/></label><div className="bass-technique"><b>{bassStyleSettings[style].label}</b><span>{bassStyleSettings[style].description}</span></div></div>
  <div className="guitar-stage bass-stage">
   <div className="guitar-illustration bass-illustration" aria-hidden="true"><svg viewBox="0 0 330 430" role="img"><defs><linearGradient id="bass-paint" x1="0" x2="1"><stop stopColor="#173e48"/><stop offset=".52" stopColor="#3e8990"/><stop offset="1" stopColor="#102a32"/></linearGradient><linearGradient id="bass-neck" x1="0" x2="1"><stop stopColor="#6d4227"/><stop offset=".5" stopColor="#b87842"/><stop offset="1" stopColor="#59351f"/></linearGradient></defs><path className="guitar-body" fill="url(#bass-paint)" d="M62 374c-38-39-17-98 31-116-16-32 3-79 42-81 26-1 29 18 44 23 20 7 30-27 60-18 42 13 42 71 8 91 51 38 42 101-10 126-49 24-137 10-175-25Z"/><path className="bass-pickguard" d="M94 259c37-21 109-14 137 11l-23 75-84-4-30-82Z"/><path className="neck bass-neck" fill="url(#bass-neck)" d="M139 263 147 48h22l17 215Z"/><path className="headstock" d="M145 54 137 8h44l-13 46Z"/>{Array.from({length:12},(_,i)=><line key={i} className="bass-fret" x1={141+i*.9} y1={245-i*15.2} x2={184-i*1.2} y2={245-i*15.2}/>) }<rect className="pickup" x="111" y="288" width="93" height="17" rx="3"/><rect className="pickup" x="118" y="318" width="84" height="16" rx="3"/><rect className="bridge" x="113" y="354" width="91" height="14" rx="3"/><circle className="bass-knob" cx="229" cy="330" r="8"/><circle className="bass-knob" cx="246" cy="347" r="7"/>{[0,1,2,3].map(i=><g key={i}><circle className="tuner" cx={i%2?180:139} cy={18+i*9} r="5"/><line className={'body-string bass-body-string '+(vibrating.has(i)?'vibrating':'')} x1={151+i*4} y1="23" x2={129+i*19} y2="361"/></g>)}</svg></div>
   <div className="fretboard-wrap bass-board-wrap"><div className="string-labels bass-labels" aria-hidden="true">{bassStringNames.map((name,i)=><span key={name}><b>{4-i}</b><em>{bassOpenNotes[i]}</em></span>)}</div><div className="fretboard bass-board" role="grid" aria-label="Braço do baixo — toca numa casa">{bassStringNames.map((name,string)=><div className={'guitar-string bass-string '+(vibrating.has(string)?'vibrating':'')} role="row" key={name}>{Array.from({length:17},(_,fret)=>{const note=midiNoteName(bassTuning[string]+fret);return <button key={fret} role="gridcell" className={(frets[string]===fret?'selected ':'')+(marks.has(fret)?'marked':'')} aria-label={`Corda ${name}, ${note}, ${fret===0?'solta':`casa ${fret}`}`} aria-pressed={frets[string]===fret} onPointerDown={e=>touch(e,string,fret)}><span>{frets[string]===fret?note:''}</span></button>})}</div>)}</div></div>
  </div>
  <div className="guitar-footer"><span>Cordas abertas: 4 = Mi1 · 3 = Lá1 · 2 = Ré2 · 1 = Sol2.</span><span>Clica na nota ou usa 1–4 para repetir as cordas com a técnica selecionada.</span></div>
 </section>
}
