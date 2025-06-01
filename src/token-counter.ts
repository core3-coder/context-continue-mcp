import { encoding_for_model } from 'tiktoken';
import { TokenUsage, BreakSuggestion } from './types.js';

export class TokenCounter {
  private encoder: any;
  private maxTokens: number;
  private warningThreshold: number;

  constructor(maxTokens = 15000, warningThreshold = 12000) {
    this.encoder = encoding_for_model('gpt-4');
    this.maxTokens = maxTokens;
    this.warningThreshold = warningThreshold;
  }

  countTokens(text: string): number {
    try {
      const tokens = this.encoder.encode(text);
      return tokens.length;
    } catch (error) {
      // Fallback to rough estimation if tiktoken fails
      return Math.ceil(text.length / 4);
    }
  }

  getUsage(currentTokens: number): TokenUsage {
    const percentage = (currentTokens / this.maxTokens) * 100;
    
    let suggestion: 'continue' | 'warn' | 'break';
    if (percentage < 60) {
      suggestion = 'continue';
    } else if (percentage < 80) {
      suggestion = 'warn';
    } else {
      suggestion = 'break';
    }

    return {
      current: currentTokens,
      limit: this.maxTokens,
      percentage: Math.round(percentage),
      suggestion,
    };
  }

  shouldSuggestBreak(currentTokens: number): BreakSuggestion | null {
    const usage = this.getUsage(currentTokens);
    
    if (usage.suggestion === 'break') {
      return {
        reason: `Approaching token limit (${usage.percentage}% used)`,
        currentTokens,
        suggestedAction: 'end_session',
        summary: 'Consider ending this session to maintain context quality',
      };
    }
    
    if (usage.suggestion === 'warn') {
      return {
        reason: `High token usage (${usage.percentage}% used)`,
        currentTokens,
        suggestedAction: 'create_checkpoint',
        summary: 'Consider creating a checkpoint or preparing to end session',
      };
    }
    
    return null;
  }
}