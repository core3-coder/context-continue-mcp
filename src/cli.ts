#!/usr/bin/env node

import { Command } from 'commander';
import { ContextContinuationServer } from './server.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));

const program = new Command();

program
  .name('context-mcp')
  .description('Context Continuation MCP Server - Intelligent context management for AI conversations')
  .version(packageJson.version);

program
  .command('server')
  .description('Start the MCP server (default mode)')
  .option('-p, --project <path>', 'Project directory path')
  .option('--max-tokens <number>', 'Maximum tokens per session', '15000')
  .option('--warning-threshold <number>', 'Token warning threshold', '12000')
  .action(async (options) => {
    try {
      const server = new ContextContinuationServer();
      
      if (options.project) {
        process.env.CONTEXT_PROJECT_PATH = path.resolve(options.project);
      }
      
      console.error(`🔥 Context Continuation MCP Server v${packageJson.version}`);
      console.error('📡 Running on stdio transport...');
      
      if (options.project) {
        console.error(`📁 Project: ${options.project}`);
      }
      
      await server.run();
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize context management in a project directory')
  .argument('<project-path>', 'Project directory to initialize')
  .option('--name <name>', 'Project name')
  .action(async (projectPath, options) => {
    try {
      const { promises: fs } = await import('fs');
      const absPath = path.resolve(projectPath);
      
      // Create context structure
      const contextDir = path.join(absPath, '.context');
      const sessionsDir = path.join(contextDir, 'sessions');
      const progressDir = path.join(contextDir, 'progress');
      const artifactsDir = path.join(contextDir, 'artifacts');

      await fs.mkdir(contextDir, { recursive: true });
      await fs.mkdir(sessionsDir, { recursive: true });
      await fs.mkdir(progressDir, { recursive: true });
      await fs.mkdir(artifactsDir, { recursive: true });

      // Create config
      const config = {
        projectName: options.name || path.basename(absPath),
        createdAt: new Date().toISOString(),
        maxTokensPerSession: 15000,
        warningThreshold: 12000,
        autoSummarize: true,
        summaryLength: 'medium',
        contextDirectory: '.context'
      };

      await fs.writeFile(
        path.join(contextDir, 'config.json'),
        JSON.stringify(config, null, 2)
      );

      // Create initial files
      const readmeContent = `# ${config.projectName}

## Context Management

This project uses Context Continuation MCP Server for intelligent context management.

### Structure

- \`.context/sessions/\` - Session transcripts and summaries
- \`.context/progress/\` - Milestones and decisions
- \`.context/artifacts/\` - Generated documents and diagrams

### Usage

Start the MCP server:
\`\`\`bash
context-mcp server --project .
\`\`\`

Or use with Claude Desktop by adding to your configuration:
\`\`\`json
{
  "mcpServers": {
    "context-continue": {
      "command": "context-mcp",
      "args": ["server", "--project", "${absPath}"]
    }
  }
}
\`\`\`
`;

      await fs.writeFile(
        path.join(contextDir, 'README.md'),
        readmeContent
      );

      console.log('✅ Context management initialized!');
      console.log(`📁 Project: ${absPath}`);
      console.log(`🔧 Config: ${path.join(contextDir, 'config.json')}`);
      console.log(`📖 Guide: ${path.join(contextDir, 'README.md')}`);
      console.log('');
      console.log('🚀 Next steps:');
      console.log(`   1. cd ${projectPath}`);
      console.log('   2. context-mcp server --project .');
      console.log('   3. Use context tools in your AI client');

    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show status of context management in current directory')
  .option('-p, --project <path>', 'Project directory path', '.')
  .action(async (options) => {
    try {
      const { promises: fs } = await import('fs');
      const projectPath = path.resolve(options.project);
      const contextDir = path.join(projectPath, '.context');
      
      // Check if initialized
      try {
        await fs.access(contextDir);
      } catch {
        console.log('❌ Context management not initialized in this project');
        console.log('   Run: context-mcp init .');
        return;
      }

      // Read config
      const configPath = path.join(contextDir, 'config.json');
      let config;
      try {
        const configContent = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(configContent);
      } catch {
        config = { projectName: path.basename(projectPath) };
      }

      // Count sessions
      const sessionsDir = path.join(contextDir, 'sessions');
      let sessionCount = 0;
      try {
        const files = await fs.readdir(sessionsDir);
        sessionCount = files.filter(f => f.startsWith('session_') && f.endsWith('.md')).length;
      } catch {
        // Directory doesn't exist yet
      }

      console.log(`📊 Context Status: ${config.projectName}`);
      console.log(`📁 Path: ${projectPath}`);
      console.log(`💬 Sessions: ${sessionCount}`);
      console.log(`⚙️  Config: ${configPath}`);
      console.log('');
      console.log('🔧 Available commands:');
      console.log('   context-mcp server --project .  # Start MCP server');
      console.log('   context-mcp init .              # Reinitialize');

    } catch (error) {
      console.error('❌ Error checking status:', error);
      process.exit(1);
    }
  });

// Default to server command if no command specified
if (process.argv.length === 2) {
  program.parse(['node', 'context-mcp', 'server']);
} else {
  program.parse();
}