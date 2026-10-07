// Web Audio API sound synthesizer & Real Browser Notification
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext not available:', e);
    return null;
  }
}

// Request real browser notification permission
export function requestNotificationPermission(): void {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

export function sendRealBrowserNotification(title: string, body: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Notification failed:', e);
      }
    }
  }
}

// Stoppage alarm sound: an authentic alarm bell
let stoppageInterval: number | null = null;

export function playStoppageBellSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Ring Tone 1 (High bell strike: 920Hz)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(920, now);
  osc1.frequency.exponentialRampToValueAtTime(820, now + 0.35);

  gain1.gain.setValueAtTime(0.6, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.42);

  // Ring Tone 2 (Harmonic ringing undertone: 620Hz)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(620, now + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(540, now + 0.6);

  gain2.gain.setValueAtTime(0.5, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now + 0.12);
  osc2.stop(now + 0.67);
}

export function startRepeatingAlarm(): void {
  if (stoppageInterval) return;
  playStoppageBellSound();
  stoppageInterval = window.setInterval(() => {
    playStoppageBellSound();
  }, 1600);
}

export function stopRepeatingAlarm(): void {
  if (stoppageInterval) {
    clearInterval(stoppageInterval);
    stoppageInterval = null;
  }
}

// Sound for adding an order / coin drop into piggy bank
export function playCoinSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(987.77, now); // B5
  osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.32);
}

// Fanfare celebration sound for shift ending / big piggy bank summary
export function playShiftFanfare(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const startTime = ctx.currentTime + idx * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.42);
  });
}

// Crisp notification chime when an order is delivered
export function playDeliverySuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const tones = [
    { freq: 783.99, delay: 0, duration: 0.2 },      // G5
    { freq: 1046.5, delay: 0.1, duration: 0.25 },   // C6
    { freq: 1318.51, delay: 0.22, duration: 0.35 }, // E6
  ];

  tones.forEach(({ freq, delay, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + delay);

    gain.gain.setValueAtTime(0.4, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + duration + 0.05);
  });
}
