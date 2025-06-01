import { ContextManager } from '../src/context-manager';
import { Milestone, TechnicalDecision } from '../src/types';
import { promises as fs } from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
  },
}));

describe('ContextManager', () => {
  let contextManager: ContextManager;
  let mockProjectPath: string;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    contextManager = new ContextManager();
    mockProjectPath = '/tmp/test-project';
    jest.clearAllMocks();
  });

  describe('getProjectSummary', () => {
    beforeEach(() => {
      // Mock config file
      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('config.json')) {
          return Promise.resolve(JSON.stringify({
            projectName: 'Test Project',
            maxTokensPerSession: 15000
          }));
        }
        if (filePath.includes('milestones.md')) {
          return Promise.resolve('# Milestones\n### ✅ Test Milestone\nCompleted milestone');
        }
        return Promise.reject(new Error('File not found'));
      });

      mockFs.readdir.mockResolvedValue(['session_001.md', 'session_002.md'] as any);
    });

    it('should return project summary with basic info', async () => {
      const summary = await contextManager.getProjectSummary(mockProjectPath);

      expect(summary.name).toBe('Test Project');
      expect(summary.path).toBe(mockProjectPath);
      expect(summary.totalSessions).toBeGreaterThanOrEqual(0);
      expect(summary.lastActivity).toBeInstanceOf(Date);
    });

    it('should use fallback project name if config missing', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Config not found'));

      const summary = await contextManager.getProjectSummary(mockProjectPath);
      expect(summary.name).toBe(path.basename(mockProjectPath));
    });
  });

  describe('generateRestorationPrompt', () => {
    beforeEach(() => {
      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('config.json')) {
          return Promise.resolve(JSON.stringify({
            projectName: 'Test Project'
          }));
        }
        if (filePath.includes('milestones.md')) {
          return Promise.resolve(`
# Milestones
### 🔄 Active Milestone
**Status:** in-progress
**Description:** Working on feature
          `);
        }
        if (filePath.includes('decisions.md')) {
          return Promise.resolve(`
# Decisions
### ADR-001: Use TypeScript
**Decision:** TypeScript for type safety
          `);
        }
        return Promise.resolve('');
      });

      mockFs.readdir.mockResolvedValue([] as any);
    });

    it('should generate restoration prompt with project context', async () => {
      const prompt = await contextManager.generateRestorationPrompt(mockProjectPath);

      expect(prompt.projectName).toBe('Test Project');
      expect(prompt.fullPrompt).toContain('Test Project');
      expect(prompt.keyContext).toBeInstanceOf(Array);
      expect(prompt.nextSteps).toBeInstanceOf(Array);
    });

    it('should include active milestones in context', async () => {
      const prompt = await contextManager.generateRestorationPrompt(mockProjectPath);

      expect(prompt.keyContext.some(ctx => ctx.includes('Active milestone'))).toBe(true);
    });

    it('should include recent decisions in context', async () => {
      const prompt = await contextManager.generateRestorationPrompt(mockProjectPath);

      expect(prompt.keyContext.some(ctx => ctx.includes('Decision:'))).toBe(true);
    });
  });

  describe('addMilestone', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# Project Milestones\n');
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should add milestone successfully', async () => {
      const milestone = {
        title: 'Test Milestone',
        description: 'A test milestone',
        status: 'planned' as const
      };

      await contextManager.addMilestone(mockProjectPath, milestone);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('milestones.md'),
        expect.stringContaining('Test Milestone'),
        'utf8'
      );
    });

    it('should create milestones file if not exists', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const milestone = {
        title: 'First Milestone',
        description: 'The first milestone',
        status: 'planned' as const
      };

      await contextManager.addMilestone(mockProjectPath, milestone);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('milestones.md'),
        expect.stringContaining('# Project Milestones'),
        'utf8'
      );
    });

    it('should ensure progress directory exists', async () => {
      const milestone = {
        title: 'Test Milestone',
        description: 'Test',
        status: 'planned' as const
      };

      await contextManager.addMilestone(mockProjectPath, milestone);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.context', 'progress'),
        { recursive: true }
      );
    });
  });

  describe('logDecision', () => {
    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('# Technical Decisions\n');
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should log decision successfully', async () => {
      const decision = {
        title: 'Use React',
        context: 'Need UI framework',
        decision: 'React for component-based UI',
        alternatives: ['Vue', 'Angular'],
        consequences: ['Learning curve', 'Good ecosystem'],
        status: 'accepted' as const
      };

      await contextManager.logDecision(mockProjectPath, decision);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('decisions.md'),
        expect.stringContaining('Use React'),
        'utf8'
      );
    });

    it('should create decisions file if not exists', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const decision = {
        title: 'First Decision',
        context: 'Initial choice',
        decision: 'Go with option A',
        alternatives: [],
        consequences: [],
        status: 'accepted' as const
      };

      await contextManager.logDecision(mockProjectPath, decision);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('decisions.md'),
        expect.stringContaining('# Technical Decisions'),
        'utf8'
      );
    });
  });

  describe('private methods behavior', () => {
    it('should handle missing files gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const summary = await contextManager.getProjectSummary(mockProjectPath);
      
      expect(summary.totalSessions).toBe(0);
      expect(summary.keyMilestones).toEqual([]);
    });

    it('should generate meaningful next steps', async () => {
      mockFs.readFile.mockImplementation((filePath: any) => {
        if (filePath.includes('config.json')) {
          return Promise.resolve(JSON.stringify({ projectName: 'Test' }));
        }
        if (filePath.includes('milestones.md')) {
          return Promise.resolve(`
### 🔄 In Progress Milestone
**Status:** in-progress
**Description:** Working on this
          `);
        }
        return Promise.resolve('');
      });

      mockFs.readdir.mockResolvedValue([]);

      const prompt = await contextManager.generateRestorationPrompt(mockProjectPath);
      
      expect(prompt.nextSteps.length).toBeGreaterThan(0);
      expect(prompt.nextSteps.some(step => step.includes('Continue work on'))).toBe(true);
    });
  });
});