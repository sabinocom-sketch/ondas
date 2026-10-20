import type {EnvelopeSettings} from './parameters';
export function levelAt(t:number,e:EnvelopeSettings):number{if(t<=0)return 0;if(t<e.attack)return t/e.attack;if(t<e.attack+e.decay)return 1-(1-e.sustain)*(t-e.attack)/e.decay;return e.sustain}
export function hold(p:AudioParam,t:number,value:number){if(typeof p.cancelAndHoldAtTime==='function')p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(value,t)}}
export function startEnvelope(p:AudioParam,t:number,e:EnvelopeSettings,base=0,amount=1){p.cancelScheduledValues(t);p.setValueAtTime(base,t);p.linearRampToValueAtTime(base+amount,t+e.attack);p.linearRampToValueAtTime(base+amount*e.sustain,t+e.attack+e.decay)}
export function releaseEnvelope(p:AudioParam,t:number,duration:number,current:number,base=0){hold(p,t,current);p.linearRampToValueAtTime(base,t+duration)}
