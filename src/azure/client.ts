/**
 * Azure OpenAI Client - Handles all AI model interactions
 * Replaces grok/client.ts with Azure OpenAI support
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat';
import chalk from 'chalk';

export interface AzureConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

export type AzureMessage = ChatCompletionMessageParam;

export interface AzureTool extends ChatCompletionTool {}

export interface AzureToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AzureResponse {
  content: string | null;
  tool_calls?: AzureToolCall[];
  finish_reason?: string;
}

export class AzureClient {
  private client: OpenAI;
  private config: AzureConfig;
  private abortController?: AbortController;

  constructor(config: AzureConfig) {
    this.config = config;
    this.client = this.createClient(config);
  }

  private createClient(config: AzureConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments/${config.deployment}`,
      defaultQuery: { 'api-version': config.apiVersion },
      defaultHeaders: {
        'api-key': config.apiKey,
      },
    });
  }

  public updateConfig(config: Partial<AzureConfig>): void {
    this.config = { ...this.config, ...config };
    this.client = this.createClient(this.config);
  }

  public async complete(params: {
    messages: AzureMessage[];
    tools?: AzureTool[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<AzureResponse> {
    try {
      this.abortController = new AbortController();

      const completion = await this.client.chat.completions.create({
        model: this.config.deployment,
        messages: params.messages,
        tools: params.tools,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
        stream: false,
      }, {
        signal: this.abortController.signal,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No response from Azure OpenAI');
      }

      return {
        content: choice.message.content,
        tool_calls: choice.message.tool_calls as AzureToolCall[],
        finish_reason: choice.finish_reason,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error?.message || error.message;
        
        switch (status) {
          case 401:
            throw new Error('Invalid API key. Please check your Azure OpenAI credentials.');
          case 429:
            throw new Error('Rate limit exceeded. Please try again later.');
          case 404:
            throw new Error(`Deployment "${this.config.deployment}" not found.`);
          default:
            throw new Error(`Azure OpenAI error (${status}): ${message}`);
        }
      }
      
      throw new Error(`Failed to connect to Azure OpenAI: ${error.message}`);
    }
  }

  public async stream(params: {
    messages: AzureMessage[];
    tools?: AzureTool[];
    onChunk: (chunk: string) => void;
    onToolCall?: (toolCall: AzureToolCall) => void;
    model?: string;
    temperature?: number;
  }): Promise<void> {
    try {
      this.abortController = new AbortController();

      const stream = await this.client.chat.completions.create({
        model: this.config.deployment,
        messages: params.messages,
        tools: params.tools,
        temperature: params.temperature ?? 0.7,
        stream: true,
      }, {
        signal: this.abortController.signal,
      });

      let accumulatedContent = '';
      let accumulatedToolCalls: Map<number, AzureToolCall> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        if (delta?.content) {
          accumulatedContent += delta.content;
          params.onChunk(delta.content);
        }
        
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index!;
            
            if (!accumulatedToolCalls.has(index)) {
              accumulatedToolCalls.set(index, {
                id: toolCallDelta.id!,
                type: 'function',
                function: {
                  name: toolCallDelta.function?.name || '',
                  arguments: '',
                },
              });
            }
            
            const toolCall = accumulatedToolCalls.get(index)!;
            
            if (toolCallDelta.function?.name) {
              toolCall.function.name = toolCallDelta.function.name;
            }
            
            if (toolCallDelta.function?.arguments) {
              toolCall.function.arguments += toolCallDelta.function.arguments;
            }
          }
        }
        
        if (chunk.choices[0]?.finish_reason === 'tool_calls' && params.onToolCall) {
          for (const toolCall of accumulatedToolCalls.values()) {
            params.onToolCall(toolCall);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      throw error;
    }
  }

  public cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  public getConfig(): AzureConfig {
    return { ...this.config };
  }

  public isConfigured(): boolean {
    return !!(this.config.endpoint && this.config.apiKey && this.config.deployment);
  }
}