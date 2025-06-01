import { TokenCounter } from '../src/token-counter';

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    tokenCounter = new TokenCounter(15000, 12000);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const defaultCounter = new TokenCounter();
      expect(defaultCounter).toBeDefined();
    });

    it('should initialize with custom values', () => {
      const customCounter = new TokenCounter(10000, 8000);
      expect(customCounter).toBeDefined();
    });
  });

  describe('countTokens', () => {
    it('should count tokens for simple text', () => {
      const text = 'Hello world';
      const count = tokenCounter.countTokens(text);
      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    it('should count tokens for empty string', () => {
      const count = tokenCounter.countTokens('');
      expect(count).toBe(0);
    });

    it('should count tokens for long text', () => {
      const longText = 'This is a much longer piece of text that should have more tokens than a simple hello world message.';
      const shortText = 'Hello';
      
      const longCount = tokenCounter.countTokens(longText);
      const shortCount = tokenCounter.countTokens(shortText);
      
      expect(longCount).toBeGreaterThan(shortCount);
    });

    it('should handle special characters and code', () => {
      const codeText = `
        function example() {
          const variable = "test";
          return variable.length;
        }
      `;
      const count = tokenCounter.countTokens(codeText);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('getUsage', () => {
    it('should return correct usage for low token count', () => {
      const usage = tokenCounter.getUsage(5000); // 33% of 15000
      
      expect(usage.current).toBe(5000);
      expect(usage.limit).toBe(15000);
      expect(usage.percentage).toBe(33);
      expect(usage.suggestion).toBe('continue');
    });

    it('should return warning for medium token count', () => {
      const usage = tokenCounter.getUsage(10000); // 67% of 15000
      
      expect(usage.current).toBe(10000);
      expect(usage.limit).toBe(15000);
      expect(usage.percentage).toBe(67);
      expect(usage.suggestion).toBe('warn');
    });

    it('should return break suggestion for high token count', () => {
      const usage = tokenCounter.getUsage(13000); // 87% of 15000
      
      expect(usage.current).toBe(13000);
      expect(usage.limit).toBe(15000);
      expect(usage.percentage).toBe(87);
      expect(usage.suggestion).toBe('break');
    });

    it('should handle zero tokens', () => {
      const usage = tokenCounter.getUsage(0);
      
      expect(usage.current).toBe(0);
      expect(usage.percentage).toBe(0);
      expect(usage.suggestion).toBe('continue');
    });

    it('should handle tokens at exact thresholds', () => {
      // At 60% boundary
      const usage60 = tokenCounter.getUsage(9000); // 60% of 15000
      expect(usage60.suggestion).toBe('warn');

      // At 80% boundary  
      const usage80 = tokenCounter.getUsage(12000); // 80% of 15000
      expect(usage80.suggestion).toBe('break');
    });
  });

  describe('shouldSuggestBreak', () => {
    it('should return null for low usage', () => {
      const suggestion = tokenCounter.shouldSuggestBreak(5000);
      expect(suggestion).toBeNull();
    });

    it('should return checkpoint suggestion for warning level', () => {
      const suggestion = tokenCounter.shouldSuggestBreak(10000);
      
      expect(suggestion).not.toBeNull();
      expect(suggestion!.reason).toContain('High token usage');
      expect(suggestion!.suggestedAction).toBe('create_checkpoint');
      expect(suggestion!.currentTokens).toBe(10000);
      expect(suggestion!.summary).toContain('checkpoint');
    });

    it('should return end session suggestion for break level', () => {
      const suggestion = tokenCounter.shouldSuggestBreak(13000);
      
      expect(suggestion).not.toBeNull();
      expect(suggestion!.reason).toContain('Approaching token limit');
      expect(suggestion!.suggestedAction).toBe('end_session');
      expect(suggestion!.currentTokens).toBe(13000);
      expect(suggestion!.summary).toContain('end');
    });

    it('should handle edge cases at boundaries', () => {
      // Just under warning threshold
      const underWarning = tokenCounter.shouldSuggestBreak(8999);
      expect(underWarning).toBeNull();

      // Just at warning threshold
      const atWarning = tokenCounter.shouldSuggestBreak(9000);
      expect(atWarning).not.toBeNull();
      expect(atWarning!.suggestedAction).toBe('create_checkpoint');

      // Just at break threshold
      const atBreak = tokenCounter.shouldSuggestBreak(12000);
      expect(atBreak).not.toBeNull();
      expect(atBreak!.suggestedAction).toBe('end_session');
    });
  });

  describe('token counting accuracy', () => {
    it('should provide reasonable token estimates', () => {
      const samples = [
        { text: 'Hello', expectedRange: [1, 3] },
        { text: 'Hello world!', expectedRange: [2, 5] },
        { text: 'The quick brown fox jumps over the lazy dog', expectedRange: [8, 15] },
      ];

      samples.forEach(({ text, expectedRange }) => {
        const count = tokenCounter.countTokens(text);
        expect(count).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(count).toBeLessThanOrEqual(expectedRange[1]);
      });
    });

    it('should handle fallback estimation gracefully', () => {
      // Test with text that might cause tiktoken issues
      const problematicText = '\x00\x01\x02\x03';
      const count = tokenCounter.countTokens(problematicText);
      
      // Should fallback to length/4 estimation if tiktoken fails
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});