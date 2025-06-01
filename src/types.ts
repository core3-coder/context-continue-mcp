export interface SessionInfo {
  id: string;
  projectPath: string;
  sessionName?: string;
  startTime: Date;
  endTime?: Date;
  tokenCount: number;
  messageCount: number;
  status: 'active' | 'ended';
}

export interface SessionMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  tokenCount: number;
}

export interface ProjectSummary {
  name: string;
  path: string;
  totalSessions: number;
  totalTokens: number;
  lastActivity: Date;
  currentPhase?: string;
  keyMilestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface TechnicalDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string[];
  status: 'proposed' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface TokenUsage {
  current: number;
  limit: number;
  percentage: number;
  suggestion?: 'continue' | 'warn' | 'break';
}

export interface BreakSuggestion {
  reason: string;
  currentTokens: number;
  suggestedAction: 'end_session' | 'create_checkpoint';
  summary: string;
}

export interface RestorationPrompt {
  projectName: string;
  currentPhase: string;
  lastSessionSummary: string;
  keyContext: string[];
  nextSteps: string[];
  fullPrompt: string;
}

export interface ContextConfig {
  maxTokensPerSession: number;
  warningThreshold: number;
  autoSummarize: boolean;
  summaryLength: 'short' | 'medium' | 'long';
  projectName?: string;
  contextDirectory: string;
}