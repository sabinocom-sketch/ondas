/** Stereo PCM16 WAV. Blocks contain interleaved left/right samples. */
export function encodeWav(blocks:Float32Array[], sampleRate:number):ArrayBuffer {
 const samples=blocks.reduce((n,b)=>n+b.length,0);
 const buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer);
 const text=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i))};
 text(0,'RIFF');view.setUint32(4,36+samples*2,true);text(8,'WAVE');text(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);
 view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);
 text(36,'data');view.setUint32(40,samples*2,true);
 let offset=44;for(const block of blocks)for(const value of block){const sample=Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;view.setInt16(offset,Math.round(sample*(sample<0?32768:32767)),true);offset+=2}
 return buffer;
}

/** Captures the final synth output only; no microphone or network access. */
export class WavRecorder {
 private blocks:Float32Array[]=[];
 private processor:ScriptProcessorNode;
 private silent:GainNode;
 private frames=0;
 private stopped=false;
 readonly sampleRate:number;
 // A bounded recording keeps PCM memory predictable on mobile devices.
 readonly maxSeconds=120;
 constructor(private source:AudioNode,readonly onLimit:()=>void,private startAt=0){
  const ctx=source.context as AudioContext;this.sampleRate=ctx.sampleRate;
  // ScriptProcessor also works in standalone file:// pages where AudioWorklet
  // availability differs. Only the recording branch uses this callback.
  this.processor=ctx.createScriptProcessor(4096,2,2);this.silent=ctx.createGain();this.silent.gain.value=0;
  this.processor.onaudioprocess=e=>{
   if(this.stopped)return;
   const left=e.inputBuffer.getChannelData(0),right=e.inputBuffer.getChannelData(1);
   const skip=this.startAt?Math.min(left.length,Math.max(0,Math.ceil((this.startAt-e.playbackTime)*this.sampleRate))):0;
   const count=Math.min(left.length-skip,this.maxSeconds*this.sampleRate-this.frames);if(!count)return;
   const block=new Float32Array(count*2);for(let i=0;i<count;i++){block[i*2]=left[i+skip];block[i*2+1]=right[i+skip]}
   this.blocks.push(block);this.frames+=count;
   if(this.frames>=this.maxSeconds*this.sampleRate)this.onLimit();
  };
  source.connect(this.processor);this.processor.connect(this.silent).connect(ctx.destination);
 }
 get seconds(){return this.frames/this.sampleRate}
 stop():Blob {
  this.disconnect();const result=new Blob([encodeWav(this.blocks,this.sampleRate)],{type:'audio/wav'});this.blocks=[];return result;
 }
 dispose(){this.disconnect();this.blocks=[]}
 private disconnect(){if(this.stopped)return;this.stopped=true;this.processor.onaudioprocess=null;try{this.source.disconnect(this.processor)}catch{/* Source may already be disposed. */}this.processor.disconnect();this.silent.disconnect()}
}
