# Simple Chatbot

A TypeScript chatbot example that connects to multiple MCP servers simultaneously and integrates with an LLM provider.

## Features

- Multi-server connection using `StdioClientTransport`
- Dynamic tool discovery from all connected servers
- LLM integration (OpenAI-compatible APIs)
- Tool execution with natural language responses
- Conversation state management

## Prerequisites

- Node.js (v18 or higher)
- An LLM API key (OpenAI, Groq, or other OpenAI-compatible provider)

## Installation

```bash
npm install
```

## Configuration

### MCP Servers

A `servers_config.json` file is included with default server configurations. You can edit it to add or modify servers:

```json
{
    "mcpServers": {
        "everything": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-everything"]
        },
        "memory": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-memory"]
        }
    }
}
```

### Environment Variables

Copy `.env.example` to `.env` and set your LLM API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
LLM_API_KEY=your_api_key_here
```

## Usage

### Running the Chatbot

```bash
# Set your LLM API key
export LLM_API_KEY=your_api_key_here

# Run the chatbot
npm start
```

Or with a custom config file:

```bash
npm start path/to/config.json
```

### Chat Commands

- Type your questions or messages
- Type `quit` or `exit` to end the session
- Press `Ctrl+C` to force exit

## Development

### Building

```bash
npm run build
```

This will compile TypeScript files to the `dist` directory.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

The test suite includes:
- Configuration loading tests
- Tool discovery and execution tests
- Chat session management tests
- Multi-turn conversation tests

## Architecture

The chatbot consists of several key components:

- **ChatSession**: Orchestrates the interaction between user, LLM, and MCP servers
- **SimpleLLMClient**: Handles communication with OpenAI-compatible LLM APIs
- **Config Loading**: Manages MCP server configurations
- **Tool Discovery**: Automatically discovers tools from all connected servers
- **Tool Execution**: Routes tool calls to the appropriate MCP server

## Customization

### Using a Different LLM Provider

The `SimpleLLMClient` is compatible with any OpenAI-compatible API. You can customize the endpoint and model:

```typescript
const llmClient = new SimpleLLMClient(
    apiKey,
    'https://api.openai.com/v1/chat/completions', // OpenAI endpoint
    'gpt-4' // Model name
);
```

### Adding Custom Servers

Edit `servers_config.json` to add your own MCP servers:

```json
{
    "mcpServers": {
        "your-server": {
            "command": "node",
            "args": ["path/to/your/server.js"],
            "env": {
                "CUSTOM_VAR": "value"
            }
        }
    }
}
```

## License

MIT
