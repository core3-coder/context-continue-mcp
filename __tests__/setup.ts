// Mock external dependencies that have ES module issues
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  CallToolRequestSchema: 'CallToolRequestSchema',
  ListToolsRequestSchema: 'ListToolsRequestSchema',
}));

// Mock tiktoken since it might cause issues in tests
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text: string) => new Array(Math.ceil(text.length / 4))),
  })),
}));