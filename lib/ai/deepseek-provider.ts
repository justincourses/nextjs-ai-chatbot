import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Create a DeepSeek provider with custom response handling
 */
export function createDeepSeekProvider({
  apiKey,
  baseURL,
}: {
  apiKey: string;
  baseURL: string;
}) {
  const baseProvider = createOpenAICompatible({
    name: "deepseek",
    apiKey,
    baseURL,
  });

  // Wrap the base provider to fix tool call formatting issues
  return (modelId: string, settings?: any) => {
    const model = baseProvider(modelId, settings);
    
    // Override the doStream method to fix DeepSeek-specific issues
    const originalDoStream = model.doStream;
    model.doStream = async (options: any) => {
      const result = await originalDoStream.call(model, options);
      
      // Transform the stream to fix DeepSeek tool call format issues
      const transformedStream = new ReadableStream({
        start(controller) {
          const reader = result.stream.getReader();
          
          async function processStream() {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  controller.close();
                  break;
                }
                
                // Fix DeepSeek tool call format issues
                if (value.type === 'tool-call-delta') {
                  // Ensure tool call has required fields
                  if (value.toolCallType === null) {
                    value.toolCallType = 'function';
                  }
                  if (value.toolCallId === null) {
                    value.toolCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  }
                } else if (value.type === 'tool-call') {
                  // Fix completed tool calls
                  if (!value.toolCallType) {
                    value.toolCallType = 'function';
                  }
                  if (!value.toolCallId) {
                    value.toolCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  }
                }
                
                controller.enqueue(value);
              }
            } catch (error) {
              console.error('Stream processing error:', error);
              controller.error(error);
            }
          }
          
          processStream();
        },
      });
      
      return {
        ...result,
        stream: transformedStream,
      };
    };
    
    return model;
  };
}