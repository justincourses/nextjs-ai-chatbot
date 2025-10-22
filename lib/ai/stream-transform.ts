import { Transform } from 'node:stream';

/**
 * Transform stream to fix DeepSeek model compatibility issues
 */
export function createDeepSeekFixTransform() {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        // Convert chunk to string if it's a buffer
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
        
        // Process each line that starts with "data: "
        const lines = chunkStr.split('\n');
        const processedLines = lines.map((line: string) => {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') {
            return line;
          }
          
          try {
            const jsonStr = line.slice(6); // Remove 'data: ' prefix
            const data = JSON.parse(jsonStr);
            
            // Fix DeepSeek tool_calls format issues
            if (data.choices && Array.isArray(data.choices)) {
              data.choices.forEach((choice: any) => {
                if (choice.delta?.tool_calls && Array.isArray(choice.delta.tool_calls)) {
                  choice.delta.tool_calls.forEach((toolCall: any, index: number) => {
                    // Fix null type - should be "function"
                    if (toolCall.type === null || toolCall.type === undefined) {
                      toolCall.type = 'function';
                    }
                    
                    // Fix null id - generate a temporary one
                    if (toolCall.id === null || toolCall.id === undefined) {
                      toolCall.id = `call_${Date.now()}_${index}`;
                    }
                    
                    // Ensure function object exists and has required fields
                    if (!toolCall.function) {
                      toolCall.function = { name: '', arguments: '' };
                    }
                    
                    // Ensure function has name and arguments
                    if (!toolCall.function.name) {
                      toolCall.function.name = '';
                    }
                    if (toolCall.function.arguments === null || toolCall.function.arguments === undefined) {
                      toolCall.function.arguments = '';
                    }
                  });
                }
                
                // Also handle finished tool_calls
                if (choice.message?.tool_calls && Array.isArray(choice.message.tool_calls)) {
                  choice.message.tool_calls.forEach((toolCall: any, index: number) => {
                    if (toolCall.type === null || toolCall.type === undefined) {
                      toolCall.type = 'function';
                    }
                    if (toolCall.id === null || toolCall.id === undefined) {
                      toolCall.id = `call_${Date.now()}_${index}`;
                    }
                    if (!toolCall.function) {
                      toolCall.function = { name: '', arguments: '' };
                    }
                  });
                }
              });
            }
            
            return `data: ${JSON.stringify(data)}`;
          } catch (error) {
            console.warn('Failed to parse/fix streaming data:', error);
            return line;
          }
        });
        
        const processedChunk = processedLines.join('\n');
        callback(null, processedChunk);
      } catch (error) {
        console.error('Stream transform error:', error);
        callback(null, chunk); // Pass through original chunk on error
      }
    }
  });
}