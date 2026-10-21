import {DrumKit} from './drums';
import {Effects} from './effects';
import {defaults,clonePatch} from './parameters';
import {encodeWav} from './recorder';
import {SamplePlayer,sampleLibrary,type SampleInstrumentId} from './sampler';
import {VoiceManager} from './voice-manager';
import {library} from '../presets/library';
import {STEPS} from '../music/composition';
import type {SongProject} from '../music/song';

/** Renders the complete ordered arrangement without recording in real time. */
export async function renderSongWav(project:SongProject):Promise<Blob>{
 const stepSeconds=60/project.bpm/4,bodySeconds=project.order.length*STEPS*stepSeconds;
 if(bodySeconds>720)throw new Error('A sequência excede 12 minutos; divide-a em dois projetos para proteger a memória do dispositivo.');
 const sampleRate=44100,context=new OfflineAudioContext(2,Math.ceil((bodySeconds+3)*sampleRate),sampleRate),cleanup:Array<()=>void>=[];
 const blocks=project.order.map(id=>project.blocks.find(block=>block.id===id)!).filter(Boolean);
 for(let blockIndex=0;blockIndex<blocks.length;blockIndex++){
  const block=blocks[blockIndex],blockStart=blockIndex*STEPS*stepSeconds,solo=block.tracks.some(track=>track.solo);
  for(const track of block.tracks){
   if(track.muted||track.volume<=0||(solo&&!track.solo)||!track.notes.length)continue;
   const sampled=sampleLibrary.find(item=>item.id===track.instrument);
   if(sampled){
    const effects=new Effects(context),patch=clonePatch(defaults);patch.master=.8;effects.update(patch);
    const player=new SamplePlayer(context,effects.input);await player.load(sampled.id as SampleInstrumentId);
    track.notes.forEach(note=>{const id=`export:${blockIndex}:${track.id}:${note.id}`,start=.05+blockStart+note.start*stepSeconds;player.noteOn(id,note.note,{gain:.82*track.volume},start);player.noteOff(id,start+note.length*stepSeconds)});
    cleanup.push(()=>{player.dispose();effects.dispose()});
   }else{
    const source=library.find(item=>item.id===track.instrument)?.patch??defaults,patch=clonePatch(source);patch.master*=track.volume;
    const effects=new Effects(context);effects.update(patch);const voices=new VoiceManager(context,effects.input,16,()=>{});
    track.notes.forEach(note=>{const id=`export:${blockIndex}:${track.id}:${note.id}`,start=.05+blockStart+note.start*stepSeconds;voices.noteOn(id,note.note,patch,start);voices.noteOff(id,start+note.length*stepSeconds)});
    cleanup.push(()=>{voices.panic();effects.dispose()});
   }
  }
 }
 const drumEffects=new Effects(context);drumEffects.update(defaults);const drums=new DrumKit(context,drumEffects.percussionInput);
 blocks.forEach((block,blockIndex)=>block.drums.tracks.forEach(track=>{if(track.muted||track.volume<=0)return;track.steps.forEach((velocity,step)=>{if(velocity)drums.trigger(track.id,track.volume*velocity,.05+(blockIndex*STEPS+step)*stepSeconds)})}));
 cleanup.push(()=>{drums.dispose();drumEffects.dispose()});
 try{const rendered=await context.startRendering(),interleaved=new Float32Array(rendered.length*2),left=rendered.getChannelData(0),right=rendered.getChannelData(1);for(let i=0;i<rendered.length;i++){interleaved[i*2]=left[i];interleaved[i*2+1]=right[i]}return new Blob([encodeWav([interleaved],sampleRate)],{type:'audio/wav'})}finally{cleanup.forEach(dispose=>dispose())}
}
