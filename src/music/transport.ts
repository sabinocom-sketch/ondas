export type TransportState='stopped'|'playing'|'paused';
export interface AudioClock{currentTime:number;state:string}

/** Musical clock only. Sound scheduling remains the responsibility of each client. */
export class MusicalTransport{
 private originTime=0;private originTick=0;private storedTick=0;private generationValue=0;
 state:TransportState='stopped';
 constructor(private clock:AudioClock,private bpmValue:number,readonly ticksPerBeat=4,readonly lookAhead=.12){}
 get bpm(){return this.bpmValue}
 get generation(){return this.generationValue}
 get secondsPerTick(){return 60/this.bpmValue/this.ticksPerBeat}
 ticksToSeconds(ticks:number){return ticks*this.secondsPerTick}
 secondsToTicks(seconds:number){return seconds/this.secondsPerTick}
 position(at=this.clock.currentTime){return this.state==='playing'?this.originTick+Math.max(0,at-this.originTime)/this.secondsPerTick:this.storedTick}
 play(from=this.storedTick,lead=.05){this.generationValue++;this.originTick=Math.max(0,from);this.storedTick=this.originTick;this.originTime=this.clock.currentTime+Math.max(0,lead);this.state='playing';return this.originTime}
 pause(){if(this.state!=='playing')return this.storedTick;this.storedTick=this.position();this.generationValue++;this.state='paused';return this.storedTick}
 resume(lead=.05){if(this.state!=='paused')return this.originTime;return this.play(this.storedTick,lead)}
 seek(tick:number,lead=this.state==='playing'?.05:0){const wasPlaying=this.state==='playing';this.storedTick=Math.max(0,tick);this.generationValue++;if(wasPlaying){this.originTick=this.storedTick;this.originTime=this.clock.currentTime+Math.max(0,lead)}return this.storedTick}
 setBpm(bpm:number,lead=this.state==='playing'?.05:0){if(!Number.isFinite(bpm)||bpm<=0)throw new Error('Andamento inválido');const tick=this.position();this.bpmValue=bpm;this.storedTick=tick;this.generationValue++;if(this.state==='playing'){this.originTick=tick;this.originTime=this.clock.currentTime+Math.max(0,lead)}return tick}
 stop(reset=true){if(!reset)this.storedTick=this.position();else this.storedTick=0;this.generationValue++;this.state='stopped';return this.storedTick}
 tickTime(tick:number){return this.originTime+(tick-this.originTick)*this.secondsPerTick}
 horizon(at=this.clock.currentTime){return this.position(at+this.lookAhead)}
}
