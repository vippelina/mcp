/**
 * Integration tests with MCP servers and LLM providers
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { detectToolCall } from '../src/toolCallDetection.js';
import { loadConfig, getAllTools, cleanupClients } from '../src/mcpClient.js';
import type { LLMProvider, Message } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Integration Tests', () => {
    let testServer: McpServer;
    let client: Client;
    let tools: Tool[];

    beforeAll(async () => {
        // Create a test MCP server with sample tools
        testServer = new McpServer({
            name: 'test-server',
            version: '1.0.0'
        });

        // Register an echo tool
        testServer.registerTool(
            'echo',
            {
                description: 'Echoes back the message',
                inputSchema: {
                    message: z.string().describe('Message to echo')
                }
            },
            async ({ message }) => ({
                content: [{ type: 'text', text: `Echo: ${message}` }]
            })
        );

        // Register an add tool
        testServer.registerTool(
            'add',
            {
                description: 'Adds two numbers',
                inputSchema: {
                    a: z.number().describe('First number'),
                    b: z.number().describe('Second number')
                }
            },
            async ({ a, b }) => ({
                content: [{ type: 'text', text: `Result: ${a + b}` }]
            })
        );

        // Connect client to server using InMemoryTransport
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
        
        client = new Client(
            {
                name: 'test-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        );

        await Promise.all([
            client.connect(clientTransport),
            testServer.connect(serverTransport)
        ]);

        // Get tools
        const response = await client.listTools();
        tools = response.tools;
    });

    afterAll(async () => {
        if (client?.transport) {
            await client.transport.close().catch(() => {});
        }
        if (testServer) {
            await testServer.close();
        }
    });

    describe('MCP Client Integration', () => {
        it('should load config from file', async () => {
            const configPath = join(__dirname, 'test-config.json');
            const config = await loadConfig(configPath);

            expect(config).toBeDefined();
            expect(config.mcpServers).toBeDefined();
        });

        it('should discover tools from MCP server', async () => {
            expect(tools.length).toBeGreaterThan(0);
            
            const toolNames = tools.map(t => t.name);
            expect(toolNames).toContain('echo');
            expect(toolNames).toContain('add');
        });

        it('should get tool details including schema', () => {
            const echoTool = tools.find(t => t.name === 'echo');
            expect(echoTool).toBeDefined();
            expect(echoTool?.description).toBe('Echoes back the message');
            expect(echoTool?.inputSchema).toBeDefined();
        });
    });

    describe('LLM Provider Mock Integration', () => {
        // Mock LLM provider for testing
        class MockLLMProvider implements LLMProvider {
            readonly name = 'mock';
            private response: string;

            constructor(response: string) {
                this.response = response;
            }

            supportsNativeToolCalling(): boolean {
                return false;
            }

            async generateResponse(_messages: Message[], _tools: Tool[]): Promise<string> {
                return this.response;
            }
        }

        it('should detect tool call from LLM response that requests echo tool', async () => {
            // Simulate LLM responding with a tool call
            const mockProvider = new MockLLMProvider(
                JSON.stringify({
                    tool: 'echo',
                    arguments: { message: 'Hello World' }
                })
            );

            const messages: Message[] = [
                { role: 'user', content: 'Echo back "Hello World"' }
            ];

            const llmResponse = await mockProvider.generateResponse(messages, tools);
            const detection = detectToolCall(llmResponse);

            expect(detection.isToolCall).toBe(true);
            expect(detection.toolCallRequest?.toolName).toBe('echo');
            expect(detection.toolCallRequest?.arguments).toEqual({ message: 'Hello World' });
        });

        it('should detect tool call from LLM response that requests add tool', async () => {
            const mockProvider = new MockLLMProvider(
                JSON.stringify({
                    tool: 'add',
                    arguments: { a: 15, b: 27 }
                })
            );

            const messages: Message[] = [
                { role: 'user', content: 'Add 15 and 27' }
            ];

            const llmResponse = await mockProvider.generateResponse(messages, tools);
            const detection = detectToolCall(llmResponse);

            expect(detection.isToolCall).toBe(true);
            expect(detection.toolCallRequest?.toolName).toBe('add');
            expect(detection.toolCallRequest?.arguments).toEqual({ a: 15, b: 27 });
        });

        it('should not detect tool call when LLM provides direct answer', async () => {
            const mockProvider = new MockLLMProvider(
                'The sum of 15 and 27 is 42.'
            );

            const messages: Message[] = [
                { role: 'user', content: 'What is 15 plus 27?' }
            ];

            const llmResponse = await mockProvider.generateResponse(messages, tools);
            const detection = detectToolCall(llmResponse);

            expect(detection.isToolCall).toBe(false);
        });

        it('should handle scenario where user asks question that triggers tool need', async () => {
            // This simulates the real-world scenario:
            // 1. User asks a question
            // 2. LLM realizes it needs to use a tool
            // 3. LLM responds with tool call request
            // 4. We detect it as a tool call

            const userQuery = 'Can you echo the message "Testing tool detection"?';
            
            // Mock what the LLM would respond with
            const mockProvider = new MockLLMProvider(
                JSON.stringify({
                    tool: 'echo',
                    arguments: { message: 'Testing tool detection' }
                })
            );

            const messages: Message[] = [
                { role: 'user', content: userQuery }
            ];

            // LLM generates response
            const llmResponse = await mockProvider.generateResponse(messages, tools);

            // We detect if it's a tool call
            const detection = detectToolCall(llmResponse);

            // Verify detection worked
            expect(detection.isToolCall).toBe(true);
            expect(detection.toolCallRequest?.toolName).toBe('echo');
            expect(detection.toolCallRequest?.arguments.message).toBe('Testing tool detection');

            // In a real scenario, we would now execute the tool:
            const toolResult = await client.callTool({
                name: 'echo',
                arguments: { message: 'Testing tool detection' }
            });

            expect(toolResult.content[0]).toMatchObject({
                type: 'text',
                text: 'Echo: Testing tool detection'
            });
        });
    });

    describe('End-to-End Tool Call Scenario', () => {
        it('should complete full workflow: user query -> detect tool call -> execute tool', async () => {
            // Step 1: User asks a question
            const userQuery = 'Add 8 and 9 please';

            // Step 2: LLM recognizes need for tool and responds with tool call
            // (simulated with mock)
            const mockLLMResponse = JSON.stringify({
                tool: 'add',
                arguments: { a: 8, b: 9 }
            });

            // Step 3: Detect tool call from LLM response
            const detection = detectToolCall(mockLLMResponse);
            expect(detection.isToolCall).toBe(true);
            expect(detection.toolCallRequest?.toolName).toBe('add');

            // Step 4: Execute the tool
            const toolResult = await client.callTool({
                name: detection.toolCallRequest!.toolName,
                arguments: detection.toolCallRequest!.arguments
            });

            expect(toolResult.content[0]).toMatchObject({
                type: 'text',
                text: 'Result: 17'
            });

            // Step 5: In a real scenario, this result would be sent back to the LLM
            // for a natural language response to the user
        });
    });
});
