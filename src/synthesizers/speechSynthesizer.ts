import { config } from '../core/config';

/**
 * Text to Speech Synthesizer
 */
export async function synthesizeSpeech(text: string, voiceName?: string): Promise<void> {
  if (!config.features.speech.tts_enable) return Promise.resolve();

  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      
      if (voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (e) => {
        console.error("SpeechSynthesis Error:", e);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser.');
      resolve();
    }
  });
}
