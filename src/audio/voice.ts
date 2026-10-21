import {frequency,type Patch,clonePatch} from './parameters';
import {createOscillators} from './oscillators';
import {startEnvelope,releaseEnvelope,levelAt} from './envelope';
export class Voice {
 private cleanupTimer?: ReturnType<typeof setTimeout>;
 readonly started:number;released=false;disposed=false;held=true;end=Infinity;patch:Patch;
 readonly filter:BiquadFilterNode;readonly amp:GainNode;readonly oscillators:ReturnType<typeof createOscillators>;
 constructor(readonly ctx:BaseAudioContext,readonly id:string,readonly note:number,p:Patch,target:AudioNode,readonly onDispose:()=>void,startAt=ctx.currentTime){
 this.started=Math.max(ctx.currentTime,startAt);this.patch=clonePatch(p);this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.amp=ctx.createGain();this.filter.connect(this.amp).connect(target);this.oscillators=createOscillators(ctx,note,p,this.filter);this.filter.Q.value=p.filter.resonance;
 startEnvelope(this.amp.gain,this.started,p.amp);startEnvelope(this.filter.frequency,this.started,p.filter.envelope,p.filter.cutoff,Math.min(p.filter.amount,ctx.sampleRate/2-100-p.filter.cutoff));
 this.oscillators.forEach(({osc})=>osc.start(this.started));this.oscillators[0].osc.onended=()=>this.dispose();
 }
 update(p:Patch){const t=this.ctx.currentTime;this.oscillators.forEach(({osc,gain},i)=>{const o=p.osc[i];osc.type=o.wave;osc.frequency.setTargetAtTime(frequency(this.note+12*o.octave,p.tuning),t,.015);osc.detune.setTargetAtTime(o.detune,t,.015);gain.gain.setTargetAtTime(o.volume*(i?p.mix:1-p.mix),t,.015)});this.filter.Q.setTargetAtTime(p.filter.resonance,t,.015);
 if(JSON.stringify(p.filter)!==JSON.stringify(this.patch.filter)){this.filter.frequency.cancelScheduledValues(t);this.filter.frequency.setTargetAtTime(Math.min(this.ctx.sampleRate/2-100,p.filter.cutoff+p.filter.amount*levelAt(t-this.started,p.filter.envelope)),t,.02)}
 if(!this.released&&t>this.started+this.patch.amp.attack+this.patch.amp.decay&&p.amp.sustain!==this.patch.amp.sustain){this.amp.gain.cancelScheduledValues(t);this.amp.gain.setTargetAtTime(p.amp.sustain,t,.02)}this.patch=clonePatch(p);
 }
 release(fast=false,at=this.ctx.currentTime){if((this.released&&!fast)||this.disposed)return;this.held=false;this.released=true;const t=Math.max(this.started,at),p=this.patch,d=fast?.008:p.amp.release;releaseEnvelope(this.amp.gain,t,d,levelAt(t-this.started,p.amp));releaseEnvelope(this.filter.frequency,t,fast?.008:p.filter.envelope.release,this.filter.frequency.value,p.filter.cutoff);this.end=t+d+.01;this.oscillators.forEach(({osc})=>osc.stop(this.end));
 // Real-time output devices may stall without delivering the ended event.
 // Offline rendering must remain governed solely by the audio clock.
 if ('resume' in this.ctx && !('startRendering' in this.ctx)) {
  clearTimeout(this.cleanupTimer);
  this.cleanupTimer=setTimeout(()=>this.dispose(),Math.max(0,(this.end-this.ctx.currentTime+.15)*1000));
 }}
 dispose(){if(this.disposed)return;this.disposed=true;clearTimeout(this.cleanupTimer);this.oscillators.forEach(({osc,gain})=>{osc.onended=null;try{osc.stop()}catch{}osc.disconnect();gain.disconnect()});this.filter.disconnect();this.amp.disconnect();this.onDispose()}
}
