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

### structured-output-test

A barebone example to investigate language-agnostic ways to get structured output from LLMs, specifically for detecting tool call requests.

**Features:**
- Language-agnostic tool call detection (JSON parsing, text analysis)
- Multiple LLM provider support (OpenAI, Anthropic, Groq)
- MCP server integration for realistic tool testing
- Comprehensive test suite with integration tests
- Scenarios that trigger LLM tool calls

**Quick Start:**
```bash
cd structured-output-test
npm install
npm test

# To run the example (requires at least one API key):
export GROQ_API_KEY=your_api_key_here
npm start
```

See [structured-output-test/README.md](structured-output-test/README.md) for detailed documentation.
