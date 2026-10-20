import {DrumKit} from '../../src/audio/drums';
import {DRUMS} from '../../src/music/drum-pattern';
import '../../src/main';
import {engine} from '../../src/audio/engine';
import {VoiceManager} from '../../src/audio/voice-manager';
import {Effects} from '../../src/audio/effects';
import * as parameters from '../../src/audio/parameters';
import {library} from '../../src/presets/library';
Object.assign(window,{__ondasTest:{DrumKit,DRUMS,engine,VoiceManager,Effects,...parameters,library}});
