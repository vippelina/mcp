/**
 * Demo script - Shows how tool call detection works without requiring API keys
 * This demonstrates the core functionality with mock LLM responses
 */

import { detectToolCall } from './src/toolCallDetection.js';

console.log('='.repeat(70));
console.log('Tool Call Detection Demo');
console.log('='.repeat(70));

// Test Case 1: Valid JSON tool call
console.log('\n--- Test 1: Valid JSON Tool Call ---');
const test1 = '{"tool": "echo", "arguments": {"message": "Hello World"}}';
console.log('LLM Response:', test1);
const result1 = detectToolCall(test1);
console.log('Is Tool Call?:', result1.isToolCall);
console.log('Detection Method:', result1.detectionMethod);
if (result1.isToolCall) {
    console.log('Tool Name:', result1.toolCallRequest?.toolName);
    console.log('Arguments:', JSON.stringify(result1.toolCallRequest?.arguments, null, 2));
}

// Test Case 2: JSON embedded in text
console.log('\n--- Test 2: JSON Embedded in Text ---');
const test2 = 'Let me help you with that. {"tool": "add", "arguments": {"a": 15, "b": 27}} This will give you the answer.';
console.log('LLM Response:', test2);
const result2 = detectToolCall(test2);
console.log('Is Tool Call?:', result2.isToolCall);
console.log('Detection Method:', result2.detectionMethod);
if (result2.isToolCall) {
    console.log('Tool Name:', result2.toolCallRequest?.toolName);
    console.log('Arguments:', JSON.stringify(result2.toolCallRequest?.arguments, null, 2));
}

// Test Case 3: Text pattern detection
console.log('\n--- Test 3: Text Pattern Detection ---');
const test3 = 'I will use tool: multiply to calculate the result';
console.log('LLM Response:', test3);
const result3 = detectToolCall(test3);
console.log('Is Tool Call?:', result3.isToolCall);
console.log('Detection Method:', result3.detectionMethod);
if (result3.isToolCall) {
    console.log('Tool Name:', result3.toolCallRequest?.toolName);
}

// Test Case 4: Normal response (no tool call)
console.log('\n--- Test 4: Normal Response (No Tool Call) ---');
const test4 = 'The weather is sunny today. How can I help you further?';
console.log('LLM Response:', test4);
const result4 = detectToolCall(test4);
console.log('Is Tool Call?:', result4.isToolCall);

// Test Case 5: Multi-line JSON (formatted)
console.log('\n--- Test 5: Multi-line JSON ---');
const test5 = `{
    "tool": "search",
    "arguments": {
        "query": "machine learning",
        "limit": 10
    }
}`;
console.log('LLM Response:', test5);
const result5 = detectToolCall(test5);
console.log('Is Tool Call?:', result5.isToolCall);
console.log('Detection Method:', result5.detectionMethod);
if (result5.isToolCall) {
    console.log('Tool Name:', result5.toolCallRequest?.toolName);
    console.log('Arguments:', JSON.stringify(result5.toolCallRequest?.arguments, null, 2));
}

console.log('\n' + '='.repeat(70));
console.log('Demo Complete!');
console.log('='.repeat(70));
console.log('\nKey Takeaways:');
console.log('- JSON parsing is the most reliable method');
console.log('- Works even when JSON is embedded in text');
console.log('- Falls back to text pattern analysis when needed');
console.log('- Language-agnostic approach works across all LLMs');
console.log('\nTo test with real LLMs, set API keys and run: npm start');
