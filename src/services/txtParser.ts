import { Memory } from "../types";

export interface ParseResult {
  format: 'dialogue' | 'timeline' | 'list' | 'narrative' | 'mixed';
  memories: Array<{
    content: string;
    speaker?: 'user' | 'ai';
    timestamp?: string;
    confidence: number;
    suggestedTags: string[];
    suggestedType: Memory['type'];
    originalText: string;
  }>;
  stats: {
    totalItems: number;
    userLines: number;
    aiLines: number;
    dateReferences: number;
  };
}

export class TXTParser {
  detectFormat(text: string, roleName?: string, userNickname?: string): ParseResult['format'] {
    const lines = text.split('\n').filter(line => line.trim()).slice(0, 100); // Check first 100 lines
    if (lines.length === 0) return 'narrative';

    const escapedRoleName = roleName ? roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const escapedUserNickname = userNickname ? userNickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    
    // Support optional timestamp at the beginning: [2024-01-01 12:00:00], 2024/1/1 12:00:00, or 12:00:00
    const timestampPattern = '([\\[(]?(?:\\d{1,4}[-/\\.\\s:]\\d{1,2}[-/\\.\\s:]\\d{1,2}.*?|\\d{1,2}:\\d{1,2}(?::\\d{1,2})?.*?)[\\])]?\\s*)?';
    const dialoguePattern = new RegExp(`^${timestampPattern}(${escapedRoleName}|${escapedUserNickname}|用户|我|user|User|AI|aether|Aether|角色)[：:]\\s*.+`, 'i');
    
    const dialogueLines = lines.filter(line => dialoguePattern.test(line)).length;
    if (dialogueLines > lines.length * 0.05 || dialogueLines >= 3) {
      return 'dialogue';
    }

    const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
    if (lines.some(line => datePattern.test(line))) {
      return 'timeline';
    }

    const listPattern = /^[-•*]\s+.+/;
    if (lines.filter(line => listPattern.test(line)).length > lines.length * 0.3) {
      return 'list';
    }

    return 'narrative';
  }

  async parseText(text: string, roleName: string, userNickname?: string): Promise<ParseResult> {
    const format = this.detectFormat(text, roleName, userNickname);
    let rawMemories: any[] = [];

    switch (format) {
      case 'dialogue':
        rawMemories = this.parseDialogueFormat(text, roleName, userNickname);
        break;
      case 'timeline':
        rawMemories = this.parseTimelineFormat(text);
        break;
      case 'list':
        rawMemories = this.parseListFormat(text);
        break;
      default:
        rawMemories = this.parseNarrativeFormat(text);
    }

    const memories = rawMemories.map(m => ({
      ...m,
      suggestedTags: this.extractTagsByRules(m.content),
      suggestedType: this.guessMemoryType(m.content),
    }));

    return {
      format,
      memories,
      stats: this.calculateStats(memories)
    };
  }

  private parseDialogueFormat(text: string, roleName: string, userNickname?: string) {
    const lines = text.split('\n');
    const memories = [];
    let currentSpeaker = '';
    let currentContent = '';
    let currentTimestamp = '';

    const escapedRoleName = roleName ? roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const escapedUserNickname = userNickname ? userNickname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const timestampPattern = '([\\[(]?(?:\\d{1,4}[-/\\.\\s:]\\d{1,2}[-/\\.\\s:]\\d{1,2}.*?|\\d{1,2}:\\d{1,2}(?::\\d{1,2})?.*?)[\\])]?\\s*)?';
    const speakerRegex = new RegExp(`^${timestampPattern}(用户|我|user|User|AI|aether|Aether|角色|${escapedRoleName}${escapedUserNickname ? '|' + escapedUserNickname : ''})[：:]\\s*(.*)`, 'i');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(speakerRegex);
      if (match) {
        if (currentContent) {
          memories.push({
            content: currentContent.trim(),
            speaker: this.normalizeSpeaker(currentSpeaker, roleName, userNickname),
            timestamp: currentTimestamp,
            originalText: `${currentTimestamp ? '[' + currentTimestamp + '] ' : ''}${currentSpeaker}: ${currentContent.trim()}`,
            confidence: 0.9
          });
        }
        currentTimestamp = (match[1] || '').trim().replace(/[\[\]()]/g, '');
        currentSpeaker = match[2];
        currentContent = match[3] || '';
      } else if (currentSpeaker) {
        currentContent += '\n' + trimmed;
      }
    }

