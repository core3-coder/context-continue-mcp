import { ContextContinuationServer } from '../src/server';

// Mock the dependencies
jest.mock('../src/context-manager');
jest.mock('../src/session-tracker');
jest.mock('../src/token-counter');

import { ContextManager } from '../src/context-manager';
import { SessionTracker } from '../src/session-tracker';
import { TokenCounter } from '../src/token-counter';

describe('ContextContinuationServer - Tool Handlers', () => {
  let server: ContextContinuationServer;
  let mockContextManager: jest.Mocked<ContextManager>;
  let mockSessionTracker: jest.Mocked<SessionTracker>;
  let mockTokenCounter: jest.Mocked<TokenCounter>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContextManager = new ContextManager() as jest.Mocked<ContextManager>;
    mockSessionTracker = new SessionTracker() as jest.Mocked<SessionTracker>;
    mockTokenCounter = new TokenCounter() as jest.Mocked<TokenCounter>;

    server = new ContextContinuationServer();

    // Replace private properties
    (server as any).contextManager = mockContextManager;
    (server as any).sessionTracker = mockSessionTracker;
    (server as any).tokenCounter = mockTokenCounter;
  });

  describe('handleLogDecision', () => {
    beforeEach(() => {
      mockContextManager.logDecision.mockResolvedValue(undefined);
    });

    it('should log decision successfully with all parameters', async () => {
      const args = {
        projectPath: '/test/project',
        title: 'Use TypeScript',
        context: 'Need type safety',
        decision: 'Adopt TypeScript for the project',
        alternatives: ['JavaScript', 'Flow'],
        consequences: ['Learning curve', 'Better tooling'],
        status: 'accepted'
      };

      const result = await (server as any).handleLogDecision(args);

      expect(mockContextManager.logDecision).toHaveBeenCalledWith('/test/project', {
        title: 'Use TypeScript',
        context: 'Need type safety',
        decision: 'Adopt TypeScript for the project',
        alternatives: ['JavaScript', 'Flow'],
        consequences: ['Learning curve', 'Better tooling'],
        status: 'accepted'
      });

      expect(result.content[0].text).toContain('Decision logged: Use TypeScript');
      expect(result.content[0].text).toContain('Status: accepted');
    });

    it('should use default values for optional parameters', async () => {
      const args = {
        projectPath: '/test/project',
        title: 'Simple Decision',
        decision: 'Go with option A'
      };

      await (server as any).handleLogDecision(args);

      expect(mockContextManager.logDecision).toHaveBeenCalledWith('/test/project', {
        title: 'Simple Decision',
        context: '',
        decision: 'Go with option A',
        alternatives: [],
        consequences: [],
        status: 'accepted'
      });
    });

    it('should throw error for missing required parameters', async () => {
      await expect((server as any).handleLogDecision({ projectPath: '/test' }))
        .rejects.toThrow('projectPath, title, and decision are required');
        
      await expect((server as any).handleLogDecision({ title: 'test' }))
        .rejects.toThrow('projectPath, title, and decision are required');
        
      await expect((server as any).handleLogDecision({ projectPath: '/test', title: 'test' }))
        .rejects.toThrow('projectPath, title, and decision are required');
    });
  });

  describe('handleGetProjectSummary', () => {
    beforeEach(() => {
      mockContextManager.getProjectSummary.mockResolvedValue({
        name: 'Test Project',
        path: '/test/project',
        totalSessions: 5,
        totalTokens: 10000,
        lastActivity: new Date('2025-06-01T10:00:00Z'),
        currentPhase: 'Development',
        keyMilestones: [
          {
            id: '1',
            title: 'Setup complete',
            description: 'Initial project setup finished',
            status: 'completed',
            createdAt: new Date('2025-05-01T10:00:00Z')
          },
          {
            id: '2', 
            title: 'Core features implemented',
            description: 'Main functionality complete',
            status: 'in-progress',
            createdAt: new Date('2025-05-15T10:00:00Z')
          }
        ]
      });
    });

    it('should return project summary successfully', async () => {
      const result = await (server as any).handleGetProjectSummary({
        projectPath: '/test/project'
      });

      expect(mockContextManager.getProjectSummary).toHaveBeenCalledWith('/test/project');
      expect(result.content[0].text).toContain('📋 Project Summary: Test Project');
      expect(result.content[0].text).toContain('Total Sessions: 5');
      expect(result.content[0].text).toContain('Setup complete');
      expect(result.content[0].text).toContain('Core features implemented');
    });

    it('should throw error for missing projectPath', async () => {
      await expect((server as any).handleGetProjectSummary({}))
        .rejects.toThrow('projectPath is required');
    });
  });

  describe('handleToolCall - Router', () => {
    it('should route to correct handler based on tool name', async () => {
      const mockSession = {
        id: 'test-id',
        projectPath: '/test',
        sessionName: 'Test',
        startTime: new Date(),
        tokenCount: 0,
        messageCount: 0,
        status: 'active' as const
      };

      mockSessionTracker.startSession.mockResolvedValue(mockSession);
      
      const result = await (server as any).handleToolCall('context_start_session', {
        projectPath: '/test',
        sessionName: 'Test Session'
      });

      expect(result.content[0].text).toContain('Started new session');
    });

    it('should throw error for unknown tool', async () => {
      await expect((server as any).handleToolCall('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle errors in tool execution', async () => {
      mockSessionTracker.startSession.mockRejectedValue(new Error('Session start failed'));

      await expect((server as any).handleToolCall('context_start_session', {
        projectPath: '/test'
      })).rejects.toThrow('Session start failed');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null/undefined arguments gracefully', async () => {
      await expect((server as any).handleStartSession(null))
        .rejects.toThrow();
        
      await expect((server as any).handleStartSession(undefined))
        .rejects.toThrow();
    });

    it('should handle empty string arguments', async () => {
      await expect((server as any).handleStartSession({ projectPath: '' }))
        .rejects.toThrow('projectPath is required');
    });

    it('should validate argument types', async () => {
      await expect((server as any).handleTrackMessage({ message: 123, role: 'user' }))
        .rejects.toThrow();
    });
  });

  describe('getTools method', () => {
    it('should return tools with proper schema validation', () => {
      const tools = (server as any).getTools();

      tools.forEach((tool: any) => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        
        // Validate required fields are arrays
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      });
    });

    it('should include all expected tools', () => {
      const tools = (server as any).getTools();
      const toolNames = tools.map((tool: any) => tool.name);

      const expectedTools = [
        'context_start_session',
        'context_end_session', 
        'context_track_message',
        'context_get_status',
        'context_restore_session',
        'context_add_milestone',
        'context_log_decision',
        'context_get_project_summary'
      ];

      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool);
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle rapid successive calls', async () => {
      const mockSession = {
        id: 'rapid-test',
        projectPath: '/test',
        sessionName: 'Rapid Test',
        startTime: new Date(),
        tokenCount: 0,
        messageCount: 0,
        status: 'active' as const
      };

      mockSessionTracker.startSession.mockResolvedValue(mockSession);
      mockSessionTracker.getCurrentSession.mockReturnValue(mockSession);
      mockTokenCounter.countTokens.mockReturnValue(10);
      mockTokenCounter.getUsage.mockReturnValue({
        current: 10,
        limit: 15000,
        percentage: 1,
        suggestion: 'continue'
      });
      mockTokenCounter.shouldSuggestBreak.mockReturnValue(null);

      // Start session then immediately track messages
      await (server as any).handleStartSession({
        projectPath: '/test',
        sessionName: 'Rapid Test'
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push((server as any).handleTrackMessage({
          message: `Message ${i}`,
          role: 'user'
        }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.content[0].text).toContain('Message tracked');
      });
    });

    it('should handle milestone operations on project with existing milestones', async () => {
      mockContextManager.addMilestone.mockResolvedValue(undefined);

      const result = await (server as any).handleAddMilestone({
        projectPath: '/existing/project',
        title: 'Additional Milestone',
        description: 'Building on previous work',
        status: 'in-progress'
      });

      expect(result.content[0].text).toContain('Milestone added: Additional Milestone');
      expect(result.content[0].text).toContain('Status: in-progress');
    });
  });
});