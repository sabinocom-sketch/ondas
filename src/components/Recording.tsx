import {useEffect,useRef,useState} from 'react';
import {engine} from '../audio/engine';
import {WavRecorder} from '../audio/recorder';
const time=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
export function Recording(){
 const recorder=useRef<WavRecorder|null>(null),url=useRef(''),generation=useRef(0);
 const [recording,setRecording]=useState(false),[busy,setBusy]=useState(false),[seconds,setSeconds]=useState(0),[clip,setClip]=useState(''),[message,setMessage]=useState('');
 const finish=()=>{
  const current=recorder.current;if(!current)return;recorder.current=null;
  const duration=current.seconds;const blob=current.stop();setRecording(false);setSeconds(duration);
  if(!duration){setMessage('A gravação terminou antes de receber áudio. Tenta novamente.');return}
  if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setClip(url.current);setMessage('Gravação pronta. Descarrega o WAV para a guardar.');
 };
 useEffect(()=>{
  const interrupt=()=>{if(document.hidden||engine.context?.state!=='running'){generation.current++;setBusy(false);if(recorder.current){finish();setMessage('Gravação interrompida. O áudio captado está disponível para descarga.')}}};
  engine.listeners.add(interrupt);document.addEventListener('visibilitychange',interrupt);window.addEventListener('pagehide',interrupt);
  const timer=window.setInterval(()=>{if(recorder.current)setSeconds(recorder.current.seconds)},200);
  return()=>{generation.current++;window.clearInterval(timer);engine.listeners.delete(interrupt);document.removeEventListener('visibilitychange',interrupt);window.removeEventListener('pagehide',interrupt);recorder.current?.dispose();if(url.current)URL.revokeObjectURL(url.current)};
 },[]);
 const start=async()=>{
  const id=++generation.current;setBusy(true);setMessage('');
  try{await engine.start();if(id!==generation.current||document.hidden)return;
   if(!engine.effects)throw new Error('Áudio indisponível');
   recorder.current=new WavRecorder(engine.effects.analyser,()=>{finish();setMessage('Limite de 2 minutos atingido. O WAV está pronto para descarga.')});
   setSeconds(0);setRecording(true);
  }catch(e){setMessage('Não foi possível gravar: '+String(e))}finally{if(id===generation.current)setBusy(false)}
 };
 return <section className="recording panel" aria-label="Gravação"><div className="record-actions"><button className={recording?'record-stop':'record-start'} disabled={busy} onClick={()=>recording?finish():void start()}>{recording?'■ Parar gravação':busy?'A preparar…':'● Gravar'}</button><output aria-label="Duração da gravação" className={recording?'record-time live':'record-time'}>{time(seconds)}</output><span className="record-hint">WAV estéreo · até 2 min</span>{clip&&<a className="download" href={clip} download="ondas-gravacao.wav">Descarregar WAV</a>}</div>{clip&&!recording&&<audio controls src={clip} aria-label="Ouvir gravação"/>}<p role="status">{message||'Grava o som do Ondas, incluindo efeitos e volume master.'}</p></section>
}
