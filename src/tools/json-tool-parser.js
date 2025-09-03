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
      // FIRST: Try to parse the entire response as JSON (best case - AI outputs only JSON)
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          const toolCall = this.convertToToolCall(parsed);
          if (toolCall) {
            return [toolCall];  // Return immediately if successful
          }
        } catch (e) {
          // Not valid JSON, continue to regex extraction
        }
      }
      
      // FALLBACK: Use regex to extract JSON from mixed text
      // Updated regex to handle nested JSON objects properly
      const jsonMatches = text.match(/\{(?:[^{}]|(\{[^{}]*\}))*\}/g);
      
      if (jsonMatches) {
        for (const jsonStr of jsonMatches) {
          try {
            // Try direct parse first
            const parsed = JSON.parse(jsonStr);
            
            // Convert to standard tool call format
            const toolCall = this.convertToToolCall(parsed);
            if (toolCall) {
              toolCalls.push(toolCall);
            }
          } catch (e) {
            // Individual JSON parse failed, log for debugging
            if (process.env.DEBUG_TOOLS) {
              console.error('Failed to parse JSON:', jsonStr, e.message);
            }
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
    
    // Format 2: {"tool": "read_file", "args": {...}} or {"tool": "read_file", "filename": "README.md"}
    if (json.tool) {
      // Map common tool name variations to actual tool names
      const toolNameMap = {
        'write_to_file': 'write_file',
        'create_file': 'write_file',
        'modify_file': 'edit_file',
        'read': 'read_file',
        'bash': 'execute_bash',
        'run_command': 'execute_bash',
        'shell': 'execute_bash'
      };
      
      let toolName = toolNameMap[json.tool] || json.tool;
      
      // If args field exists, use it, otherwise use all other fields as args
      let args = json.args || (() => {
        const temp = { ...json };
        delete temp.tool;
        return temp;
      })();
      
      // Special handling for update_file - determine if it should be write_file or actual update_file
      if (json.tool === 'update_file') {
        // If content looks like a complete file (has mermaid blocks, multiple sections, etc.)
        // then use write_file instead
        if (args.content && (
          args.content.includes('```mermaid') ||
          args.content.length > 500 ||
          args.content.split('\n').length > 20
        )) {
          toolName = 'write_file';
        } else if (!args.mode) {
          // If no mode specified and content is short, assume append
          args.mode = 'append';
        }
      }
      
      return {
        function: {
          name: toolName,
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