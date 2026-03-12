export class IntimateEncryption {
  private sessionKey: string | null = null;

  async generateSessionKey(userId: string, characterId: string): Promise<string> {
    const seed = `${userId}-${characterId}-${Date.now()}-${Math.random()}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    this.sessionKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return this.sessionKey;
  }

  setSessionKey(key: string) {
    this.sessionKey = key;
  }

  private async importKey(): Promise<CryptoKey> {
    if (!this.sessionKey) throw new Error('No session key');
    
    // Ensure the key is 32 bytes for AES-256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.sessionKey.padEnd(32, '0').slice(0, 32));
    
    return await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptData(data: any): Promise<{ iv: number[], data: number[] }> {
    const key = await this.importKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }

  async decryptData(encryptedData: { iv: number[], data: number[] }): Promise<any> {
    const { iv, data } = encryptedData;
    const key = await this.importKey();
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}

export const intimateEncryption = new IntimateEncryption();
