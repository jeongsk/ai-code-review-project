import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { ChatResult } from "@langchain/core/dist/outputs";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
  BaseChatModelParams,
  BindToolsInput
} from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import axios from "axios";


const LAAS_ROLE_MAP: Record<string, string> = {
  human: "user",
  ai: "assistant",
};

export interface ChatLaaSCallOptions extends BaseChatModelCallOptions {
  params?: Record<string, string>;
  service_type?: "AZURE" | "OPENAI" | "NCP" | "UPSTAGE" | "GOOGLE" | "AWS" | "ANTHROPIC";
  model?: string;
  hash?: string;
  tools?: BindToolsInput[];
}

export interface ChatLaaSAIFields
  extends BaseChatModelParams {
  apiKey?: string;
  projectId?: string;
  hash?: string;
}

export class ChatLaaS extends BaseChatModel<ChatLaaSCallOptions> {
  private baseUrl = "https://api-laas.wanted.co.kr/api/preset";
  private apiKey?: string;
  private hash?: string;
  private projectId?: string;

  constructor(
    fields?: ChatLaaSAIFields
  ) {
    super(fields ?? {});
    this.apiKey = fields?.apiKey;
    this.hash = fields?.hash;
    this.projectId = fields?.projectId;
  }

  _llmType(): string {
    return "laas";
  }

  async _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
    const stop = options?.stop;
    const response = await this._request(messages, options, stop, runManager);
    const content = response.choices[0].message.content;
    const usage = response.usage || {};

    const validatedUsage = {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };

    const message = new AIMessage({
      content,
      additional_kwargs: {
        id: response.id,
        usage_metadata: validatedUsage,
        response_metadata: {
          created: response.created,
          model: response.model,
        },
      },
    });

    return {
      generations: [{
        text: content,
        message: message,
        generationInfo: response,
      }],
    };
  }

  async _request(messages: BaseMessage[], {
    ...options
  }: this["ParsedCallOptions"], stop: string[] | undefined, runManager?: CallbackManagerForLLMRun) {
    const body = {
      hash: this.hash,
      ...options,
      messages: messages.map((msg) => ({
        role:  LAAS_ROLE_MAP[msg._getType()] || msg.lc_kwargs?.role || 'user',
        content: msg.content,
      })),
    };

    const headers = {
      "Content-Type": "application/json",
      apiKey: this.apiKey,
      project: this.projectId,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        body,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error("API request failed:", axios.isAxiosError(error) ? error.response?.data : error);
      throw error;
    }
  }

}
