import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { openai } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = "chat-model-large";

// Model names from environment variables
const OPENAI_COMPLETIONS_MODEL_SMALL = process.env.OPENAI_COMPLETIONS_MODEL_SMALL || "doubao-seed-1-6-flash-250615";
const OPENAI_COMPLETIONS_MODEL_LARGE = process.env.OPENAI_COMPLETIONS_MODEL_LARGE || "doubao-seed-1-6-250615";
const OPENAI_COMPLETIONS_MODEL_REASONING = process.env.OPENAI_COMPLETIONS_MODEL_REASONING || "doubao-seed-1-6-thinking-250615";
const OPENAI_COMPLETIONS_MODEL_FUNCTION = process.env.OPENAI_COMPLETIONS_MODEL_FUNCTION || "doubao-seed-1-6-250615";

// Use OpenAI Compatible provider for 火山引擎 (ByteDance Volcengine ARK) Doubao models
const volcengineProvider = createOpenAICompatible({
  name: "volcengine-ark",
  apiKey: process.env.OPENAI_COMPLETIONS_API_KEY || "",
  baseURL: process.env.OPENAI_COMPLETIONS_BASE_URL || "",
});

export const myProvider = customProvider({
  languageModels: {
    // Use Volcengine provider for Doubao models with function calling support
    "chat-model-small": volcengineProvider(OPENAI_COMPLETIONS_MODEL_SMALL) as any,
    "chat-model-large": volcengineProvider(OPENAI_COMPLETIONS_MODEL_LARGE) as any,
    "chat-model-reasoning": wrapLanguageModel({
      model: volcengineProvider(OPENAI_COMPLETIONS_MODEL_REASONING) as any,
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    // Other models using Volcengine provider
    "title-model": volcengineProvider(OPENAI_COMPLETIONS_MODEL_SMALL) as any,
    "artifact-model": volcengineProvider(OPENAI_COMPLETIONS_MODEL_LARGE) as any,
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
    id: "chat-model-small",
    name: "Small model",
    description: `Model: ${OPENAI_COMPLETIONS_MODEL_SMALL} (with function calling)`,
  },
  {
    id: "chat-model-large",
    name: "Large model", 
    description: `Model: ${OPENAI_COMPLETIONS_MODEL_LARGE} (with function calling)`,
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning model",
    description: `Model: ${OPENAI_COMPLETIONS_MODEL_REASONING} (with function calling)`,
  },
];
