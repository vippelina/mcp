# mcp
playground for learning ai

## Projects

### simple-chatbot

A TypeScript chatbot example that connects to multiple MCP servers simultaneously and integrates with an LLM provider.

**Features:**
- Multi-server connection using MCP protocol
- Dynamic tool discovery from all connected servers
- LLM integration (OpenAI-compatible APIs like OpenAI, Groq, etc.)
- Tool execution with natural language responses
- Conversation state management
- Comprehensive test suite with vitest

**Quick Start:**
```bash
cd simple-chatbot
npm install
npm run build
npm test

# To run the chatbot:
export LLM_API_KEY=your_api_key_here
npm start
```

See [simple-chatbot/README.md](simple-chatbot/README.md) for detailed documentation.
