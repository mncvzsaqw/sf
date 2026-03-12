import { config } from '../core/config';
import { processSpeech } from './speechProcessor';
import { processVision } from './visionProcessor';
import { GlobalModelConfig } from '../types';

export type InputType = 'text' | 'speech' | 'image';

export interface InputItem {
  type: InputType;
  data: string; // text content or base64 data
  mimeType?: string;
}

export async function routeInput(input: InputItem, globalModelConfig?: GlobalModelConfig): Promise<string> {
  switch (input.type) {
    case 'speech':
      if (config.features.speech.enable) {
        return await processSpeech(input.data);
      }
      return '[语音输入已禁用]';
    case 'image':
      if (config.features.vision.enable) {
        return await processVision(input.data, input.mimeType || 'image/jpeg', globalModelConfig);
      }
      return '[图片输入已禁用]';
    case 'text':
    default:
      return input.data;
  }
}
