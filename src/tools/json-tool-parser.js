/**
 * JSON Tool Parser
 * Fallback system for Azure OpenAI models that output JSON instead of proper tool calls
 */

class JsonToolParser {
  /**
   * Detect if response contains tool JSON
   */
  static containsToolJson(text) {
    // Check for common tool JSON patterns
    const patterns = [
      /\{"name":\s*"[^"]+"/,
      /\{"tool":\s*"[^"]+"/,
      /\{"function":\s*"[^"]+"/,
      /\{"cmd":\s*\[/
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Extract and parse tool JSON from response
   */
  static extractToolCalls(text) {
    const toolCalls = [];
    
    try {
      // Try to extract JSON objects from the text
      const jsonMatches = text.match(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]+\}/g);
      
      if (jsonMatches) {
        for (const jsonStr of jsonMatches) {
          try {
            const parsed = JSON.parse(jsonStr);
            
            // Convert to standard tool call format
            const toolCall = this.convertToToolCall(parsed);
            if (toolCall) {
              toolCalls.push(toolCall);
            }
          } catch (e) {
            // Individual JSON parse failed, continue
          }
        }
      }
    } catch (error) {
      console.error('Failed to extract tool calls:', error);
    }
    
    return toolCalls;
  }
  
  /**
   * Convert various JSON formats to standard tool call
   */
  static convertToToolCall(json) {
    // Handle different JSON formats the AI might output
    
    // Format 1: {"name": "file.md", "content": "..."}
    if (json.name && json.content) {
      // This is a file creation
      return {
        function: {
          name: 'write_file',
          arguments: JSON.stringify({
            filename: json.name,
            content: json.content
          })
        }
      };
    }
    
    // Format 2: {"tool": "read_file", "filename": "README.md"}
    if (json.tool) {
      const args = { ...json };
      delete args.tool;
      
      return {
        function: {
          name: json.tool,
          arguments: JSON.stringify(args)
        }
      };
    }
    
    // Format 3: {"function": "edit_file", "params": {...}}
    if (json.function && json.params) {
      return {
        function: {
          name: json.function,
          arguments: JSON.stringify(json.params)
        }
      };
    }
    
    // Format 4: {"cmd": ["read_file", "path": "README.md"]}
    if (json.cmd && Array.isArray(json.cmd)) {
      const toolName = json.cmd[0];
      const args = {};
      
      for (let i = 1; i < json.cmd.length; i += 2) {
        if (json.cmd[i] && json.cmd[i + 1]) {
          args[json.cmd[i].replace(':', '')] = json.cmd[i + 1];
        }
      }
      
      return {
        function: {
          name: toolName,
          arguments: JSON.stringify(args)
        }
      };
    }
    
    // Format 5: {"updates": [...]} for file updates
    if (json.updates && Array.isArray(json.updates)) {
      return {
        function: {
          name: 'edit_file',
          arguments: JSON.stringify({
            filename: json.name || 'unknown',
            old_text: json.updates[0]?.pattern || '',
            new_text: json.updates[0]?.replacement || ''
          })
        }
      };
    }
    
    return null;
  }
  
  /**
   * Clean response by removing tool JSON
   */
  static cleanResponse(text) {
    // Remove JSON objects that look like tool calls
    let cleaned = text;
    
    // Remove standalone JSON objects
    cleaned = cleaned.replace(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]+\}/g, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Process response and extract both tool calls and clean text
   */
  static processResponse(response) {
    if (!response) {
      return {
        toolCalls: [],
        cleanText: '',
        hasTools: false
      };
    }
    
    const hasJson = this.containsToolJson(response);
    
    if (!hasJson) {
      return {
        toolCalls: [],
        cleanText: response,
        hasTools: false
      };
    }
    
    const toolCalls = this.extractToolCalls(response);
    const cleanText = this.cleanResponse(response);
    
    return {
      toolCalls,
      cleanText,
      hasTools: toolCalls.length > 0
    };
  }
}

module.exports = JsonToolParser;