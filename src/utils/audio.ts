let globalAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return globalAudioCtx;
};

// Global handlers to automatically unlock AudioContext on first user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('AudioContext unlocked successfully via user gesture.');
          cleanup();
        });
      } else {
        cleanup();
      }
    } catch (e) {
      console.error('Failed to unlock AudioContext:', e);
    }
  };

  const cleanup = () => {
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}

export const playNotificationSound = () => {
  try {
    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') {
      console.warn('AudioContext is suspended (browser autoplay restriction). Sound will play after first user interaction.');
      return;
    }
    
    // Create oscillator and gain node
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    // Synthesize a digital bell/chime (D5 to A5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
    
    // Gain curve: initial volume 0.4, drop to 0.001 exponentially over exactly 1.0 second
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1.0);
  } catch (error) {
    console.error('Failed to play synthesized notification sound:', error);
  }
};
