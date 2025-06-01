import { ContextContinuationServer } from '../src/server';

// Mock the dependencies
jest.mock('../src/context-manager');
jest.mock('../src/session-tracker');
jest.mock('../src/token-counter');

import { ContextManager } from '../src/context-manager';
import { SessionTracker } from '../src/session-tracker';
import { TokenCounter } from '../src/token-counter';

describe('ContextContinuationServer', () => {
  let server: ContextContinuationServer;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockSessionTracker: jest.Mocked<SessionTracker>;
  let mockTokenCounter: jest.Mocked<TokenCounter>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mocked instances
    mockContextManager = new ContextManager() as jest.Mocked<ContextManager>;
    mockSessionTracker = new SessionTracker() as jest.Mocked<SessionTracker>;
    mockTokenCounter = new TokenCounter() as jest.Mocked<TokenCounter>;

    server = new ContextContinuationServer();

    // Replace private properties using any type
    (server as any).contextManager = mockContextManager;
    (server as any).sessionTracker = mockSessionTracker;
    (server as any).tokenCounter = mockTokenCounter;
  });

  describe('handleStartSession', () => {
    it('should start session successfully', async () => {
      const mockSession = {
        id: 'test-session-id',
        projectPath: '/test/project',
        sessionName: 'Test Session',
        startTime: new Date(),
        tokenCount: 0,
        messageCount: 0,
        status: 'active' as const
      };

      mockSessionTracker.startSession.mockResolvedValue(mockSession);

      const result = await (server as any).handleStartSession({
        projectPath: '/test/project',
        sessionName: 'Test Session'
      });

      expect(mockSessionTracker.startSession).toHaveBeenCalledWith('/test/project', 'Test Session');
      expect(result.content[0].text).toContain('Started new session');
      expect(result.content[0].text).toContain('test-session-id');
    });

    it('should throw error for missing projectPath', async () => {
      await expect((server as any).handleStartSession({}))
        .rejects.toThrow('projectPath is required');
    });
  });

  describe('handleEndSession', () => {
    it('should end session successfully', async () => {
      const mockSession = {
        id: 'test-session-id',
        projectPath: '/test/project',
        sessionName: 'Test Session',
        startTime: new Date(),
        tokenCount: 100,
        messageCount: 5,
        status: 'active' as const
      };

      mockSessionTracker.getCurrentSession.mockReturnValue(mockSession);
      mockSessionTracker.endSession.mockResolvedValue(undefined);

      const result = await (server as any).handleEndSession({
        summary: 'Session completed successfully'
      });

      expect(mockSessionTracker.endSession).toHaveBeenCalledWith('Session completed successfully');
      expect(result.content[0].text).toContain('Session ended successfully');
      expect(result.content[0].text).toContain('Total messages: 5');
      expect(result.content[0].text).toContain('Total tokens: 100');
    });

    it('should throw error if no active session', async () => {
      mockSessionTracker.getCurrentSession.mockReturnValue(null);

      await expect((server as any).handleEndSession({}))
        .rejects.toThrow('No active session to end');
    });
  });

  describe('handleTrackMessage', () => {
    it('should track message successfully', async () => {
      const mockSession = {
        id: 'test-session-id',
        projectPath: '/test/project',
        tokenCount: 50,
        messageCount: 2,
        startTime: new Date(),
        status: 'active' as const
      };

      mockTokenCounter.countTokens.mockReturnValue(25);
      mockSessionTracker.addMessage.mockImplementation(() => {
        mockSession.tokenCount += 25;
        mockSession.messageCount += 1;
      });
      mockSessionTracker.getCurrentSession.mockReturnValue(mockSession);
      mockTokenCounter.getUsage.mockReturnValue({
        current: 75,
        limit: 15000,
        percentage: 1,
        suggestion: 'continue'
      });
      mockTokenCounter.shouldSuggestBreak.mockReturnValue(null);

      const result = await (server as any).handleTrackMessage({
        message: 'Test message',
        role: 'user'
      });

      expect(mockTokenCounter.countTokens).toHaveBeenCalledWith('Test message');
      expect(mockSessionTracker.addMessage).toHaveBeenCalledWith('Test message', 'user', 25);
      expect(result.content[0].text).toContain('Message tracked (25 tokens)');
    });

    it('should include break suggestion when appropriate', async () => {
      const mockSession = {
        id: 'test-session-id',
        projectPath: '/test/project',
        tokenCount: 12000,
        messageCount: 50,
        startTime: new Date(),
        status: 'active' as const
      };

      mockTokenCounter.countTokens.mockReturnValue(100);
      mockSessionTracker.getCurrentSession.mockReturnValue(mockSession);
      mockTokenCounter.getUsage.mockReturnValue({
        current: 12100,
        limit: 15000,
        percentage: 81,
        suggestion: 'break'
      });
      mockTokenCounter.shouldSuggestBreak.mockReturnValue({
        reason: 'Approaching token limit (81% used)',
        currentTokens: 12100,
        suggestedAction: 'end_session',
        summary: 'Consider ending this session'
      });

      const result = await (server as any).handleTrackMessage({
        message: 'Test message',
        role: 'user'
      });

      expect(result.content[0].text).toContain('⚠️ Approaching token limit');
      expect(result.content[0].text).toContain('Consider ending this session');
    });

    it('should throw error for missing parameters', async () => {
      await expect((server as any).handleTrackMessage({ message: 'test' }))
        .rejects.toThrow('message and role are required');
        
      await expect((server as any).handleTrackMessage({ role: 'user' }))
        .rejects.toThrow('message and role are required');
    });
  });

  describe('handleGetStatus', () => {
    it('should return status when session active', async () => {
      const mockSession = {
        id: 'test-session-id',
        projectPath: '/test/project',
        tokenCount: 5000,
        messageCount: 20,
        startTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        status: 'active' as const
      };

      mockSessionTracker.getCurrentSession.mockReturnValue(mockSession);
      mockTokenCounter.getUsage.mockReturnValue({
        current: 5000,
        limit: 15000,
        percentage: 33,
        suggestion: 'continue'
      });
      mockTokenCounter.shouldSuggestBreak.mockReturnValue(null);

      const result = await (server as any).handleGetStatus({});

      expect(result.content[0].text).toContain('📊 Session Status');
      expect(result.content[0].text).toContain('test-session-id');
      expect(result.content[0].text).toContain('Messages: 20');
      expect(result.content[0].text).toContain('Tokens: 5000/15000');
      expect(result.content[0].text).toContain('Usage: 33%');
    });

    it('should return no session message when inactive', async () => {
      mockSessionTracker.getCurrentSession.mockReturnValue(null);

      const result = await (server as any).handleGetStatus({});

      expect(result.content[0].text).toContain('No active session');
      expect(result.content[0].text).toContain('context_start_session');
    });
  });

  describe('handleRestoreSession', () => {
    it('should generate restoration prompt', async () => {
      const mockPrompt = {
        projectName: 'Test Project',
        currentPhase: 'Development',
        lastSessionSummary: 'Last session summary',
        keyContext: ['Key point 1', 'Key point 2'],
        nextSteps: ['Step 1', 'Step 2'],
        fullPrompt: 'Complete restoration prompt...'
      };

      mockContextManager.generateRestorationPrompt.mockResolvedValue(mockPrompt);

      const result = await (server as any).handleRestoreSession({
        projectPath: '/test/project'
      });

      expect(mockContextManager.generateRestorationPrompt).toHaveBeenCalledWith('/test/project');
      expect(result.content[0].text).toBe('Complete restoration prompt...');
    });

    it('should throw error for missing projectPath', async () => {
      await expect((server as any).handleRestoreSession({}))
        .rejects.toThrow('projectPath is required');
    });
  });

  describe('handleAddMilestone', () => {
    it('should add milestone successfully', async () => {
      mockContextManager.addMilestone.mockResolvedValue(undefined);

      const result = await (server as any).handleAddMilestone({
        projectPath: '/test/project',
        title: 'Test Milestone',
        description: 'A test milestone',
        status: 'planned'
      });

      expect(mockContextManager.addMilestone).toHaveBeenCalledWith('/test/project', {
        title: 'Test Milestone',
        description: 'A test milestone',
        status: 'planned'
      });
      expect(result.content[0].text).toContain('Milestone added: Test Milestone');
    });

    it('should use default values for optional parameters', async () => {
      mockContextManager.addMilestone.mockResolvedValue(undefined);

      const result = await (server as any).handleAddMilestone({
        projectPath: '/test/project',
        title: 'Test Milestone'
      });

      expect(mockContextManager.addMilestone).toHaveBeenCalledWith('/test/project', {
        title: 'Test Milestone',
        description: '',
        status: 'planned'
      });
    });

    it('should throw error for missing required parameters', async () => {
      await expect((server as any).handleAddMilestone({ projectPath: '/test' }))
        .rejects.toThrow('projectPath and title are required');
        
      await expect((server as any).handleAddMilestone({ title: 'test' }))
        .rejects.toThrow('projectPath and title are required');
    });
  });

  describe('getTools', () => {
    it('should return all expected tools', () => {
      const tools = (server as any).getTools();

      expect(tools).toHaveLength(8);
      
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('context_start_session');
      expect(toolNames).toContain('context_end_session');
      expect(toolNames).toContain('context_track_message');
      expect(toolNames).toContain('context_get_status');
      expect(toolNames).toContain('context_restore_session');
      expect(toolNames).toContain('context_add_milestone');
      expect(toolNames).toContain('context_log_decision');
      expect(toolNames).toContain('context_get_project_summary');
    });

    it('should have proper tool schemas', () => {
      const tools = (server as any).getTools();
      
      tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });
});