    if (currentContent) {
      memories.push({
        content: currentContent.trim(),
        speaker: this.normalizeSpeaker(currentSpeaker, roleName, userNickname),
        timestamp: currentTimestamp,
        originalText: `${currentTimestamp ? '[' + currentTimestamp + '] ' : ''}${currentSpeaker}: ${currentContent.trim()}`,
        confidence: 0.9
      });
    }

    return memories;
  }

  private parseTimelineFormat(text: string) {
    const lines = text.split('\n');
    const memories = [];
    let currentDate = '';
    let currentContent = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const dateMatch = trimmed.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(.*)/);
      if (dateMatch) {
        if (currentContent) {
          memories.push({
            content: currentContent.trim(),
            timestamp: currentDate,
            originalText: `${currentDate} ${currentContent.trim()}`,
            confidence: 0.85
          });
        }
        currentDate = dateMatch[1];
        currentContent = dateMatch[2];
      } else if (currentDate) {
        currentContent += ' ' + trimmed;
      }
    }

    if (currentContent) {
      memories.push({
        content: currentContent.trim(),
        timestamp: currentDate,
        originalText: `${currentDate} ${currentContent.trim()}`,
        confidence: 0.85
      });
    }

    return memories;
  }

  private parseListFormat(text: string) {
    return text.split('\n')
      .filter(line => /^[-•*]\s+.+/.test(line.trim()))
      .map(line => {
        const content = line.trim().replace(/^[-•*]\s+/, '');
        return {
          content,
          originalText: line.trim(),
          confidence: 0.8
        };
      });
  }

  private parseNarrativeFormat(text: string) {
    // Split by paragraphs
    return text.split(/\n\s*\n/)
      .filter(p => p.trim().length > 10)
      .map(p => ({
        content: p.trim(),
        originalText: p.trim(),
        confidence: 0.7
      }));
  }

  private normalizeSpeaker(speaker: string, roleName: string, userNickname?: string): 'user' | 'ai' {
    const userTerms = ['用户', '我', 'user'];
    if (userNickname) userTerms.push(userNickname);
    
    if (userTerms.some(t => speaker.toLowerCase().includes(t.toLowerCase()))) {
      return 'user';
    }
    return 'ai';
  }

  private extractTagsByRules(text: string): string[] {
    const tags = new Set<string>();
    const lowerText = text.toLowerCase();
    
    const emotionalWords: Record<string, string[]> = {
      'Happy': ['高兴', '快乐', '开心', '喜欢', '爱', '美好'],
      'Sad': ['伤心', '难过', '哭', '失望', '生气'],
      'Important': ['重要', '关键', '必须', '一定要', '承诺']
    };
    
    Object.entries(emotionalWords).forEach(([tag, words]) => {
      if (words.some(word => lowerText.includes(word))) {
        tags.add(tag);
      }
    });
    
    const themes = [
      { tag: 'Food', regex: /吃|食物|餐厅|做饭|美食/ },
      { tag: 'Travel', regex: /旅行|旅游|景点|机票|酒店/ },
      { tag: 'Work', regex: /工作|公司|同事|项目|会议/ },
      { tag: 'Health', regex: /健康|医院|医生|生病|锻炼/ }
    ];
    
    themes.forEach(({ tag, regex }) => {
      if (regex.test(lowerText)) tags.add(tag);
    });
    
    return Array.from(tags);
  }

  private guessMemoryType(text: string): Memory['type'] {
    const lowerText = text.toLowerCase();
    if (/(永远|一直|承诺|誓言|爱|恨|分手|结婚)/.test(lowerText)) return 'core';
    if (/(亲密|抱|吻|爱抚|私密)/.test(lowerText)) return 'intimate';
    if (/(今天|昨天|刚才|那时|一起)/.test(lowerText)) return 'scene';
    return 'connection';
  }

  private calculateStats(memories: any[]): ParseResult['stats'] {
    return {
      totalItems: memories.length,
      userLines: memories.filter(m => m.speaker === 'user').length,
      aiLines: memories.filter(m => m.speaker === 'ai').length,
      dateReferences: memories.filter(m => m.timestamp).length,
    };
  }
}
