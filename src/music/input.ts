import type {Engine} from '../audio/engine';
export const keyMap:Record<string,number>={KeyA:0,KeyW:1,KeyS:2,KeyE:3,KeyD:4,KeyF:5,KeyT:6,KeyG:7,KeyY:8,KeyH:9,KeyU:10,KeyJ:11,KeyK:12,KeyO:13,KeyL:14,KeyP:15,Semicolon:16};
export class MusicalInput {
 active=new Map<string,number>();latched=false;space=false;epoch=0;
 constructor(readonly engine:Engine,readonly changed:()=>void,readonly failed:(e:unknown)=>void=()=>{}){}
 async down(id:string,note:number){if(this.active.has(id))return;this.active.set(id,note);const epoch=this.epoch;this.changed();try{await this.engine.start();if(epoch===this.epoch&&this.active.get(id)===note)this.engine.noteOn(id,note)}catch(e){this.active.delete(id);this.changed();this.failed(e)}}
 up(id:string){this.active.delete(id);this.engine.noteOff(id);this.changed()}
 pedal(value:boolean,space=false){if(space)this.space=value;else this.latched=value;this.engine.sustain(this.latched||this.space);this.changed()}
 clear(){this.epoch++;this.active.clear();this.latched=false;this.space=false;this.engine.panic();this.changed()}
}
