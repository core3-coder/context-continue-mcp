import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ContextManager } from './context-manager.js';
import { SessionTracker } from './session-tracker.js';
import { TokenCounter } from './token-counter.js';

export class ContextContinuationServer {
  private server: Server;
  private contextManager: ContextManager;
  private sessionTracker: SessionTracker;
  private tokenCounter: TokenCounter;

  constructor() {
    this.server = new Server(
      {
        name: 'context-continue-mcp',
        version: '0.1.0',
      }
    );

    this.contextManager = new ContextManager();
    this.sessionTracker = new SessionTracker();
    this.tokenCounter = new TokenCounter();

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        return await this.handleToolCall(name, args);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'context_start_session',
        description: 'Start a new context tracking session',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory',
            },
            sessionName: {
              type: 'string',
              description: 'Optional session name',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'context_end_session',
        description: 'End the current context tracking session',
        inputSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Optional session summary',
            },
          },
        },
      },
      {
        name: 'context_track_message',
        description: 'Track a message in the current session',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message content to track',
            },
            role: {
              type: 'string',
              enum: ['user', 'assistant'],
              description: 'Message sender role',
            },
          },
          required: ['message', 'role'],
        },
      },
      {
        name: 'context_get_status',
        description: 'Get current session status and token usage',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'context_restore_session',
        description: 'Generate a context restoration prompt for continuing work',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['projectPath'],
        },
      },
      {
        name: 'context_add_milestone',
        description: 'Add a project milestone',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory',
            },
            title: {
              type: 'string',
              description: 'Milestone title',
            },
            description: {
              type: 'string',
              description: 'Milestone description',
            },
            status: {
              type: 'string',
              enum: ['planned', 'in-progress', 'completed'],
              description: 'Milestone status',
              default: 'planned',
            },
          },
          required: ['projectPath', 'title'],
        },
      },
      {
        name: 'context_log_decision',
        description: 'Log a technical decision',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory',
            },
            title: {
              type: 'string',
              description: 'Decision title',
            },
            context: {
              type: 'string',
              description: 'Decision context',
            },
            decision: {
              type: 'string',
              description: 'The decision made',
            },
            alternatives: {
              type: 'array',
              items: { type: 'string' },
              description: 'Alternative options considered',
              default: [],
            },
            consequences: {
              type: 'array',
              items: { type: 'string' },
              description: 'Consequences of the decision',
              default: [],
            },
            status: {
              type: 'string',
              enum: ['proposed', 'accepted', 'rejected'],
              description: 'Decision status',
              default: 'accepted',
            },
          },
          required: ['projectPath', 'title', 'decision'],
        },
      },
      {
        name: 'context_get_project_summary',
        description: 'Get a comprehensive project summary',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to project directory',
            },
          },
          required: ['projectPath'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'context_start_session':
          return await this.handleStartSession(args);
          
        case 'context_end_session':
          return await this.handleEndSession(args);
          
        case 'context_track_message':
          return await this.handleTrackMessage(args);
          
        case 'context_get_status':
          return await this.handleGetStatus(args);
          
        case 'context_restore_session':
          return await this.handleRestoreSession(args);
          
        case 'context_add_milestone':
          return await this.handleAddMilestone(args);
          
        case 'context_log_decision':
          return await this.handleLogDecision(args);
          
        case 'context_get_project_summary':
          return await this.handleGetProjectSummary(args);
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error handling tool ${name}:`, error);
      throw error;
    }
  }

  private async handleStartSession(args: any) {
    const { projectPath, sessionName } = args;
    
    if (!projectPath) {
      throw new Error('projectPath is required');
    }

    const session = await this.sessionTracker.startSession(projectPath, sessionName);
    
    return {
      content: [
        {
          type: 'text',
          text: `Started new session: ${session.id}\nProject: ${projectPath}\nSession name: ${sessionName || 'Unnamed'}\n\nContext tracking is now active. Use context_track_message to log important conversations.`,
        },
      ],
    };
  }

  private async handleEndSession(args: any) {
    const { summary } = args;
    
    const currentSession = this.sessionTracker.getCurrentSession();
    if (!currentSession) {
      throw new Error('No active session to end');
    }

    await this.sessionTracker.endSession(summary);
    
    return {
      content: [
        {
          type: 'text',
          text: `Session ended successfully.\nTotal messages: ${currentSession.messageCount}\nTotal tokens: ${currentSession.tokenCount}\n\nSession files have been saved to .context/sessions/`,
        },
      ],
    };
  }

  private async handleTrackMessage(args: any) {
    const { message, role } = args;
    
    if (!message || !role) {
      throw new Error('message and role are required');
    }

    const tokens = this.tokenCounter.countTokens(message);
    this.sessionTracker.addMessage(message, role, tokens);
    
    const currentSession = this.sessionTracker.getCurrentSession();
    const usage = this.tokenCounter.getUsage(currentSession?.tokenCount || 0);
    const suggestion = this.tokenCounter.shouldSuggestBreak(currentSession?.tokenCount || 0);

    let response = `Message tracked (${tokens} tokens)\nTotal session tokens: ${currentSession?.tokenCount}\nToken usage: ${usage.percentage}%`;
    
    if (suggestion) {
      response += `\n\n⚠️ ${suggestion.reason}\nRecommendation: ${suggestion.suggestedAction === 'end_session' ? 'Consider ending this session' : 'Create a checkpoint'}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleGetStatus(args: any) {
    const currentSession = this.sessionTracker.getCurrentSession();
    
    if (!currentSession) {
      return {
        content: [
          {
            type: 'text',
            text: 'No active session. Use context_start_session to begin tracking.',
          },
        ],
      };
    }

    const usage = this.tokenCounter.getUsage(currentSession.tokenCount);
    const suggestion = this.tokenCounter.shouldSuggestBreak(currentSession.tokenCount);

    let status = `📊 Session Status\n`;
    status += `Session ID: ${currentSession.id}\n`;
    status += `Messages: ${currentSession.messageCount}\n`;
    status += `Tokens: ${currentSession.tokenCount}/${this.tokenCounter.getUsage(0).limit}\n`;
    status += `Usage: ${usage.percentage}% (${usage.suggestion})\n`;
    status += `Duration: ${Math.round((Date.now() - currentSession.startTime.getTime()) / 1000 / 60)} minutes`;

    if (suggestion) {
      status += `\n\n⚠️ ${suggestion.reason}\nAction: ${suggestion.summary}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: status,
        },
      ],
    };
  }

  private async handleRestoreSession(args: any) {
    const { projectPath } = args;
    
    if (!projectPath) {
      throw new Error('projectPath is required');
    }

    const restoration = await this.contextManager.generateRestorationPrompt(projectPath);

    return {
      content: [
        {
          type: 'text',
          text: restoration.fullPrompt,
        },
      ],
    };
  }

  private async handleAddMilestone(args: any) {
    const { projectPath, title, description, status = 'planned' } = args;
    
    if (!projectPath || !title) {
      throw new Error('projectPath and title are required');
    }

    await this.contextManager.addMilestone(projectPath, {
      title,
      description: description || '',
      status,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Milestone added: ${title}\nStatus: ${status}\nDescription: ${description || 'No description provided'}`,
        },
      ],
    };
  }

  private async handleLogDecision(args: any) {
    const { projectPath, title, context, decision, alternatives = [], consequences = [], status = 'accepted' } = args;
    
    if (!projectPath || !title || !decision) {
      throw new Error('projectPath, title, and decision are required');
    }

    await this.contextManager.logDecision(projectPath, {
      title,
      context: context || '',
      decision,
      alternatives,
      consequences,
      status,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Decision logged: ${title}\nStatus: ${status}\nDecision: ${decision}`,
        },
      ],
    };
  }

  private async handleGetProjectSummary(args: any) {
    const { projectPath } = args;
    
    if (!projectPath) {
      throw new Error('projectPath is required');
    }

    const summary = await this.contextManager.getProjectSummary(projectPath);

    let response = `📋 Project Summary: ${summary.name}\n\n`;
    response += `📁 Path: ${summary.path}\n`;
    response += `💬 Total Sessions: ${summary.totalSessions}\n`;
    response += `🎯 Total Tokens: ${summary.totalTokens}\n`;
    response += `⏰ Last Activity: ${summary.lastActivity.toLocaleDateString()}\n`;
    if (summary.currentPhase) response += `🚀 Current Phase: ${summary.currentPhase}\n`;
    
    if (summary.keyMilestones.length > 0) {
      response += `\n📍 Key Milestones:\n`;
      summary.keyMilestones.forEach(m => {
        const statusIcon = m.status === 'completed' ? '✅' : m.status === 'in-progress' ? '🔄' : '⏳';
        response += `${statusIcon} ${m.title}\n`;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Context Continuation MCP Server running on stdio');
  }
}