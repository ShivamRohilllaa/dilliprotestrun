import type { SaveSettings } from '../economy/SaveManager';
export type Sound = 'button' | 'coin' | 'jump' | 'slide' | 'hit' | 'slogan';
/** Original oscillator cues, synthesized locally after a user gesture. */
export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private beat = 0;
  private step = 0;
  private unavailable = false;
  constructor(private settings: () => SaveSettings) {}
  unlock(): void {
    if (this.unavailable) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended')
        void this.context.resume().catch((error) => console.warn('Audio could not resume:', error));
    } catch (error) {
      this.unavailable = true;
      console.warn('Audio unavailable; continuing silently:', error);
    }
  }
  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    offset = 0,
    gain = 0.1,
  ): void {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    this.master.gain.value = this.settings().volume;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime + offset;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  play(sound: Sound): void {
    if (!this.settings().sound) return;
    if (sound === 'coin') {
      this.tone(880, 0.12);
      this.tone(1320, 0.16, 'sine', 0.07);
    }
    if (sound === 'button') this.tone(420, 0.06, 'sine', 0, 0.05);
    if (sound === 'jump') {
      this.tone(320, 0.13, 'triangle');
      this.tone(540, 0.14, 'triangle', 0.06);
    }
    if (sound === 'slide') this.tone(150, 0.2, 'sawtooth', 0, 0.035);
    if (sound === 'hit') {
      this.tone(68, 0.3, 'sawtooth', 0, 0.13);
      this.tone(110, 0.2, 'square', 0.05, 0.04);
    }
    if (sound === 'slogan')
      [330, 440, 550, 660].forEach((note, i) => this.tone(note, 0.2, 'triangle', i * 0.13, 0.15));
  }
  update(dt: number, playing: boolean): void {
    if (!playing || !this.settings().music || !this.settings().sound) {
      this.beat = 0;
      return;
    }
    this.beat += dt;
    if (this.beat >= 0.28) {
      this.beat -= 0.28;
      this.step++;
      const notes = [110, 110, 164.81, 146.83, 110, 164.81, 196, 146.83];
      this.tone(notes[this.step % 8], 0.16, 'triangle', 0, 0.05);
      if (this.step % 2 === 0) this.tone(55, 0.12, 'sine', 0, 0.09);
      if (this.step % 4 === 3) this.tone(660, 0.06, 'triangle', 0, 0.025);
    }
  }
  dispose(): void {
    if (this.context)
      void this.context.close().catch((error) => console.warn('Audio cleanup failed:', error));
    this.context = null;
  }
}
