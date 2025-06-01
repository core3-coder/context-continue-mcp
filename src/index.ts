#!/usr/bin/env node

import { ContextContinuationServer } from './server.js';

async function main() {
  const server = new ContextContinuationServer();
  
  // Start the server
  await server.run();
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});