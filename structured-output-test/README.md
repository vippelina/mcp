# Structured Output Test

A barebone example to investigate language-agnostic ways to get structured output from LLMs, specifically for detecting tool call requests.

## Overview

This project explores how to reliably determine whether an LLM response is requesting a tool call, regardless of which LLM provider you're using. It provides a framework for testing different LLM providers (OpenAI, Anthropic, Groq) with real MCP tools to validate structured output detection.

## Key Concepts

### The Problem

When integrating LLMs with tools (via MCP or other protocols), you need to determine:
1. Is the LLM requesting a tool call?
2. If so, which tool and with what arguments?

Different LLMs handle this differently:
- Some have native tool calling APIs
- Others rely on prompt engineering + JSON output
- Detection needs to work across all providers

### The Solution

This project implements **language-agnostic** detection methods:

1. **JSON Parsing** - Most reliable method
   - LLM outputs: `{"tool": "tool-name", "arguments": {...}}`
   - Works with any LLM that can output JSON

2. **Text Pattern Analysis** - Fallback method
   - Detects patterns like "use tool: name" or "[tool: name]"
   - More flexible but less reliable

3. **Native Tool Calling** - Provider-specific
   - Some providers (OpenAI, Anthropic) have native APIs
   - Can be used when available

## Project Structure

```
structured-output-test/
├── src/
│   ├── index.ts                 # Main orchestrator
│   ├── types.ts                 # Core type definitions
│   ├── toolCallDetection.ts     # Detection logic
│   ├── mcpClient.ts             # MCP server integration
│   └── providers/               # LLM provider implementations
│       ├── openai.ts
│       ├── anthropic.ts
│       └── groq.ts
├── test/
│   ├── toolCallDetection.test.ts  # Unit tests for detection
│   └── integration.test.ts         # Integration tests with MCP
├── servers_config.json          # MCP server configuration
└── package.json
```

## Installation

```bash
npm install
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure at least one LLM provider:

```bash
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### MCP Servers

Edit `servers_config.json` to configure which MCP servers to connect to:

```json
{
    "mcpServers": {
        "everything": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-everything"]
        }
    }
}
```

The `@modelcontextprotocol/server-everything` provides various test tools including:
- `echo` - Echo back a message
- `add` - Add two numbers
- And many more...

## Usage

### Quick Demo (No API Keys Required)

See the tool call detection in action without any API keys:

```bash
npm run demo
```

This runs through 5 test cases showing how the detection logic works with different LLM response formats.

### Run the Example

```bash
# Set API key(s)
export GROQ_API_KEY=your_key_here

# Run the example
npm start
```

This will:
1. Connect to configured MCP servers
2. Discover available tools
3. Initialize configured LLM providers
4. Test various scenarios with all providers
5. Show detection results

### Run Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Build the project
npm run build
```

## Testing Scenarios

The example includes several test scenarios:

1. **Tool Call Scenarios** (should detect tool call):
   - "Add 15 and 27"
   - "What is the result of multiplying 8 by 9?"
   - "Can you echo back the message 'Hello World'?"

2. **Direct Response Scenarios** (should NOT detect tool call):
   - "Tell me a joke"
   - "What is the weather like?"

## API Usage

### Basic Example

```typescript
import { StructuredOutputTester } from './src/index.js';

const tester = new StructuredOutputTester();

// Initialize with MCP servers
await tester.initialize('./servers_config.json');

// Test a scenario with a specific provider
const result = await tester.testScenario(
    'groq',
    'Add 5 and 10'
);

console.log('Is tool call?', result.detectionResult.isToolCall);
console.log('Tool name:', result.detectionResult.toolCallRequest?.toolName);

// Cleanup
await tester.cleanup();
```

### Using Detection Directly

```typescript
import { detectToolCall } from './src/toolCallDetection.js';

// Test JSON detection
const llmResponse = '{"tool": "echo", "arguments": {"message": "test"}}';
const result = detectToolCall(llmResponse);

if (result.isToolCall) {
    console.log('Tool:', result.toolCallRequest.toolName);
    console.log('Args:', result.toolCallRequest.arguments);
    console.log('Method:', result.detectionMethod);
}
```

### Custom LLM Provider

```typescript
import type { LLMProvider, Message } from './src/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

class CustomProvider implements LLMProvider {
    readonly name = 'custom';

    supportsNativeToolCalling(): boolean {
        return false;
    }

    async generateResponse(messages: Message[], tools: Tool[]): Promise<string> {
        // Your LLM API call here
        return '{"tool": "echo", "arguments": {"message": "test"}}';
    }
}
```

## Key Findings

### What Works Well

1. **JSON-based detection** is the most reliable method
   - Works across all LLM providers
   - Easy to parse and validate
   - Clear error handling

2. **Prompt engineering** can guide LLMs to output correct format
   - Explicit instructions in system prompt
   - Examples in few-shot prompts
   - Format specification

3. **MCP integration** provides real tools for testing
   - Tools have proper schemas
   - Realistic test scenarios
   - Easy to add more tools

### Challenges

1. **Consistency across LLMs**
   - Different models have different adherence to instructions
   - Some better at JSON output than others
   - May need provider-specific adjustments

2. **Edge cases**
   - LLM might include explanation + JSON
   - Partial JSON in error cases
   - Multiple tool calls in one response

3. **Error handling**
   - Invalid JSON from LLM
   - Missing required arguments
   - Non-existent tool names

## Architecture Decisions

### Why Language-Agnostic?

The detection logic is designed to work with **any** LLM:
- No dependency on provider-specific APIs
- Works with prompt engineering alone
- Portable across different LLM services

### Why JSON Format?

```json
{
    "tool": "tool-name",
    "arguments": {
        "arg1": "value1"
    }
}
```

- Simple and unambiguous
- Easy to parse in any language
- Matches common tool calling patterns
- Extensible (can add more fields)

### Why MCP Integration?

- Provides real, working tools for testing
- Realistic test scenarios
- Standard protocol for tool integration
- Easy to add more tools

## Future Enhancements

- [ ] Support for multiple tool calls in one response
- [ ] Streaming detection (detect as LLM generates)
- [ ] Confidence scores for detection
- [ ] Auto-correction for malformed JSON
- [ ] Support for nested tool calls
- [ ] Validation against tool schemas
- [ ] Performance benchmarks across providers

## Testing

The test suite includes:

1. **Unit tests** (`toolCallDetection.test.ts`)
   - JSON detection
   - Text pattern detection
   - Edge cases

2. **Integration tests** (`integration.test.ts`)
   - MCP server connection
   - Tool discovery
   - End-to-end scenarios with mock LLM
   - Real tool execution

Run tests:
```bash
npm test
```

## Contributing

This is a research/learning project. Feel free to:
- Add new LLM providers
- Improve detection algorithms
- Add more test scenarios
- Document findings

## License

MIT
