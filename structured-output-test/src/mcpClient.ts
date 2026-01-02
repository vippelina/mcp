/**
 * MCP Client utilities for tool discovery and management
 */

import { readFile } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface ServerConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
}

interface Config {
    mcpServers: Record<string, ServerConfig>;
}

/**
 * Load MCP server configuration from a JSON file
 */
export async function loadConfig(path: string): Promise<Config> {
    const content = await readFile(path, 'utf-8');
    const config = JSON.parse(content) as Config;

    if (!config.mcpServers) {
        throw new Error('Config missing required field: mcpServers');
    }

    return config;
}

/**
 * Connect to a single MCP server via STDIO
 */
export async function connectToServer(name: string, config: ServerConfig): Promise<Client> {
    const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env
    });

    const client = new Client({
        name: `structured-output-test-${name}`,
        version: '1.0.0'
    });

    await client.connect(transport);
    return client;
}

/**
 * Get all available tools from a connected MCP client
 */
export async function getToolsFromClient(client: Client): Promise<Tool[]> {
    const response = await client.listTools();
    return response.tools;
}

/**
 * Get all tools from all connected servers
 */
export async function getAllTools(clients: Map<string, Client>): Promise<Tool[]> {
    const allTools: Tool[] = [];
    
    for (const client of clients.values()) {
        const tools = await getToolsFromClient(client);
        allTools.push(...tools);
    }
    
    return allTools;
}

/**
 * Connect to all MCP servers from config
 */
export async function connectToAllServers(config: Config): Promise<Map<string, Client>> {
    const entries = Object.entries(config.mcpServers);
    const clients = await Promise.all(
        entries.map(([name, serverConfig]) => connectToServer(name, serverConfig))
    );

    const clientMap = new Map<string, Client>();
    entries.forEach(([name], index) => {
        clientMap.set(name, clients[index]!);
    });

    return clientMap;
}

/**
 * Clean up all MCP client connections
 */
export async function cleanupClients(clients: Map<string, Client>): Promise<void> {
    for (const [name, client] of clients.entries()) {
        if (!client || !client.transport) continue;
        try {
            await client.transport.close();
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.warn(`Warning during cleanup of server ${name}: ${message}`);
        }
    }
}
