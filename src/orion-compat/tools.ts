/**
 * Grok Tools - Tool definitions and helpers
 * Compatibility layer for original grok-cli tools
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResponse {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

export function createToolDefinition(
  name: string,
  description: string,
  parameters: any
): ToolDefinition {
  return {
    name,
    description,
    parameters: {
      type: 'object',
      ...parameters,
    },
  };
}

export function parseToolArguments(args: string): any {
  try {
    return JSON.parse(args);
  } catch {
    return args;
  }
}

export function formatToolResponse(
  toolCallId: string,
  content: any
): ToolResponse {
  return {
    tool_call_id: toolCallId,
    role: 'tool',
    content: typeof content === 'string' ? content : JSON.stringify(content),
  };
}

// Tool names from original grok-cli
export const TOOL_NAMES = {
  BASH: 'bash',
  TEXT_EDITOR: 'text_editor',
  MORPH_EDITOR: 'morph_editor',
  SEARCH: 'search',
  TODO: 'todo',
  CONFIRMATION: 'confirmation',
} as const;

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES];
// Additional exports for compatibility
export const ORION_TOOLS = TOOL_NAMES;
export const getAllOrionTools = () => Object.values(TOOL_NAMES);
export const getMCPManager = () => null; // Placeholder
export const initializeMCPServers = async () => {};
export const addMCPToolsToOrionTools = () => {};
