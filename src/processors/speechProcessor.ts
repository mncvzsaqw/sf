/**
 * Speech to Text Processor
 * In a real local environment, this could call a Whisper model.
 * Here we provide the interface and a mock/Web API implementation.
 */
export async function processSpeech(audioData: string): Promise<string> {
  // In a real implementation, audioData (base64) would be sent to a Whisper model.
  console.log('Processing speech data...', audioData.substring(0, 50) + '...');
  
  // For now, we return a placeholder or use a mock.
  // The blueprint says: "最终转换成统一的文本"
  return "[用户发送了一段语音，内容正在转换中...]";
}
