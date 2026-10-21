import {midiNoteName} from './guitar';

export type BassPickingStyle='finger'|'pick'|'slap'|'mute';
export const bassTuning=[28,33,38,43] as const;
export const bassStringNames=['Mi','Lá','Ré','Sol'] as const;
export const bassOpenNotes=bassTuning.map(midiNoteName);
export const bassStyleSettings:Record<BassPickingStyle,{label:string;duration:number;description:string;gain:number;attack:number;brightness:number}>={
 finger:{label:'Dedos',duration:1050,description:'Som redondo e sustentado',gain:.74,attack:.018,brightness:5200},
 pick:{label:'Palheta',duration:720,description:'Ataque definido',gain:.86,attack:.005,brightness:9000},
 slap:{label:'Slap',duration:390,description:'Ataque brilhante e percussivo',gain:1,attack:.002,brightness:15000},
 mute:{label:'Palm mute',duration:230,description:'Som abafado e muito curto',gain:.66,attack:.007,brightness:2200}
};
