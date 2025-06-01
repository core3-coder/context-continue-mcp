import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { SessionInfo, SessionMessage } from './types.js';

export class SessionTracker {
  private currentSession: SessionInfo | null = null;
  private messages: SessionMessage[] = [];

  async startSession(projectPath: string, sessionName?: string): Promise<SessionInfo> {
    if (this.currentSession) {
      throw new Error('Session already active. End current session first.');
    }

    const sessionId = this.generateSessionId();
    const session: SessionInfo = {
      id: sessionId,
      projectPath,
      sessionName,
      startTime: new Date(),
      tokenCount: 0,
      messageCount: 0,
      status: 'active',
    };

    this.currentSession = session;
    this.messages = [];

    // Ensure context directory exists
    await this.ensureContextDirectory(projectPath);
    
    return session;
  }

  async endSession(summary?: string): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session to end');
    }

    this.currentSession.endTime = new Date();
    this.currentSession.status = 'ended';

    // Write session file
    await this.writeSessionFile(this.currentSession, this.messages, summary);

    this.currentSession = null;
    this.messages = [];
  }

  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  addMessage(content: string, role: 'user' | 'assistant', tokenCount: number): void {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const message: SessionMessage = {
      id: this.generateMessageId(),
      content,
      role,
      timestamp: new Date(),
      tokenCount,
    };

    this.messages.push(message);
    this.currentSession.tokenCount += tokenCount;
    this.currentSession.messageCount++;
  }

  async getSessions(projectPath: string): Promise<SessionInfo[]> {
    const sessionsDir = path.join(projectPath, '.context', 'sessions');
    
    try {
      const files = await fs.readdir(sessionsDir);
      const sessionFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.md'));
      
      const sessions: SessionInfo[] = [];
      for (const file of sessionFiles) {
        const filePath = path.join(sessionsDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const session = this.parseSessionFromMarkdown(content, file);
        if (session) sessions.push(session);
      }
      
      return sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    } catch (error) {
      return [];
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async ensureContextDirectory(projectPath: string): Promise<void> {
    const contextDir = path.join(projectPath, '.context');
    const sessionsDir = path.join(contextDir, 'sessions');
    const progressDir = path.join(contextDir, 'progress');
    const artifactsDir = path.join(contextDir, 'artifacts');

    await fs.mkdir(contextDir, { recursive: true });
    await fs.mkdir(sessionsDir, { recursive: true });
    await fs.mkdir(progressDir, { recursive: true });
    await fs.mkdir(artifactsDir, { recursive: true });

    // Create initial config if it doesn't exist
    const configPath = path.join(contextDir, 'config.json');
    try {
      await fs.access(configPath);
    } catch {
      const defaultConfig = {
        projectName: path.basename(projectPath),
        createdAt: new Date().toISOString(),
        maxTokensPerSession: 15000,
        warningThreshold: 12000,
        autoSummarize: true,
        summaryLength: 'medium',
        contextDirectory: '.context'
      };
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
    }
  }

  private async writeSessionFile(session: SessionInfo, messages: SessionMessage[], summary?: string): Promise<void> {
    const sessionsDir = path.join(session.projectPath, '.context', 'sessions');
    const timestamp = format(session.startTime, 'yyyy-MM-dd');
    const filename = `session_${session.id}_${timestamp}.md`;
    const filePath = path.join(sessionsDir, filename);

    const duration = session.endTime 
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)
      : 0;

    const markdown = this.generateSessionMarkdown(session, messages, summary, duration);
    await fs.writeFile(filePath, markdown, 'utf8');

    // Also update current session pointer
    const currentSessionPath = path.join(sessionsDir, 'current_session.md');
    await fs.writeFile(currentSessionPath, markdown, 'utf8');
  }

  private generateSessionMarkdown(session: SessionInfo, messages: SessionMessage[], summary?: string, duration?: number): string {
    const startTime = format(session.startTime, 'yyyy-MM-dd HH:mm:ss');
    const endTime = session.endTime ? format(session.endTime, 'yyyy-MM-dd HH:mm:ss') : 'Active';

    let markdown = `# Session ${session.id}\n\n`;
    markdown += `**Project:** ${path.basename(session.projectPath)}\n`;
    markdown += `**Session Name:** ${session.sessionName || 'Unnamed Session'}\n`;
    markdown += `**Start Time:** ${startTime}\n`;
    markdown += `**End Time:** ${endTime}\n`;
    if (duration) markdown += `**Duration:** ${duration} minutes\n`;
    markdown += `**Messages:** ${session.messageCount}\n`;
    markdown += `**Total Tokens:** ${session.tokenCount}\n`;
    markdown += `**Status:** ${session.status}\n\n`;

    if (summary) {
      markdown += `## Session Summary\n\n${summary}\n\n`;
    }

    markdown += `## Conversation\n\n`;
    
    for (const message of messages) {
      const timestamp = format(message.timestamp, 'HH:mm:ss');
      const role = message.role === 'user' ? '👤 User' : '🤖 Assistant';
      markdown += `### ${role} (${timestamp}) [${message.tokenCount} tokens]\n\n`;
      markdown += `${message.content}\n\n`;
      markdown += `---\n\n`;
    }

    markdown += `## Session Statistics\n\n`;
    markdown += `- **Total Messages:** ${messages.length}\n`;
    markdown += `- **User Messages:** ${messages.filter(m => m.role === 'user').length}\n`;
    markdown += `- **Assistant Messages:** ${messages.filter(m => m.role === 'assistant').length}\n`;
    markdown += `- **Average Message Length:** ${Math.round(messages.reduce((acc, m) => acc + m.content.length, 0) / messages.length || 0)} characters\n`;
    markdown += `- **Token Efficiency:** ${Math.round((session.tokenCount / Math.max(1, messages.reduce((acc, m) => acc + m.content.length, 0))) * 1000)} tokens per 1000 characters\n\n`;

    return markdown;
  }

  private parseSessionFromMarkdown(content: string, filename: string): SessionInfo | null {
    try {
      const lines = content.split('\n');
      const session: Partial<SessionInfo> = {
        id: filename.match(/session_(.+?)_/)?.[1] || filename,
        status: 'ended'
      };

      for (const line of lines) {
        if (line.startsWith('**Project:**')) {
          // Extract project path - we'll need to reconstruct this
          session.projectPath = process.cwd(); // Default fallback
        }
        if (line.startsWith('**Start Time:**')) {
          session.startTime = new Date(line.split('**Start Time:**')[1].trim());
        }
        if (line.startsWith('**End Time:**') && !line.includes('Active')) {
          session.endTime = new Date(line.split('**End Time:**')[1].trim());
        }
        if (line.startsWith('**Messages:**')) {
          session.messageCount = parseInt(line.split('**Messages:**')[1].trim());
        }
        if (line.startsWith('**Total Tokens:**')) {
          session.tokenCount = parseInt(line.split('**Total Tokens:**')[1].trim());
        }
        if (line.startsWith('**Session Name:**')) {
          session.sessionName = line.split('**Session Name:**')[1].trim();
        }
      }

      return session as SessionInfo;
    } catch (error) {
      console.error('Failed to parse session from markdown:', error);
      return null;
    }
  }
}
