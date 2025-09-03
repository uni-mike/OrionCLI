/**
 * Grok Client - Compatibility layer for Azure OpenAI
 * Maps grok-cli's client interface to our Azure implementation
 */

export { 
  AzureClient as GrokClient,
  AzureMessage as GrokMessage,
  AzureTool as GrokTool,
  AzureToolCall as GrokToolCall,
  AzureResponse as GrokResponse,
  AzureConfig as GrokConfig
} from '../azure/client';

// Re-export types for compatibility
export type { AzureMessage as Message } from '../azure/client';