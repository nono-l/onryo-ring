const FLOOR = 0.018;
const CEIL = 0.22;
const VOL_MAX = 3;
const PITCH_LO = 280;
const PITCH_HI = 1800;
const PITCH_MAX = 10;
const MUL_MAX = VOL_MAX * PITCH_MAX;

let stream: MediaStream | null = null;
let analyser: AnalyserNode | null = null;
let buf: Uint8Array | null = null;
let freq: Uint8Array | null = null;
let ctx: AudioContext | null = null;
let smoothed = 1;
let wantOn = false;
let status: "off" | "pending" | "on" | "denied" = "off";

export function voiceStatus() {
  return status;
}

export function voiceMul() {
  return smoothed;
}

function rms(): number {
  if (!analyser || !buf) return 0;
  analyser.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
  let s = 0;
  for (let i = 0; i < buf.length; i++) {
    const n = ((buf[i] ?? 128) - 128) / 128;
    s += n * n;
  }
  return Math.sqrt(s / buf.length);
}

function centroidHz(): number {
  if (!analyser || !freq || !ctx) return 0;
  analyser.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
  const binHz = ctx.sampleRate / analyser.fftSize;
  let num = 0;
  let den = 0;
  for (let i = 2; i < freq.length; i++) {
    const m = freq[i] ?? 0;
    if (m < 10) continue;
    num += m * i;
    den += m;
  }
  if (den < 30) return 0;
  return (num / den) * binHz;
}

export async function startVoice(): Promise<boolean> {
  wantOn = true;
  if (status === "on" && analyser) return true;
  status = "pending";
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
      video: false,
    });
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AC({ latencyHint: "interactive" });
    if (ctx.state === "suspended") await ctx.resume();
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.35;
    src.connect(analyser);
    buf = new Uint8Array(analyser.fftSize);
    freq = new Uint8Array(analyser.frequencyBinCount);
    status = "on";
    return true;
  } catch {
    stopVoice(false);
    status = "denied";
    return false;
  }
}

export function stopVoice(clearWant = true) {
  if (clearWant) wantOn = false;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  analyser = null;
  buf = null;
  freq = null;
  smoothed = 1;
  if (clearWant) status = "off";
}

export function pollVoice(dt: number): number {
  if (!wantOn) {
    smoothed = 1;
    return 1;
  }
  if (status !== "on") return smoothed;
  const volT = Math.max(0, Math.min(1, (rms() - FLOOR) / (CEIL - FLOOR)));
  const volMul = 1 + (VOL_MAX - 1) * volT;
  let pitchMul = 1;
  if (volT > 0.12) {
    const pT = Math.max(0, Math.min(1, (centroidHz() - PITCH_LO) / (PITCH_HI - PITCH_LO)));
    pitchMul = 1 + (PITCH_MAX - 1) * pT;
  }
  const raw = Math.min(MUL_MAX, volMul * pitchMul);
  const k = raw > smoothed ? Math.min(1, dt * 16) : Math.min(1, dt * 6);
  smoothed += (raw - smoothed) * k;
  if (smoothed < 1.02) smoothed = 1;
  return Math.max(1, Math.min(MUL_MAX, smoothed));
}
