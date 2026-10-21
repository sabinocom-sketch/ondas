import { Voice } from './voice';
import type { Patch } from './parameters';

/** Sixteen playable slots, plus bounded 8 ms fades during voice stealing. */
export class VoiceManager {
  voices = new Map<string, Voice>();
  retiring = new Set<Voice>();
  sustain = false;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly output: AudioNode,
    readonly limit = 16,
    readonly changed = () => {},
  ) {}

  private retire(voice: Voice) {
    this.voices.delete(voice.id);
    // A burst of input cannot accumulate unlimited oscillator tails.
    if (this.retiring.size >= this.limit) this.retiring.values().next().value?.dispose();
    this.retiring.add(voice);
    voice.release(true);
  }

  noteOn(id: string, note: number, patch: Patch, at = this.ctx.currentTime) {
    const existing = this.voices.get(id);
    if (existing) {
      if (existing.held) return;
      this.retire(existing);
    }
    if (this.voices.size >= this.limit) {
      const all = [...this.voices.values()];
      this.retire(all.find(v => v.released) || all.find(v => !v.held) || all[0]);
    }
    let voice: Voice;
    voice = new Voice(this.ctx, id, note, patch, this.output, () => {
      if (this.voices.get(id) === voice) this.voices.delete(id);
      this.retiring.delete(voice);
      this.changed();
    },at);
    this.voices.set(id, voice);
    this.changed();
  }

  noteOff(id: string, at = this.ctx.currentTime) {
    const voice = this.voices.get(id);
    if (!voice) return;
    voice.held = false;
    if (!this.sustain) voice.release(false,at);
    this.changed();
  }

  setSustain(value: boolean) {
    this.sustain = value;
    if (!value) this.voices.forEach(v => { if (!v.held) v.release(); });
    this.changed();
  }

  update(patch: Patch) { this.voices.forEach(v => v.update(patch)); }

  panic() {
    this.sustain = false;
    this.voices.forEach(v => v.dispose());
    this.retiring.forEach(v => v.dispose());
    this.voices.clear();
    this.retiring.clear();
    this.changed();
  }
}
