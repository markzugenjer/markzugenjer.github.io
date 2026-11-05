/** Tiny synthesized sound effects: no audio files to download. */
export class Sfx {
  constructor() {
    this.ctx = null;
  }

  /** Browsers only allow sound after the user clicks or presses something. */
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch {
      /* audio unavailable */
    }
  }

  tone(f1, f2, dur, type = 'sine', vol = 0.08, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t);
    if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(kind) {
    switch (kind) {
      case 'click': this.tone(520, 780, 0.08, 'triangle', 0.06); break;
      case 'clean': this.tone(900, 1500, 0.14, 'sine', 0.07); break;
      case 'zap': this.tone(1400, 260, 0.16, 'square', 0.035); break;
      case 'hit': this.tone(180, 70, 0.35, 'sawtooth', 0.07); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, null, 0.22, 'triangle', 0.07, i * 0.11)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => this.tone(f, null, 0.28, 'triangle', 0.07, i * 0.15)); break;
      default: break;
    }
  }
}
