/**
 * Tests for tool call detection logic
 */

import { describe, it, expect } from 'vitest';
import {
    detectToolCall,
    detectToolCallFromJSON,
    detectToolCallFromText
} from '../src/toolCallDetection.js';

describe('Tool Call Detection', () => {
    describe('detectToolCallFromJSON', () => {
        it('should detect valid JSON tool call request', () => {
            const response = JSON.stringify({
                tool: 'echo',
                arguments: { message: 'test' }
            });

            const result = detectToolCallFromJSON(response);

            expect(result.isToolCall).toBe(true);
            expect(result.detectionMethod).toBe('json-parsing');
            expect(result.toolCallRequest?.toolName).toBe('echo');
            expect(result.toolCallRequest?.arguments).toEqual({ message: 'test' });
        });

        it('should detect JSON embedded in text', () => {
            const response = 'Here is the tool call: {"tool": "add", "arguments": {"a": 5, "b": 3}} for you';

            const result = detectToolCallFromJSON(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('add');
            expect(result.toolCallRequest?.arguments).toEqual({ a: 5, b: 3 });
        });

        it('should return false for plain text without tool call', () => {
            const response = 'This is just a normal response';

            const result = detectToolCallFromJSON(response);

            expect(result.isToolCall).toBe(false);
        });

        it('should return false for JSON without tool/arguments fields', () => {
            const response = JSON.stringify({ message: 'hello', type: 'greeting' });

            const result = detectToolCallFromJSON(response);

            expect(result.isToolCall).toBe(false);
        });

        it('should handle multiline JSON', () => {
            const response = `{
    "tool": "multiply",
    "arguments": {
        "x": 8,
        "y": 9
    }
}`;

            const result = detectToolCallFromJSON(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('multiply');
        });
    });

    describe('detectToolCallFromText', () => {
        it('should detect tool usage patterns in text', () => {
            const response = 'I will use tool: add to calculate the sum';

            const result = detectToolCallFromText(response);

            expect(result.isToolCall).toBe(true);
            expect(result.detectionMethod).toBe('text-analysis');
            expect(result.toolCallRequest?.toolName).toBe('add');
        });

        it('should detect [tool: name] format', () => {
            const response = 'Let me help with [tool: echo]';

            const result = detectToolCallFromText(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('echo');
        });

        it('should return false for text without tool patterns', () => {
            const response = 'This is a simple answer to your question';

            const result = detectToolCallFromText(response);

            expect(result.isToolCall).toBe(false);
        });

        it('should extract arguments from text when present', () => {
            const response = 'Using tool: add with value: 5, other: 10';

            const result = detectToolCallFromText(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('add');
            // Arguments extraction from text is best-effort
            expect(result.toolCallRequest?.arguments).toBeDefined();
        });
    });

    describe('detectToolCall (combined)', () => {
        it('should prefer JSON detection over text detection', () => {
            const response = 'Using tool: wrong {"tool": "correct", "arguments": {}}';

            const result = detectToolCall(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('correct');
            expect(result.detectionMethod).toBe('json-parsing');
        });

        it('should fall back to text detection if JSON fails', () => {
            const response = 'I will call tool: fallback_tool to help';

            const result = detectToolCall(response);

            expect(result.isToolCall).toBe(true);
            expect(result.toolCallRequest?.toolName).toBe('fallback_tool');
            expect(result.detectionMethod).toBe('text-analysis');
        });

        it('should return false when no detection method succeeds', () => {
            const response = 'Just a normal conversational response';

            const result = detectToolCall(response);

            expect(result.isToolCall).toBe(false);
        });
    });
});
