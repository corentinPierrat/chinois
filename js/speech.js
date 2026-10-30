export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export function speak(text) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const voice = synth.getVoices().find((v) => /^zh([-_]CN)?/i.test(v.lang) && /zh[-_]CN/i.test(v.lang)) ||
    synth.getVoices().find((v) => /^zh/i.test(v.lang));
  if (voice) u.voice = voice;
  u.lang = "zh-CN";
  u.rate = 0.8;
  synth.cancel();
  synth.speak(u);
}
