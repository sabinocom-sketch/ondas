import {useEffect,useRef,useState,type PointerEvent} from 'react';
import type {MusicalInput} from '../music/input';
import {chordNotes,guitarChords,guitarOpenNotes,guitarStringNames,guitarTuning,midiNoteName,pickingDelay,pluckExpression,strumGesture,type GuitarChordName,type PickingStyle,type StrumDirection} from '../music/guitar';

const fretMarks=new Set([3,5,7,9,12]);

export function Guitar({input,electric=false}:{input:MusicalInput;electric?:boolean}){
 const [style,setStyle]=useState<PickingStyle>('pick');
 const [chord,setChord]=useState<GuitarChordName>('Em');
 const [frets,setFrets]=useState<(number|null)[]>([...guitarChords.Em]);
 const [strumDuration,setStrumDuration]=useState(120),[intensity,setIntensity]=useState(100);
 const [vibrating,setVibrating]=useState<Set<number>>(new Set());
 const timers=useRef<number[]>([]);
 const pulse=(string:number)=>{setVibrating(old=>new Set(old).add(string));const timer=window.setTimeout(()=>setVibrating(old=>{const next=new Set(old);next.delete(string);return next}),360);timers.current.push(timer)};
 const sound=(string:number,note:number,delay:number,expression:Parameters<MusicalInput['down']>[2])=>{const timer=window.setTimeout(()=>{const id=`guitar:${string}:${performance.now()}`;pulse(string);void input.down(id,note,expression);timers.current.push(window.setTimeout(()=>input.up(id),Math.round((expression?.durationSeconds??.68)*1000)))},delay);timers.current.push(timer)};
 const pluck=(string:number,note=guitarTuning[string]+(frets[string]??0),delay=0)=>sound(string,note,delay,pluckExpression(style==='finger'?'finger':style==='mute'?'mute':'pick',string,intensity));
 const strum=(direction:StrumDirection)=>{if(style==='mute'){chordNotes(chord,direction).forEach((item,index)=>sound(item.string,item.note,index*pickingDelay(style),pluckExpression('mute',item.string,intensity)));return}strumGesture(chord,direction,strumDuration,intensity).forEach(item=>sound(item.string,item.note,item.delayMs,{velocity:item.velocity,articulation:item.articulation,durationSeconds:Math.max(.32,(electric?1.05:.82)-item.delayMs/1000),mode:'expressive'}))};
 const chooseChord=(name:GuitarChordName)=>{input.clear();setChord(name);setFrets([...guitarChords[name]])};
 useEffect(()=>{const down=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('input,select,textarea,button')||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;const number=Number(event.key);if(number>=1&&number<=6){event.preventDefault();pluck(6-number)}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();strum(event.key==='ArrowDown'?'down':'up')}};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down)},[frets,chord,style,strumDuration,intensity]);
 useEffect(()=>()=>timers.current.forEach(clearTimeout),[]);
 const touch=(e:PointerEvent<HTMLButtonElement>,string:number,fret:number)=>{e.preventDefault();setFrets(old=>old.map((value,index)=>index===string?fret:value));pluck(string,guitarTuning[string]+fret)};
 return <section className={'guitar panel '+(electric?'electric':'acoustic')} aria-label={electric?'Guitarra elétrica':'Guitarra acústica'}>
  <div className="panel-heading"><div><span className="eyebrow">01 / GUITARRA INTERATIVA</span><h2>Toca corda a corda.</h2></div><span className="guitar-live"><i className="dot"/> SEIS CORDAS REAIS</span></div>
  <div className="guitar-controls">
   <fieldset><legend>Picking automático · seleciona um</legend>{([['pick','Palheta'],['finger','Dedilhado'],['rasgueado','Rasgueado'],...(electric?[["mute","Palm mute"]]:[])] as [PickingStyle,string][]).map(([value,label])=><button key={value} aria-pressed={style===value} onClick={()=>setStyle(value)}>{label}</button>)}</fieldset>
   <label>Acorde<select aria-label="Acorde de guitarra" value={chord} onChange={e=>chooseChord(e.target.value as GuitarChordName)}>{Object.keys(guitarChords).map(name=><option key={name}>{name}</option>)}</select></label>
   <label>Duração do gesto <span>{strumDuration} ms</span><input aria-label="Duração do rasgueado" type="range" min={30} max={300} step={5} value={strumDuration} onChange={e=>setStrumDuration(Number(e.target.value))}/></label><label>Intensidade <span>{intensity}</span><input aria-label="Intensidade da guitarra" type="range" min={20} max={127} value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/></label>
   <div className="strum-actions"><button onClick={()=>strum('down')} aria-label="Palhetada para baixo">↓ <span>Baixo</span></button><button onClick={()=>strum('up')} aria-label="Palhetada para cima">↑ <span>Cima</span></button></div>
  </div>
  <div className="guitar-stage">
   <div className="guitar-illustration" aria-hidden="true">
    <svg viewBox="0 0 330 420" role="img"><defs><linearGradient id={'wood-'+(electric?'e':'a')} x1="0" x2="1"><stop stopColor={electric?'#841f27':'#b56b32'}/><stop offset=".5" stopColor={electric?'#e25543':'#e0a15f'}/><stop offset="1" stopColor={electric?'#64141d':'#8a4a24'}/></linearGradient></defs><path className="guitar-body" fill={`url(#wood-${electric?'e':'a'})`} d={electric?'M79 365C24 339 35 274 82 249c-25-58 23-108 71-76 37-31 90-4 83 52 54 21 67 89 21 127-42 35-130 37-178 13Z':'M74 370c-54-34-39-106 12-129-31-52 12-104 65-74 43-31 89 20 61 72 59 20 75 96 22 132-43 29-119 27-160-1Z'}/><circle className="sound-hole" cx="153" cy="273" r={electric?18:36}/><rect className="bridge" x="104" y="337" width="98" height="13" rx="4"/><path className="neck" d="M132 259 143 45h24l11 214Z"/><path className="headstock" d="M139 51 132 8h46l-12 43Z"/>{[0,1,2,3,4,5].map(i=><line key={i} className={'body-string '+(vibrating.has(i)?'vibrating':'')} x1={145+i*3.2} y1="24" x2={125+i*12} y2="343"/>)}</svg>
   </div>
   <div className="fretboard-wrap">
    <div className="string-labels" aria-hidden="true">{guitarStringNames.map((name,i)=><span key={name}><b>{6-i}</b><em>{guitarOpenNotes[i]}</em></span>)}</div>
    <div className="fretboard" role="grid" aria-label="Braço da guitarra — toca numa casa">
     {guitarStringNames.map((name,string)=><div className={'guitar-string '+(vibrating.has(string)?'vibrating':'')} role="row" key={name}>{Array.from({length:13},(_,fret)=>{const note=midiNoteName(guitarTuning[string]+fret);return <button key={fret} role="gridcell" className={(frets[string]===fret?'selected ':'')+(fretMarks.has(fret)?'marked':'')} aria-label={`${name}, ${note}, ${fret===0?'corda solta':`casa ${fret}`}`} aria-pressed={frets[string]===fret} onPointerDown={e=>touch(e,string,fret)}><span>{frets[string]===fret?note:''}</span></button>})}</div>)}
    </div>
   </div>
  </div>
  <div className="guitar-footer"><span>Clica numa casa: a nota toca logo com o picking selecionado. Teclas 1–6 repetem cada corda.</span><span>Escolhe um acorde e usa ↑ ou ↓ para palhetar — não precisas de carregar na nota ao mesmo tempo.</span></div>
 </section>
}
