/**
 * Structured Output Test - Main module
 * 
 * This module demonstrates language-agnostic approaches to getting structured output
 * from LLMs, specifically for detecting tool call requests.
 */

export * from './types.js';
export * from './toolCallDetection.js';
export * from './mcpClient.js';
export * from './providers/index.js';

import type { Client } from '@modelcontextprotocol/sdk/client';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { connectToAllServers, getAllTools, loadConfig, cleanupClients } from './mcpClient.js';
import { OpenAIProvider, GroqProvider, AnthropicProvider } from './providers/index.js';
import { detectToolCall } from './toolCallDetection.js';
import type { LLMProvider, Message } from './types.js';

/**
 * Main test orchestrator for structured output testing
 */
export class StructuredOutputTester {
    private clients?: Map<string, Client>;
    private tools: Tool[] = [];
    private providers: Map<string, LLMProvider> = new Map();

    /**
     * Initialize the tester with MCP servers and LLM providers
     */
    async initialize(configPath: string = './servers_config.json'): Promise<void> {
        // Load and connect to MCP servers
        console.log('Loading MCP server configuration...');
        const config = await loadConfig(configPath);
        
        console.log('Connecting to MCP servers...');
        this.clients = await connectToAllServers(config);
        console.log(`Connected to ${this.clients.size} server(s)`);

        // Get all available tools
        console.log('Discovering tools...');
        this.tools = await getAllTools(this.clients);
        console.log(`Found ${this.tools.length} tool(s):`);
        this.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
        });

        // Initialize LLM providers if API keys are available
        this.initializeProviders();
    }

    /**
     * Initialize available LLM providers based on environment variables
     */
    private initializeProviders(): void {
        if (process.env.OPENAI_API_KEY) {
            this.providers.set('openai', new OpenAIProvider({
                apiKey: process.env.OPENAI_API_KEY
            }));
            console.log('✓ OpenAI provider initialized');
        }

        if (process.env.ANTHROPIC_API_KEY) {
            this.providers.set('anthropic', new AnthropicProvider({
                apiKey: process.env.ANTHROPIC_API_KEY
            }));
            console.log('✓ Anthropic provider initialized');
        }

        if (process.env.GROQ_API_KEY) {
            this.providers.set('groq', new GroqProvider({
                apiKey: process.env.GROQ_API_KEY
            }));
            console.log('✓ Groq provider initialized');
        }

        if (this.providers.size === 0) {
            console.warn('⚠ No LLM providers initialized. Set at least one API key in environment variables.');
        }
    }

    /**
     * Test a specific scenario with a user query
     */
    async testScenario(
        providerName: string,
        userQuery: string
    ): Promise<{
        provider: string;
        query: string;
        llmResponse: string;
        detectionResult: ReturnType<typeof detectToolCall>;
    }> {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider '${providerName}' not initialized. Available: ${[...this.providers.keys()].join(', ')}`);
        }

        console.log(`\n--- Testing with ${providerName} ---`);
        console.log(`User query: "${userQuery}"`);

        // Create conversation with user query
        const messages: Message[] = [
            { role: 'user', content: userQuery }
        ];

        // Get LLM response
        console.log('Generating LLM response...');
        const llmResponse = await provider.generateResponse(messages, this.tools);
        console.log(`LLM response: ${llmResponse.substring(0, 200)}${llmResponse.length > 200 ? '...' : ''}`);

        // Detect tool call
        const detectionResult = detectToolCall(llmResponse);
        console.log(`\nTool call detected: ${detectionResult.isToolCall}`);
        if (detectionResult.isToolCall) {
            console.log(`Detection method: ${detectionResult.detectionMethod}`);
            console.log(`Tool: ${detectionResult.toolCallRequest?.toolName}`);
            console.log(`Arguments:`, JSON.stringify(detectionResult.toolCallRequest?.arguments, null, 2));
        }

        return {
            provider: providerName,
            query: userQuery,
            llmResponse,
            detectionResult
        };
    }

    /**
     * Test all available providers with the same scenario
     */
    async testAllProviders(userQuery: string): Promise<void> {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing all providers with query: "${userQuery}"`);
        console.log('='.repeat(60));

        for (const providerName of this.providers.keys()) {
            try {
                await this.testScenario(providerName, userQuery);
            } catch (error) {
                console.error(`Error testing ${providerName}:`, error);
            }
        }
    }

    /**
     * Get list of available providers
     */
    getAvailableProviders(): string[] {
        return [...this.providers.keys()];
    }

    /**
     * Get list of available tools
     */
    getAvailableTools(): Tool[] {
        return [...this.tools];
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        if (this.clients) {
            await cleanupClients(this.clients);
        }
    }
}

/**
 * Example usage / demo
 */
export async function main(): Promise<void> {
    const tester = new StructuredOutputTester();

    try {
        // Initialize
        await tester.initialize();

        // Example scenarios that should trigger tool calls
        const scenarios = [
            'Add 15 and 27',
            'What is the result of multiplying 8 by 9?',
            'Can you echo back the message "Hello World"?',
            'Tell me a joke' // This should NOT trigger a tool call
        ];

        // Test each scenario with all available providers
        for (const scenario of scenarios) {
            await tester.testAllProviders(scenario);
        }

    } catch (error) {
        console.error('Error during testing:', error);
    } finally {
        await tester.cleanup();
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
