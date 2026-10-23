// Keyboard-wedge barcode scanner detector — Item 21
// USB/Bluetooth scanners emit chars fast (<50ms gap) then Enter.
// Distinguishes scanner input from human typing.

export interface ScannerDetectorOptions {
  maxGapMs?: number;      // max gap between chars (default 50)
  minLength?: number;     // min chars to consider a scan (default 4)
  bufferTimeoutMs?: number; // reset if no char for this long (default 200)
}

export function createScannerDetector(opts: ScannerDetectorOptions = {}) {
  const maxGapMs = opts.maxGapMs ?? 50;
  const minLength = opts.minLength ?? 4;
  const bufferTimeoutMs = opts.bufferTimeoutMs ?? 200;

  let buffer = '';
  let lastTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reset = () => {
    buffer = '';
    lastTime = 0;
    if (timer) { clearTimeout(timer); timer = null; }
  };

  return {
    /**
     * Feed a keydown event. Returns the barcode string if a complete
     * scanner-like sequence ended (Enter). Otherwise returns null.
     */
    handleKey(e: KeyboardEvent): string | null {
      const now = Date.now();

      // Ignore modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return null;

      // Enter = potential terminator
      if (e.key === 'Enter') {
        const code = buffer.trim();
        const isScan = code.length >= minLength;
        reset();
        return isScan ? code : null;
      }

      // Regular char
      const char = e.key.length === 1 ? e.key : '';
      if (!char) {
        reset();
        return null;
      }

      const gap = now - lastTime;
      if (gap > maxGapMs && buffer.length > 0) {
        // too slow — human typing, restart buffer
        buffer = char;
      } else {
        buffer += char;
      }
      lastTime = now;

      // Auto-reset if gap grows too large
      if (timer) clearTimeout(timer);
      timer = setTimeout(reset, bufferTimeoutMs);

      return null;
    },

    reset,
  };
}

/**
 * Simple beep using Web Audio API. No audio file needed.
 */
export function playBeep(opts?: { freq?: number; durationMs?: number; volume?: number }) {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = (window.AudioContext || (window as any as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = opts?.freq ?? 1200;
    gain.gain.value = opts?.volume ?? 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => undefined);
    }, opts?.durationMs ?? 80);
  } catch {
    /* silent fail */
  }
}

export const SCANNER_EVENT = 'tshastho:barcode-scanned';
