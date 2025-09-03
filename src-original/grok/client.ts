import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat";

export type GrokMessage = ChatCompletionMessageParam;

export interface GrokTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface GrokToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface SearchParameters {
  mode?: "auto" | "on" | "off";
  // sources removed - let API use default sources to avoid format issues
}

export interface SearchOptions {
  search_parameters?: SearchParameters;
}

export interface GrokResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: GrokToolCall[];
    };
    finish_reason: string;
  }>;
}

export class GrokClient {
  private client: OpenAI;
  private currentModel: string = "grok-3-latest";
  private isAzureOpenAI: boolean = false;
  private azureApiVersion: string = "2024-12-01-preview";

  constructor(apiKey: string, model?: string, baseURL?: string) {
    // Check if we're using Azure OpenAI
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureKey = process.env.AZURE_OPENAI_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION;
    
    if (azureEndpoint && azureKey && azureDeployment) {
      // Configure for Azure OpenAI
      this.isAzureOpenAI = true;
      this.azureApiVersion = azureApiVersion || "2024-12-01-preview";
      
      this.client = new OpenAI({
        apiKey: azureKey,
        baseURL: `${azureEndpoint}/openai/deployments/${azureDeployment}`,
        defaultQuery: { "api-version": this.azureApiVersion },
        defaultHeaders: {
          "api-key": azureKey,
        },
        timeout: 360000,
      });
      
      this.currentModel = azureDeployment;
    } else {
      // Standard OpenAI or Grok configuration
      this.client = new OpenAI({
        apiKey,
        baseURL: baseURL || process.env.GROK_BASE_URL || "https://api.x.ai/v1",
        timeout: 360000,
      });
    }
    
    if (model) {
      this.currentModel = model;
    }
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async chat(
    messages: GrokMessage[],
    tools?: GrokTool[],
    model?: string,
    searchOptions?: SearchOptions
  ): Promise<GrokResponse> {
    try {
      const requestPayload: any = {
        // For Azure OpenAI, model is set in the deployment, not in the request
        model: this.isAzureOpenAI ? this.currentModel : (model || this.currentModel),
        messages,
      };

      // Azure OpenAI models mostly don't support custom temperature
      // Only set temperature for non-Azure or specific models that support it
      if (!this.isAzureOpenAI) {
        requestPayload.temperature = 0.7;
      } else {
        // For Azure, only set temperature for models that explicitly support it
        const modelName = this.currentModel.toLowerCase();
        // Most Azure models don't support custom temperature, so we don't set it
        // Add specific models here if they support temperature
        if (modelName.includes('gpt-35-turbo') || modelName.includes('gpt-4')) {
          requestPayload.temperature = 0.7;
        }
      }

      // Use appropriate token parameter based on API type
      if (this.isAzureOpenAI) {
        requestPayload.max_completion_tokens = 4000;
      } else {
        requestPayload.max_tokens = 4000;
      }

      // Only add tools if they're provided and not empty
      if (tools && tools.length > 0) {
        requestPayload.tools = tools;
        requestPayload.tool_choice = "auto";
      }

      // Add search parameters if specified (not supported by Azure)
      if (!this.isAzureOpenAI && searchOptions?.search_parameters) {
        requestPayload.search_parameters = searchOptions.search_parameters;
      }

      const response = await this.client.chat.completions.create(
        requestPayload
      );

      return response as GrokResponse;
    } catch (error: any) {
      throw new Error(`API error: ${error.message}`);
    }
  }

  async *chatStream(
    messages: GrokMessage[],
    tools?: GrokTool[],
    model?: string,
    searchOptions?: SearchOptions
  ): AsyncGenerator<any, void, unknown> {
    try {
      const requestPayload: any = {
        // For Azure OpenAI, model is set in the deployment, not in the request
        model: this.isAzureOpenAI ? this.currentModel : (model || this.currentModel),
        messages,
        stream: true,
      };

      // Azure OpenAI models mostly don't support custom temperature
      // Only set temperature for non-Azure or specific models that support it
      if (!this.isAzureOpenAI) {
        requestPayload.temperature = 0.7;
      } else {
        // For Azure, only set temperature for models that explicitly support it
        const modelName = this.currentModel.toLowerCase();
        // Most Azure models don't support custom temperature, so we don't set it
        // Add specific models here if they support temperature
        if (modelName.includes('gpt-35-turbo') || modelName.includes('gpt-4')) {
          requestPayload.temperature = 0.7;
        }
      }

      // Use appropriate token parameter based on API type
      if (this.isAzureOpenAI) {
        requestPayload.max_completion_tokens = 4000;
      } else {
        requestPayload.max_tokens = 4000;
      }

      // Only add tools if they're provided and not empty
      if (tools && tools.length > 0) {
        requestPayload.tools = tools;
        requestPayload.tool_choice = "auto";
      }

      // Add search parameters if specified (not supported by Azure)
      if (!this.isAzureOpenAI && searchOptions?.search_parameters) {
        requestPayload.search_parameters = searchOptions.search_parameters;
      }

      const stream = (await this.client.chat.completions.create(
        requestPayload
      )) as any;

      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error: any) {
      throw new Error(`API error: ${error.message}`);
    }
  }

  async search(
    query: string,
    searchParameters?: SearchParameters
  ): Promise<GrokResponse> {
    const searchMessage: GrokMessage = {
      role: "user",
      content: query,
    };

    const searchOptions: SearchOptions = {
      search_parameters: searchParameters || { mode: "on" },
    };

    return this.chat([searchMessage], [], undefined, searchOptions);
  }
}
