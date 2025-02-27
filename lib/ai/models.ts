import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';

const OPENAI_COMPLETIONS_MODEL_SMALL = process.env.OPENAI_COMPLETIONS_MODEL_SMALL || 'deepseek-r1-distill-qwen-7b-250120';
const OPENAI_COMPLETIONS_MODEL_LARGE = process.env.OPENAI_COMPLETIONS_MODEL_LARGE || 'deepseek-v3-241226';
const OPENAI_COMPLETIONS_MODEL_REASONING = process.env.OPENAI_COMPLETIONS_MODEL_REASONING || 'deepseek-r1-250120';

const provider = createOpenAICompatible({
  name: "deepseek",
  apiKey: process.env.OPENAI_COMPLETIONS_API_KEY || "",
  baseURL: process.env.OPENAI_COMPLETIONS_BASE_URL || "",
});

export const myProvider = customProvider({
  languageModels: {
    "chat-model-small": provider(OPENAI_COMPLETIONS_MODEL_SMALL) as any,
    "chat-model-large": provider(OPENAI_COMPLETIONS_MODEL_LARGE) as any,
    "chat-model-reasoning": wrapLanguageModel({
      model: provider(OPENAI_COMPLETIONS_MODEL_REASONING) as any,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": provider(OPENAI_COMPLETIONS_MODEL_SMALL) as any,
    "artifact-model": provider(OPENAI_COMPLETIONS_MODEL_LARGE) as any,
  },
  imageModels: {
    "small-model": openai.image("dall-e-2"),
    "large-model": openai.image("dall-e-3"),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'Small model',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'chat-model-large',
    name: 'Large model',
    description: 'Large model for complex, multi-step tasks',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];
