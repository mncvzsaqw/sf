import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Character, Message, GlobalModelConfig } from "../types";
import { synthesizeSpeech } from "../synthesizers/speechSynthesizer";
import { withRetry } from "./apiUtils";

export class LiveVoiceSession {
  private ai: any;
  private session: any;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private onStatusChange: (status: 'connecting' | 'active' | 'error' | 'thinking') => void;
  private onVolumeChange: (volume: number) => void;
  private onAISpeakingChange?: (isSpeaking: boolean) => void;
  private onUserSpeakingChange?: (isSpeaking: boolean) => void;
  private isStandardMode = false;
  private _isAISpeaking = false;
  private _isUserSpeaking = false;
  private recognition: any = null;
  private character: Character | null = null;
  private lastProcessedTime = 0;
  private silenceTimer: any = null;
  private currentTranscript = '';
  private isRecognitionRunning = false;
  private noiseStartTime = 0;
  private noiseCheckInterval: any = null;
  private isStarting = false;
  private isStopping = false;
  private globalModelConfig?: GlobalModelConfig;

  constructor(
    onStatusChange: (status: 'connecting' | 'active' | 'error' | 'thinking') => void,
    onVolumeChange: (volume: number) => void,
    onAISpeakingChange?: (isSpeaking: boolean) => void,
    onUserSpeakingChange?: (isSpeaking: boolean) => void,
    globalModelConfig?: GlobalModelConfig
  ) {
    this.onStatusChange = onStatusChange;
    this.onVolumeChange = onVolumeChange;
    this.onAISpeakingChange = onAISpeakingChange;
    this.onUserSpeakingChange = onUserSpeakingChange;
    this.globalModelConfig = globalModelConfig;
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  private set isAISpeaking(val: boolean) {
    if (this._isAISpeaking !== val) {
      this._isAISpeaking = val;
      if (this.onAISpeakingChange) this.onAISpeakingChange(val);
    }
  }

  private get isAISpeaking() {
    return this._isAISpeaking;
  }

  private set isUserSpeaking(val: boolean) {
    if (this._isUserSpeaking !== val) {
      this._isUserSpeaking = val;
      if (this.onUserSpeakingChange) this.onUserSpeakingChange(val);
    }
  }

  private get isUserSpeaking() {
    return this._isUserSpeaking;
  }

  async start(character: Character) {
    if (this.isStarting) return;
    this.isStarting = true;
    this.isStopping = false;
    this.character = character;
    this.lastProcessedTime = 0;
    this.isAISpeaking = false;
    this.isUserSpeaking = false;
    this.isStandardMode = false;

    const voiceConfig = character.config.voiceSystem || { callMode: 'standard' };
    
    try {
      if (voiceConfig.callMode === 'live') {
        await this.startGeminiLive(character);
      } else {
        await this.startStandardSession(character);
      }
    } finally {
      this.isStarting = false;
    }
  }

  private async startGeminiLive(character: Character) {
    const voiceConfig = this.globalModelConfig?.voice || character.config.voiceSystem || {
      model: { provider: 'gemini', modelName: 'gemini-2.5-flash-native-audio-preview-09-2025' },
      tts: { provider: 'gemini', voiceId: 'Zephyr', enabled: true }
    };
    let connectionTimeout: any;
    
    try {
      this.onStatusChange('connecting');
      
      if (!this.stream) {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (this.isStopping) {
        this.cleanupAfterStart();
        return;
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log("Connecting to Gemini Live API...");
      
      const sessionPromise = withRetry(() => this.ai.live.connect({
        model: voiceConfig.model?.modelName || "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceConfig.tts?.voiceId || "Zephyr" } },
          },
          systemInstruction: `You are ${character.name}. 
          Personality: ${character.persona.personalityType}. 
          Background: ${character.persona.backgroundStory}.
          Speech Style: ${character.persona.speechStyle}.
          Keep your responses concise and natural for a voice conversation.`,
        },
        callbacks: {
          onopen: () => {
            console.log("Live API connection opened.");
            clearTimeout(connectionTimeout);
            this.onStatusChange('active');
            this.setupAudioInput(sessionPromise);
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleServerMessage(message);
          },
          onclose: () => {
            console.log("Live API connection closed.");
            this.stop();
          },
          onerror: (error: any) => {
            console.error("Live API Error Callback:", error);
            clearTimeout(connectionTimeout);
            this.onStatusChange('error');
          }
        }
      }));

      connectionTimeout = setTimeout(() => {
        if (!this.session) {
           console.warn("Live API connection timed out.");
           this.onStatusChange('error');
        }
      }, 8000);

      this.session = await sessionPromise;
    } catch (error: any) {
      console.error("Failed to start live session:", error);
      clearTimeout(connectionTimeout);
      this.onStatusChange('error');
    }
  }

  private cleanupAfterStart() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private async startStandardSession(character: Character) {
    const voiceConfig = character.config.voiceSystem || {
      model: { provider: 'gemini', modelName: 'gemini-3-flash-preview' },
      tts: { provider: 'gemini', voiceId: 'Zephyr', enabled: true }
    };
    console.log(`Starting standard voice session`);
    this.isStandardMode = true;
    this.onStatusChange('active');
    
    if (!this.stream) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        this.onStatusChange('error');
        return;
      }
    }

