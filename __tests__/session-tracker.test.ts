import { SessionTracker } from '../src/session-tracker';
import { SessionInfo } from '../src/types';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

// Mock fs module for testing
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    access: jest.fn(),
  },
}));

describe('SessionTracker', () => {
  let sessionTracker: SessionTracker;
  let mockProjectPath: string;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    sessionTracker = new SessionTracker();
    mockProjectPath = '/tmp/test-project';
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startSession', () => {
    it('should start a new session successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      const session = await sessionTracker.startSession(mockProjectPath, 'Test Session');

      expect(session.id).toBeDefined();
      expect(session.projectPath).toBe(mockProjectPath);
      expect(session.sessionName).toBe('Test Session');
      expect(session.status).toBe('active');
      expect(session.tokenCount).toBe(0);
      expect(session.messageCount).toBe(0);
      expect(session.startTime).toBeInstanceOf(Date);
    });

    it('should throw error if session already active', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await sessionTracker.startSession(mockProjectPath, 'First Session');

      await expect(sessionTracker.startSession(mockProjectPath, 'Second Session'))
        .rejects.toThrow('Session already active');
    });

    it('should create context directory structure', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await sessionTracker.startSession(mockProjectPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.context'),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.context', 'sessions'),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockProjectPath, '.context', 'progress'),
        { recursive: true }
      );
    });

    it('should create default config if not exists', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await sessionTracker.startSession(mockProjectPath);

      const configPath = path.join(mockProjectPath, '.context', 'config.json');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        configPath,
        expect.any(String)
      );
    });
  });

  describe('endSession', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      
      await sessionTracker.startSession(mockProjectPath, 'Test Session');
    });

    it('should end session successfully', async () => {
      await sessionTracker.endSession('Test summary');

      const currentSession = sessionTracker.getCurrentSession();
      expect(currentSession).toBeNull();
    });

    it('should throw error if no active session', async () => {
      await sessionTracker.endSession();
      
      await expect(sessionTracker.endSession())
        .rejects.toThrow('No active session to end');
    });

    it('should write session file when ending', async () => {
      await sessionTracker.endSession('Test summary');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('session_'),
        expect.stringContaining('Test summary'),
        'utf8'
      );
    });
  });

  describe('addMessage', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      
      await sessionTracker.startSession(mockProjectPath, 'Test Session');
    });

    it('should add message to active session', () => {
      sessionTracker.addMessage('Test message', 'user', 10);

      const session = sessionTracker.getCurrentSession();
      expect(session?.messageCount).toBe(1);
      expect(session?.tokenCount).toBe(10);
    });

    it('should throw error if no active session', async () => {
      await sessionTracker.endSession();

      expect(() => {
        sessionTracker.addMessage('Test message', 'user', 10);
      }).toThrow('No active session');
    });

    it('should accumulate tokens and message counts', () => {
      sessionTracker.addMessage('First message', 'user', 10);
      sessionTracker.addMessage('Second message', 'assistant', 15);

      const session = sessionTracker.getCurrentSession();
      expect(session?.messageCount).toBe(2);
      expect(session?.tokenCount).toBe(25);
    });
  });

  describe('getCurrentSession', () => {
    it('should return null when no session active', () => {
      const session = sessionTracker.getCurrentSession();
      expect(session).toBeNull();
    });

    it('should return current session when active', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);

      await sessionTracker.startSession(mockProjectPath, 'Test Session');
      
      const session = sessionTracker.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.sessionName).toBe('Test Session');
    });
  });

  describe('getSessions', () => {
    it('should return empty array when no sessions directory', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      const sessions = await sessionTracker.getSessions(mockProjectPath);
      expect(sessions).toEqual([]);
    });

    it('should return sessions from directory', async () => {
      const mockFiles = ['session_123_2025-05-31.md', 'session_456_2025-06-01.md', 'other.txt'];
      mockFs.readdir.mockResolvedValue(mockFiles as any);
      mockFs.readFile.mockResolvedValue(`
# Session 123

**Project:** test
**Start Time:** 2025-05-31 10:00:00
**End Time:** 2025-05-31 11:00:00
**Messages:** 5
**Total Tokens:** 100
**Session Name:** Test Session
      `);

      const sessions = await sessionTracker.getSessions(mockProjectPath);
      expect(sessions).toHaveLength(2);
    });
  });
});