import {DrumKit} from './drums';
import {Effects} from './effects';
import {defaults,clonePatch,type Patch} from './parameters';
import {encodeWav} from './recorder';
import {SequenceAudio} from './sequence-audio';
import {library} from '../presets/library';
import {blockSteps,validSong,type SongProject} from '../music/song';

/** Render the ordered arrangement through the same shared effects/master bus
 * as live playback. Future events queued offline are not live voice slots. */
export async function renderSongWav(project:SongProject,settings:Patch=defaults,options:{master?:number}={}):Promise<Blob>{
 if(!validSong(project))throw new Error('Projeto de composição inválido.');
 const blocks=project.order.map(id=>project.blocks.find(block=>block.id===id)!),patch=clonePatch(settings),stepSeconds=60/project.bpm/4,bodySeconds=blocks.reduce((sum,block)=>sum+blockSteps(block),0)*stepSeconds;if(options.master!==undefined)patch.master=options.master;
 if(bodySeconds>720)throw new Error('A sequência excede 12 minutos; divide-a em dois projetos para proteger a memória do dispositivo.');
 const audible=blocks.flatMap(block=>{const solo=block.tracks.some(t=>t.solo);return block.tracks.filter(t=>!t.muted&&t.volume>0&&(!solo||t.solo)&&t.notes.length)});
 const release=Math.max(.12,...audible.map(t=>(library.find(p=>p.id===t.instrument)?.patch??patch).amp.release));
 const echoes=patch.delay.enabled&&patch.delay.mix>0?patch.delay.time*(1+(patch.delay.feedback>0?Math.ceil(Math.log(.0001)/Math.log(patch.delay.feedback)):0)):0;
 const tail=release+echoes+(patch.reverb.enabled&&patch.reverb.mix>0?2:0)+.25;
 const sampleRate=44100,context=new OfflineAudioContext(2,Math.ceil((.05+bodySeconds+tail)*sampleRate),sampleRate);
 const effects=new Effects(context),sequence=new SequenceAudio(context,effects.input,()=>patch,true),drums=new DrumKit(context,effects.percussionInput,Infinity);
 try{
  effects.update(patch,true);
  await sequence.prepare(audible.map(track=>track.instrument));
  let blockStart=0;for(let blockIndex=0;blockIndex<blocks.length;blockIndex++){
   const block=blocks[blockIndex],solo=block.tracks.some(t=>t.solo);
   // Chronological scheduling preserves open/closed hi-hat timing.
   for(let step=0;step<blockSteps(block);step++){
    const at=.05+(blockStart+step)*stepSeconds;
    for(const track of block.tracks)if(!track.muted&&track.volume>0&&(!solo||track.solo)){
     for(const note of track.notes)if(note.start===step)sequence.note(`export:${blockIndex}:${track.id}:${note.id}`,note.note,at,at+note.length*stepSeconds,track.instrument,track.volume);
    }
    for(const track of block.drums.tracks)if(!track.muted&&track.volume>0&&track.steps[step]>0)drums.trigger(track.id,track.volume*track.steps[step],at);
   }
   blockStart+=blockSteps(block);
  }
  const rendered=await context.startRendering(),interleaved=new Float32Array(rendered.length*2),left=rendered.getChannelData(0),right=rendered.getChannelData(1);
  for(let i=0;i<rendered.length;i++){interleaved[i*2]=left[i];interleaved[i*2+1]=right[i]}
  return new Blob([encodeWav([interleaved],sampleRate)],{type:'audio/wav'});
 }finally{sequence.dispose();drums.dispose();effects.dispose()}
}
