import { promises as fs } from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { 
  ProjectSummary, 
  Milestone, 
  TechnicalDecision, 
  RestorationPrompt, 
  ContextConfig,
  SessionInfo 
} from './types.js';

export class ContextManager {
  private config: ContextConfig | null = null;

  async getProjectSummary(projectPath: string): Promise<ProjectSummary> {
    const contextDir = path.join(projectPath, '.context');
    const config = await this.loadConfig(projectPath);
    
    // Get all sessions
    const sessionsDir = path.join(contextDir, 'sessions');
    const sessions = await this.getAllSessions(sessionsDir);
    
    // Calculate stats
    const totalTokens = sessions.reduce((acc, s) => acc + s.tokenCount, 0);
    const lastActivity = sessions.length > 0 
      ? new Date(Math.max(...sessions.map(s => s.startTime.getTime())))
      : new Date();

    // Get milestones
    const milestones = await this.getMilestones(projectPath);

    return {
      name: config.projectName || path.basename(projectPath),
      path: projectPath,
      totalSessions: sessions.length,
      totalTokens,
      lastActivity,
      currentPhase: await this.getCurrentPhase(projectPath),
      keyMilestones: milestones.slice(0, 5), // Most recent 5
    };
  }

  async generateRestorationPrompt(projectPath: string): Promise<RestorationPrompt> {
    const summary = await this.getProjectSummary(projectPath);
    const recentSessions = await this.getRecentSessions(projectPath, 3);
    const milestones = await this.getMilestones(projectPath);
    const decisions = await this.getDecisions(projectPath);

    // Generate context summary from recent sessions
    const lastSessionSummary = recentSessions.length > 0 
      ? await this.summarizeSession(recentSessions[0])
      : 'No previous sessions found';

    // Extract key context points
    const keyContext = [
      `Project: ${summary.name}`,
      `Total sessions: ${summary.totalSessions}`,
      `Total tokens used: ${summary.totalTokens}`,
      `Current phase: ${summary.currentPhase || 'Initial development'}`,
      ...milestones.filter(m => m.status === 'in-progress').map(m => `Active milestone: ${m.title}`),
      ...decisions.slice(0, 3).map(d => `Decision: ${d.title} - ${d.decision}`)
    ];

    // Generate next steps based on current state
    const nextSteps = await this.generateNextSteps(milestones, decisions);

    const fullPrompt = this.buildRestorationPrompt(
      summary.name,
      summary.currentPhase || 'Development',
      lastSessionSummary,
      keyContext,
      nextSteps
    );

    return {
      projectName: summary.name,
      currentPhase: summary.currentPhase || 'Development',
      lastSessionSummary,
      keyContext,
      nextSteps,
      fullPrompt,
    };
  }

  async addMilestone(projectPath: string, milestone: Omit<Milestone, 'id' | 'createdAt'>): Promise<void> {
    const milestonesPath = path.join(projectPath, '.context', 'progress', 'milestones.md');
    
    const newMilestone: Milestone = {
      ...milestone,
      id: this.generateId(),
      createdAt: new Date(),
    };

    await this.ensureProgressDirectory(projectPath);
    
    let content = '';
    try {
      content = await fs.readFile(milestonesPath, 'utf8');
    } catch {
      content = '# Project Milestones\n\n';
    }

    const milestoneMarkdown = this.generateMilestoneMarkdown(newMilestone);
    content += `\n${milestoneMarkdown}\n`;

    await fs.writeFile(milestonesPath, content, 'utf8');
  }

  async logDecision(projectPath: string, decision: Omit<TechnicalDecision, 'id' | 'createdAt'>): Promise<void> {
    const decisionsPath = path.join(projectPath, '.context', 'progress', 'decisions.md');
    
    const newDecision: TechnicalDecision = {
      ...decision,
      id: this.generateId(),
      createdAt: new Date(),
    };

    await this.ensureProgressDirectory(projectPath);
    
    let content = '';
    try {
      content = await fs.readFile(decisionsPath, 'utf8');
    } catch {
      content = '# Technical Decisions\n\n';
    }

    const decisionMarkdown = this.generateDecisionMarkdown(newDecision);
    content += `\n${decisionMarkdown}\n`;

    await fs.writeFile(decisionsPath, content, 'utf8');
  }

  private async loadConfig(projectPath: string): Promise<ContextConfig> {
    if (this.config) return this.config;

    const configPath = path.join(projectPath, '.context', 'config.json');
    
    try {
      const content = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(content);
      return this.config!;
    } catch {
      // Return default config
      this.config = {
        maxTokensPerSession: 15000,
        warningThreshold: 12000,
        autoSummarize: true,
        summaryLength: 'medium',
        projectName: path.basename(projectPath),
        contextDirectory: '.context',
      };
      return this.config;
    }
  }

  private async getAllSessions(sessionsDir: string): Promise<SessionInfo[]> {
    try {
      const files = await fs.readdir(sessionsDir);
      const sessionFiles = files.filter(f => f.startsWith('session_') && f.endsWith('.md'));
      return sessionFiles.map(f => this.parseSessionInfo(f));
    } catch {
      return [];
    }
  }

  private async getRecentSessions(projectPath: string, count: number): Promise<any[]> {
    const sessionsDir = path.join(projectPath, '.context', 'sessions');
    const sessions = await this.getAllSessions(sessionsDir);
    return sessions.slice(-count).reverse();
  }

