# Context Continuation MCP Server

An MCP (Model Context Protocol) server that provides intelligent context management for AI development sessions. Never lose context when hitting token limits again!

<a href="https://glama.ai/mcp/servers/@core3-coder/context-continue-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@core3-coder/context-continue-mcp/badge" alt="Context Continuation Server MCP server" />
</a>

[![CI](https://github.com/core3-coder/context-continue-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/core3-coder/context-continue-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/core3-coder/context-continue-mcp/branch/main/graph/badge.svg)](https://codecov.io/gh/core3-coder/context-continue-mcp)
[![npm version](https://badge.fury.io/js/context-continue-mcp.svg)](https://badge.fury.io/js/context-continue-mcp)
[![Node.js](https://img.shields.io/node/v/context-continue-mcp.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/core3-coder/context-continue-mcp.svg)](https://github.com/core3-coder/context-continue-mcp/issues)
[![GitHub stars](https://img.shields.io/github/stars/core3-coder/context-continue-mcp.svg)](https://github.com/core3-coder/context-continue-mcp/stargazers)

## Features

- **Automatic Context Tracking**: Monitor token usage and conversation flow
- **Intelligent Session Breaks**: Get notified before hitting context limits
- **Seamless Restoration**: Generate context restoration prompts for new sessions
- **Project Management**: Track milestones, decisions, and progress across sessions
- **File-Based Storage**: Human-readable markdown files that work with git

## Quick Start

### Installation

```bash
npm install -g context-continue-mcp
```

### Usage with Claude Desktop

1. Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "context-continue": {
      "command": "context-mcp",
      "args": ["--project", "/path/to/your/project"]
    }
  }
}
```

2. Restart Claude Desktop

3. Start using context tools in your conversations:
   - `context_start_session` - Begin tracking a new session
   - `context_track_message` - Track important messages
   - `context_get_status` - Check token usage
   - `context_restore_session` - Generate restoration prompt

## Tools Available

### Session Management
- `context_start_session` - Start tracking a new context session
- `context_end_session` - End current session with summary
- `context_get_status` - Get current session and token usage info

### Context Tracking  
- `context_track_message` - Add message to session tracking
- `context_track_progress` - Update project progress
- `context_add_milestone` - Add project milestone

### Restoration
- `context_restore_session` - Generate context restoration prompt
- `context_get_project_summary` - Get full project overview

## How It Works

1. **Start a Session**: Initialize context tracking for your project
2. **Track Progress**: Important messages and decisions are automatically logged
3. **Monitor Usage**: Get warnings when approaching token limits
4. **Seamless Continuation**: Generate restoration prompts for new sessions

## File Structure

The server creates a `.context` directory in your project:

```
your-project/
├── .context/
│   ├── config.json
│   ├── project_summary.md
│   ├── sessions/
│   │   ├── session_001_2025-05-31.md
│   │   └── session_002_2025-06-01.md
│   ├── progress/
│   │   ├── milestones.md
│   │   └── decisions.md
│   └── artifacts/
└── your-code/
```

## Quality Assurance

This project maintains high code quality through:

- **🧪 Comprehensive Testing**: 43+ unit tests with 95%+ coverage
- **🔄 Continuous Integration**: Automated testing on Node.js 18.x, 20.x, 21.x
- **🌍 Cross-Platform**: Tested on Ubuntu, Windows, and macOS
- **📊 Code Coverage**: Real-time coverage tracking with Codecov
- **🏗️ Build Verification**: Automated build and CLI functionality testing
- **📦 Package Validation**: Pre-publish testing and compatibility checks

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test token-counter
npm test session-tracker
npm test context-manager

# Watch mode for development
npm run test:watch
```

## Development

```bash
git clone https://github.com/core3-coder/context-continue-mcp
cd context-continue-mcp
npm install
npm run build
npm start
```

## License

MIT - see LICENSE file for details