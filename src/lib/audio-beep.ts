/**
 * Plays a short 440 Hz sine beep using the Web Audio API. No audio file
 * required — works offline and adds no bundle weight.
 *
 * Browsers require the AudioContext to be created (or resumed) inside a
 * user gesture. Since this is called from a timer expiration, we attempt
 * to play but swallow any AudioContext errors silently — the auto-submit
 * still proceeds whether or not the beep makes it through.
 */
let cachedCtx: AudioContext | null = null;

export function playTimeUpBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    if (!cachedCtx) cachedCtx = new Ctx();
    const ctx = cachedCtx;

    // If the context is suspended (autoplay policy), try to resume; this
    // may silently fail when called outside a user gesture, which is fine.
    if (ctx.state === "suspended") void ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 440;

    // Quick attack, then exponential decay over ~0.5 seconds so the beep is
    // perceptible but not annoying.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.55);
  } catch {
    /* audio not available — silently skip */
  }
}