  private async getMilestones(projectPath: string): Promise<Milestone[]> {
    const milestonesPath = path.join(projectPath, '.context', 'progress', 'milestones.md');
    try {
      const content = await fs.readFile(milestonesPath, 'utf8');
      return this.parseMilestonesFromMarkdown(content);
    } catch {
      return [];
    }
  }

  private async getDecisions(projectPath: string): Promise<TechnicalDecision[]> {
    const decisionsPath = path.join(projectPath, '.context', 'progress', 'decisions.md');
    try {
      const content = await fs.readFile(decisionsPath, 'utf8');
      return this.parseDecisionsFromMarkdown(content);
    } catch {
      return [];
    }
  }

  private async getCurrentPhase(projectPath: string): Promise<string | undefined> {
    try {
      const summaryPath = path.join(projectPath, '.context', 'project_summary.md');
      const content = await fs.readFile(summaryPath, 'utf8');
      const phaseMatch = content.match(/\*\*Current Phase:\*\* (.+)/);
      return phaseMatch?.[1];
    } catch {
      return undefined;
    }
  }

  private async summarizeSession(session: any): Promise<string> {
    // Simple summary - in a real implementation, this could use AI summarization
    return `Last session focused on ${session.sessionName || 'development work'} with ${session.messageCount} exchanges and ${session.tokenCount} tokens used.`;
  }

  private async generateNextSteps(milestones: Milestone[], decisions: TechnicalDecision[]): Promise<string[]> {
    const nextSteps: string[] = [];
    
    // Add steps based on in-progress milestones
    const inProgress = milestones.filter(m => m.status === 'in-progress');
    nextSteps.push(...inProgress.map(m => `Continue work on: ${m.title}`));
    
    // Add steps based on recent decisions
    const recentDecisions = decisions.slice(0, 2);
    nextSteps.push(...recentDecisions.map(d => `Implement decision: ${d.title}`));
    
    // Add default steps if none found
    if (nextSteps.length === 0) {
      nextSteps.push('Review project status and set priorities', 'Continue development work');
    }
    
    return nextSteps.slice(0, 5); // Limit to 5 steps
  }

  private buildRestorationPrompt(projectName: string, currentPhase: string, lastSessionSummary: string, keyContext: string[], nextSteps: string[]): string {
    return `# Context Restoration for ${projectName}

## Project Status
**Current Phase:** ${currentPhase}

## Last Session Summary
${lastSessionSummary}

## Key Context
${keyContext.map(ctx => `- ${ctx}`).join('\n')}

## Recommended Next Steps
${nextSteps.map(step => `1. ${step}`).join('\n')}

## Instructions
You are continuing work on ${projectName}. Please review the above context and let me know when you're ready to proceed with the next steps.`;
  }

  private parseSessionInfo(filename: string): SessionInfo {
    const match = filename.match(/session_(.+?)_(\d{4}-\d{2}-\d{2})\.md/);
    return {
      id: match?.[1] || filename,
      projectPath: '',
      startTime: new Date(match?.[2] || Date.now()),
      tokenCount: 0,
      messageCount: 0,
      status: 'ended',
    };
  }

  private parseMilestonesFromMarkdown(content: string): Milestone[] {
    // Simple parser - in real implementation, would be more robust
    const milestones: Milestone[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('### ') && line.includes('Milestone')) {
        const title = line.replace('### ', '').replace(' Milestone', '');
        const status = line.includes('✅') ? 'completed' : 
                     line.includes('🔄') ? 'in-progress' : 'planned';
        
        milestones.push({
          id: this.generateId(),
          title,
          description: lines[i + 1] || '',
          status: status as 'planned' | 'in-progress' | 'completed',
          createdAt: new Date(),
        });
      }
    }
    
    return milestones;
  }

  private parseDecisionsFromMarkdown(content: string): TechnicalDecision[] {
    // Simple parser - in real implementation, would be more robust
    const decisions: TechnicalDecision[] = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('### ADR-')) {
        const title = line.replace(/### ADR-\d+: /, '');
        
        decisions.push({
          id: this.generateId(),
          title,
          context: '',
          decision: lines[i + 3] || '',
          alternatives: [],
          consequences: [],
          status: 'accepted',
          createdAt: new Date(),
        });
      }
    }
    
    return decisions;
  }

  private generateMilestoneMarkdown(milestone: Milestone): string {
    const statusIcon = milestone.status === 'completed' ? '✅' : 
                      milestone.status === 'in-progress' ? '🔄' : '⏳';
    const date = format(milestone.createdAt, 'yyyy-MM-dd');
    
    return `### ${statusIcon} ${milestone.title}
**Status:** ${milestone.status}  
**Created:** ${date}  
**Description:** ${milestone.description}`;
  }

  private generateDecisionMarkdown(decision: TechnicalDecision): string {
    const date = format(decision.createdAt, 'yyyy-MM-dd');
    
    return `### ADR-${this.generateId().slice(-3)}: ${decision.title}
**Date:** ${date}  
**Status:** ${decision.status}  
**Context:** ${decision.context}  
**Decision:** ${decision.decision}  
**Consequences:** ${decision.consequences.join(', ')}`;
  }

  private async ensureProgressDirectory(projectPath: string): Promise<void> {
    const progressDir = path.join(projectPath, '.context', 'progress');
    await fs.mkdir(progressDir, { recursive: true });
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
