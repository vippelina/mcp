/**
 * Tool call detection - language-agnostic approaches to determine
 * if an LLM response is requesting a tool call
 */

import type { StructuredOutputResult, ToolCallRequest } from './types.js';

/**
 * Attempts to parse JSON from LLM response to detect tool call requests
 * This is a language-agnostic approach that works with any LLM that can output JSON
 * 
 * Expected JSON format:
 * {
 *   "tool": "tool-name",
 *   "arguments": { "arg1": "value1", ... }
 * }
 */
export function detectToolCallFromJSON(response: string): StructuredOutputResult {
    try {
        // Try to parse the entire response as JSON
        const parsed = JSON.parse(response.trim());
        
        // Check if it matches our tool call format
        if (
            parsed &&
            typeof parsed === 'object' &&
            'tool' in parsed &&
            'arguments' in parsed &&
            typeof parsed.tool === 'string' &&
            typeof parsed.arguments === 'object'
        ) {
            return {
                isToolCall: true,
                toolCallRequest: {
                    toolName: parsed.tool,
                    arguments: parsed.arguments as Record<string, unknown>
                },
                rawResponse: response,
                detectionMethod: 'json-parsing'
            };
        }
    } catch {
        // Not valid JSON or doesn't match expected format
    }

    // Try to find JSON embedded in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (
                parsed &&
                typeof parsed === 'object' &&
                'tool' in parsed &&
                'arguments' in parsed &&
                typeof parsed.tool === 'string' &&
                typeof parsed.arguments === 'object'
            ) {
                return {
                    isToolCall: true,
                    toolCallRequest: {
                        toolName: parsed.tool,
                        arguments: parsed.arguments as Record<string, unknown>
                    },
                    rawResponse: response,
                    detectionMethod: 'json-parsing'
                };
            }
        } catch {
            // Embedded JSON doesn't match expected format
        }
    }

    return {
        isToolCall: false,
        rawResponse: response,
        detectionMethod: 'json-parsing'
    };
}

/**
 * Detects tool calls using text pattern analysis
 * This provides a fallback method for LLMs that might not reliably output JSON
 */
export function detectToolCallFromText(response: string): StructuredOutputResult {
    const lowerResponse = response.toLowerCase();
    
    // Look for common patterns that indicate tool usage intent
    const toolCallPatterns = [
        /(?:use|call|invoke)\s+(?:the\s+)?tool[:\s]+([a-zA-Z_-]+)/i,
        /tool[:\s]+([a-zA-Z_-]+)/i,
        /\[tool:\s*([a-zA-Z_-]+)\]/i
    ];

    for (const pattern of toolCallPatterns) {
        const match = response.match(pattern);
        if (match && match[1]) {
            // Try to extract arguments from the surrounding text
            const args: Record<string, unknown> = {};
            
            // Look for key-value pairs near the tool name
            const argPattern = /([a-zA-Z_]+):\s*["']?([^"',}\n]+)["']?/g;
            let argMatch;
            while ((argMatch = argPattern.exec(response)) !== null) {
                args[argMatch[1]] = argMatch[2].trim();
            }

            return {
                isToolCall: true,
                toolCallRequest: {
                    toolName: match[1],
                    arguments: args
                },
                rawResponse: response,
                detectionMethod: 'text-analysis'
            };
        }
    }

    return {
        isToolCall: false,
        rawResponse: response,
        detectionMethod: 'text-analysis'
    };
}

/**
 * Primary detection function that tries multiple methods
 * Returns the first successful detection or marks as not a tool call
 */
export function detectToolCall(response: string): StructuredOutputResult {
    // Try JSON parsing first (most reliable)
    const jsonResult = detectToolCallFromJSON(response);
    if (jsonResult.isToolCall) {
        return jsonResult;
    }

    // Fall back to text analysis
    const textResult = detectToolCallFromText(response);
    if (textResult.isToolCall) {
        return textResult;
    }

    // No tool call detected
    return {
        isToolCall: false,
        rawResponse: response,
        detectionMethod: 'json-parsing'
    };
}
