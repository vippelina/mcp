/**
 * Core types and interfaces for structured output testing
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Represents a message in the conversation
 */
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Represents a tool call request detected from LLM output
 */
export interface ToolCallRequest {
    toolName: string;
    arguments: Record<string, unknown>;
}

/**
 * Result of analyzing LLM output for tool call requests
 */
export interface StructuredOutputResult {
    isToolCall: boolean;
    toolCallRequest?: ToolCallRequest;
    rawResponse: string;
    detectionMethod: 'json-parsing' | 'text-analysis' | 'native-tool-call';
}

/**
 * Abstract interface for LLM providers
 * Allows testing different LLM APIs in a language-agnostic way
 */
export interface LLMProvider {
    /**
     * Name of the provider (e.g., 'openai', 'anthropic', 'groq')
     */
    readonly name: string;

    /**
     * Generate a response from the LLM
     * @param messages Conversation history
     * @param tools Available tools that the LLM can use
     * @returns The LLM's response
     */
    generateResponse(messages: Message[], tools: Tool[]): Promise<string>;

    /**
     * Check if this provider supports native tool calling
     * (vs. relying on prompt engineering + JSON parsing)
     */
    supportsNativeToolCalling(): boolean;
}

/**
 * Configuration for LLM providers
 */
export interface LLMProviderConfig {
    apiKey: string;
    model?: string;
    endpoint?: string;
}
