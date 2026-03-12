import { VoiceConfig } from "../types";

export async function speak(text: string, config: VoiceConfig) {
  if (!config.enabled) return;

  switch (config.provider) {
    case 'minimax':
      return speakMinimax(text, config);
    case 'openai':
      return speakOpenAI(text, config);
    case 'elevenlabs':
      return speakElevenLabs(text, config);
    case 'local':
      return speakLocal(text, config);
    case 'gemini':
    default:
      // Gemini TTS would typically be handled via the Gemini SDK, 
      // but for this generic service we'll focus on the external ones.
      console.log("Gemini TTS placeholder for:", text);
      return;
  }
}

async function speakMinimax(text: string, config: VoiceConfig) {
  if (!config.apiKey || !config.groupId) {
    console.error("Minimax API Key or Group ID is missing");
    return;
  }

  const url = `https://api.minimax.chat/v1/text_to_speech?GroupId=${config.groupId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voice_setting: {
          voice_id: config.voiceId || 'male-qn-qingxin',
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        pronunciation_dict: {
          check_written_token: true,
        },
        text: text,
      }),
    });

    if (!response.ok) throw new Error(`Minimax API error: ${response.statusText}`);
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("Minimax TTS failed:", error);
  }
}

async function speakLocal(text: string, config: VoiceConfig) {
  if (!config.endpoint) {
    console.error("Local Voice Endpoint is missing");
    return;
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice: config.voiceId,
      }),
    });

    if (!response.ok) throw new Error(`Local Voice API error: ${response.statusText}`);
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("Local TTS failed:", error);
  }
}

async function speakOpenAI(text: string, config: VoiceConfig) {
  if (!config.apiKey) return;
  
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: config.voiceId || 'alloy',
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.statusText}`);
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("OpenAI TTS failed:", error);
  }
}

async function speakElevenLabs(text: string, config: VoiceConfig) {
  if (!config.apiKey) return;
  
  const voiceId = config.voiceId || '21m00Tcm4TlvDq8ikWAM';
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) throw new Error(`ElevenLabs API error: ${response.statusText}`);
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  } catch (error) {
    console.error("ElevenLabs TTS failed:", error);
  }
}
