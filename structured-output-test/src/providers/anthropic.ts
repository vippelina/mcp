/**
 * Anthropic Claude LLM Provider
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LLMProvider, LLMProviderConfig, Message } from '../types.js';

export class AnthropicProvider implements LLMProvider {
    readonly name = 'anthropic';
    private readonly apiKey: string;
    private readonly model: string;
    private readonly endpoint: string;

    constructor(config: LLMProviderConfig) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'claude-3-5-sonnet-20241022';
        this.endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
    }

    supportsNativeToolCalling(): boolean {
        return true;
    }

    private buildToolPrompt(tools: Tool[]): string {
        const toolDescriptions = tools.map(tool => {
            let desc = `Tool: ${tool.name}\n`;
            desc += `Description: ${tool.description || 'No description'}\n`;
            desc += 'Arguments:\n';
            
            if (tool.inputSchema && typeof tool.inputSchema === 'object' && 'properties' in tool.inputSchema) {
                const schema = tool.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
                const props = schema.properties || {};
                const argsList: string[] = [];
                
                for (const [paramName, paramInfo] of Object.entries(props)) {
                    const info = paramInfo as { description?: string; type?: string };
                    let argDesc = `- ${paramName}`;
                    if (info.type) {
                        argDesc += ` (${info.type})`;
                    }
                    if (info.description) {
                        argDesc += `: ${info.description}`;
                    }
                    if (schema.required?.includes(paramName)) {
                        argDesc += ' (required)';
                    }
                    argsList.push(argDesc);
                }
                desc += argsList.join('\n');
            }
            
            return desc;
        }).join('\n\n');

        return `You have access to the following tools:\n\n${toolDescriptions}\n\n` +
            'When you need to use a tool, respond ONLY with a JSON object in this exact format:\n' +
            '{\n' +
            '    "tool": "tool-name",\n' +
            '    "arguments": {\n' +
            '        "argument-name": "value"\n' +
            '    }\n' +
            '}\n\n' +
            'Do not include any other text in your response when calling a tool.\n' +
            'If you do not need to use a tool, respond normally with text.';
    }

    async generateResponse(messages: Message[], tools: Tool[]): Promise<string> {
        // Anthropic requires system message separate from messages array
        const systemPrompt = this.buildToolPrompt(tools);
        const apiMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                system: systemPrompt,
                messages: apiMessages,
                max_tokens: 1024,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json() as {
            content: Array<{ type: string; text: string }>;
        };

        return data.content[0]?.text || 'No response from LLM';
    }
}