    if (this.isStopping) {
      this.cleanupAfterStart();
      return;
    }
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    this.setupVolumeOnlyInput();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported.");
      this.onStatusChange('error');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';

    this.recognition.onstart = () => {
      this.isRecognitionRunning = true;
      console.log("Speech recognition started");
    };

    this.recognition.onresult = async (event: any) => {
      if (this.isAISpeaking || this.isMuted) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      this.currentTranscript = (finalTranscript || interimTranscript || this.currentTranscript).trim();
      
      // Reset silence timer whenever user speaks
      if (this.currentTranscript) {
        this.resetSilenceTimer();
      }

      if (finalTranscript.trim()) {
        const text = finalTranscript.trim();
        const now = Date.now();
        if (now - this.lastProcessedTime > 800) {
          this.lastProcessedTime = now;
          this.processUserInput(text);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      if (event.error === 'not-allowed') {
        this.onStatusChange('error');
      }
    };

    this.recognition.onend = () => {
      this.isRecognitionRunning = false;
      console.log("Speech recognition ended");
      if (this.isStandardMode && this.recognition && !this.isAISpeaking) {
        setTimeout(() => {
          this.startRecognition();
        }, 300);
      }
    };

    this.startRecognition();
    this.startNoiseCheck();
  }

  private startNoiseCheck() {
    if (this.noiseCheckInterval) clearInterval(this.noiseCheckInterval);
    this.noiseCheckInterval = setInterval(() => {
      if (this.isUserSpeaking && !this.isAISpeaking && !this.currentTranscript) {
        if (this.noiseStartTime === 0) {
          this.noiseStartTime = Date.now();
        } else if (Date.now() - this.noiseStartTime > 5000) {
          // User has been making noise for 5 seconds but no text recognized
          console.log("Continuous noise detected but no text, restarting recognition...");
          this.noiseStartTime = 0;
          this.restartRecognition();
        }
      } else {
        this.noiseStartTime = 0;
      }
    }, 1000);
  }

  private restartRecognition() {
    if (this.recognition) {
      try {
        this.recognition.stop();
        // onend will trigger restart
      } catch (e) {}
    }
  }

  private startRecognition() {
    if (this.recognition && !this.isRecognitionRunning) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
      }
    }
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.isUserSpeaking = false;
      if (this.currentTranscript && !this.isAISpeaking) {
        console.log("Silence detected, forcing process:", this.currentTranscript);
        this.processUserInput(this.currentTranscript);
      }
    }, 1800); // Increased to 1.8 seconds for more natural pauses
  }

  private async processUserInput(text: string) {
    if (!text || this.isAISpeaking) return;
    this.currentTranscript = '';
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    await this.handleStandardResponse(text);
  }

  forceProcess() {
    if (this.isAISpeaking) return;
    
    // If we have some transcript, use it
    if (this.currentTranscript) {
      console.log("Forcing process with transcript:", this.currentTranscript);
      this.processUserInput(this.currentTranscript);
    } else {
      // If no transcript but user was speaking, try to get anything from recognition
      console.log("Forcing process without transcript, checking recognition...");
      if (this.recognition) {
        try {
          this.recognition.stop(); // This should trigger onresult or onend
          // We'll give it a tiny bit of time to see if a result pops out
          setTimeout(() => {
            if (!this.isAISpeaking) {
               this.processUserInput("..."); // Fallback if still nothing
            }
          }, 500);
        } catch(e) {}
      }
    }
  }

  private async handleStandardResponse(userInput: string) {
    if (!this.character || this.isAISpeaking) return;
    const voiceSystem = this.globalModelConfig?.voice || this.character.config.voiceSystem || {
      model: { provider: 'gemini', modelName: 'gemini-3-flash-preview' },
      tts: { provider: 'gemini', voiceId: 'Zephyr', enabled: true }
    };
    const modelConfig = voiceSystem.model || { provider: 'gemini', modelName: 'gemini-3-flash-preview' };
    const ttsConfig = voiceSystem.tts || { provider: 'gemini', voiceId: 'Zephyr', enabled: true };

    try {
      this.isAISpeaking = true;
      this.onStatusChange('thinking');
      
      if (this.recognition) {
        try { this.recognition.stop(); } catch(e) {}
      }

      let responseText = "";

      if (modelConfig.provider === 'openai' || modelConfig.provider === 'local' || modelConfig.provider === 'ollama') {
        const endpoint = modelConfig.endpoint || (modelConfig.provider === 'ollama' ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
        const apiKey = modelConfig.apiKey || "";
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelConfig.modelName,
            messages: [
              { role: 'system', content: `You are ${this.character.name}. Personality: ${this.character.persona.personalityType}. Speech Style: ${this.character.persona.speechStyle}. Respond concisely (1-2 sentences max).` },
              { role: 'user', content: userInput }
            ],
            temperature: modelConfig.temperature || 0.7,
            max_tokens: 150
          })
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const data = await response.json();
        responseText = data.choices?.[0]?.message?.content || "";
      } else {
        // Default to Gemini
        const response = await withRetry(() => this.ai.models.generateContent({
          model: modelConfig.modelName || "gemini-3-flash-preview",
          contents: `System: You are in a voice call. Respond to the user's input extremely concisely (max 15 words). User: ${userInput}`
        })) as any;
        responseText = response.text;
      }

      if (responseText) {
        console.log("AI response:", responseText);
        this.onStatusChange('active');
        
        if (ttsConfig.provider === 'gemini' || ttsConfig.provider === 'local') {
          // Use browser TTS for local or gemini fallback
          await synthesizeSpeech(responseText, ttsConfig.voiceId);
        } else if (ttsConfig.provider === 'openai' && ttsConfig.apiKey) {
          // Use OpenAI TTS if configured
          await this.playOpenAITTS(responseText, ttsConfig);
        } else {
          // Fallback to browser TTS
          await synthesizeSpeech(responseText, ttsConfig.voiceId);
        }
      }
    } catch (error) {
      console.error("Standard response failed:", error);
      this.onStatusChange('error');
    } finally {
      this.isAISpeaking = false;
      if (this.isStandardMode && this.recognition) {
        setTimeout(() => {
          try {
            if (this.isStandardMode && this.recognition && !this.isAISpeaking) {
              this.recognition.start();
            }
          } catch(e) {}
        }, 500);
      }
    }
  }

  private async playOpenAITTS(text: string, config: any) {
    try {
      const response = await fetch(config.endpoint || 'https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: config.voiceId || 'alloy'
        })
      });

      if (!response.ok) throw new Error("TTS API failed");
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(true);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };
        audio.play();
      });
    } catch (e) {
      console.error("OpenAI TTS failed, falling back to browser:", e);
      await synthesizeSpeech(text);
    }
  }

  private setupVolumeOnlyInput() {
    if (!this.audioContext || !this.stream) return;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const volume = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(volume);
      
      // Use a slightly higher threshold and a small smoothing/debounce
      const isLoud = volume > 0.06;
      if (isLoud && !this.isAISpeaking && !this.isMuted) {
        this.isUserSpeaking = true;
        this.resetSilenceTimer();
      } else if (!isLoud) {
        // We don't immediately set isUserSpeaking to false to avoid flickering
        // The silence timer will handle the transition
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private isMuted = false;

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  private setupAudioInput(sessionPromise: Promise<any>) {
    if (!this.audioContext || !this.stream) return;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for UI
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const volume = Math.sqrt(sum / inputData.length);
      this.onVolumeChange(volume);
      
      const isLoud = volume > 0.06;
      if (isLoud && !this.isAISpeaking && !this.isMuted) {
        this.isUserSpeaking = true;
      } else if (!isLoud) {
        this.isUserSpeaking = false;
      }

      if (this.isMuted) return;

      // Convert to PCM16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
      }

      const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
      
      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private currentSource: AudioBufferSourceNode | null = null;

  private handleServerMessage(message: LiveServerMessage) {
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          const binaryString = atob(part.inlineData.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const pcm16 = new Int16Array(bytes.buffer);
          this.audioQueue.push(pcm16);
          if (!this.isPlaying) {
            this.playNextChunk();
          }
        }
      }
    }

    if (message.serverContent?.interrupted) {
      this.audioQueue = [];
      this.isPlaying = false;
      this.isAISpeaking = false;
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      this.isAISpeaking = false;
      return;
    }

    this.isPlaying = true;
    this.isAISpeaking = true;
    const pcm16 = this.audioQueue.shift()!;
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 0x7FFF;
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000); 
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    this.currentSource = source;
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
        this.playNextChunk();
      }
    };
    source.start();
  }

  interrupt() {
    console.log("Interrupting speech...");
    if (this.isStandardMode) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.isAISpeaking = false;
      // Restart recognition if it was stopped
      if (this.recognition) {
        try { this.recognition.start(); } catch(e) {}
      }
    } else {
      this.audioQueue = [];
      this.isPlaying = false;
      this.isAISpeaking = false;
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      // Send interrupt to server if session exists
      if (this.session) {
        // The SDK might not have a direct interrupt method, 
        // but clearing local state and stopping playback is the primary way.
      }
    }
  }

  stop() {
    this.isStopping = true;
    if (this.noiseCheckInterval) {
      clearInterval(this.noiseCheckInterval);
      this.noiseCheckInterval = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.onStatusChange('connecting');
  }
}
