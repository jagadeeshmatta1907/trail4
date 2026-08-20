/**
 * SHOW! Card Game - Web Audio API Synthesizer
 * Zero-dependency, procedurally synthesized sound effects
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.init();
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.2, fadeOut = true) {
        if (this.muted || !this.ctx) return;
        this.resume();

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            if (fadeOut) {
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            }

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    }

    playCardDeal() {
        if (this.muted || !this.ctx) return;
        this.resume();

        try {
            const bufferSize = this.ctx.sampleRate * 0.06;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200;
            filter.Q.value = 3;

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start();
        } catch (e) {}
    }

    playCardPass() {
        if (this.muted || !this.ctx) return;
        this.resume();

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.18);

            gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.18);
        } catch (e) {}
    }

    playCardSelect() {
        this.playTone(520, 'sine', 0.08, 0.15);
    }

    playMatchComplete() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.35, 0.2);
            }, idx * 70);
        });
    }

    playShowSiren() {
        if (this.muted || !this.ctx) return;
        this.resume();

        try {
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(140, this.ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 1.2);

            gain1.gain.setValueAtTime(0.5, this.ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start();
            osc1.stop(this.ctx.currentTime + 1.2);

            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = 'square';

            const now = this.ctx.currentTime;
            osc2.frequency.setValueAtTime(880, now);
            osc2.frequency.linearRampToValueAtTime(1320, now + 0.15);
            osc2.frequency.linearRampToValueAtTime(880, now + 0.3);
            osc2.frequency.linearRampToValueAtTime(1320, now + 0.45);
            osc2.frequency.linearRampToValueAtTime(880, now + 0.6);

            gain2.gain.setValueAtTime(0.3, now);
            gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.75);

            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start();
            osc2.stop(now + 0.75);
        } catch (e) {}
    }

    playBuzzer() {
        if (this.muted || !this.ctx) return;
        this.resume();

        this.playTone(850, 'triangle', 0.12, 0.3);
        setTimeout(() => this.playTone(1100, 'sine', 0.18, 0.25), 60);
    }

    playRoundWin() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const melody = [
            { f: 523.25, d: 0.12, t: 0 },
            { f: 659.25, d: 0.12, t: 120 },
            { f: 783.99, d: 0.12, t: 240 },
            { f: 1046.50, d: 0.45, t: 360 }
        ];

        melody.forEach(m => {
            setTimeout(() => {
                this.playTone(m.f, 'triangle', m.d, 0.25);
            }, m.t);
        });
    }

    playGrandChampion() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playTone(freq, 'triangle', 0.5, 0.25);
            }, idx * 100);
        });
    }
}

window.soundEngine = new SoundEngine();
