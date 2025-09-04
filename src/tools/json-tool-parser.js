/**
 * JSON Tool Parser
 * Fallback system for Azure OpenAI models that output JSON instead of proper tool calls
 */

class JsonToolParser {
  /**
   * Detect if response contains tool JSON
   */
  static containsToolJson(text) {
    // Check for tool JSON - handle multi-line and different formats
    // Simply check if it has both { and "tool" somewhere
    return text.includes('{') && (
      text.includes('"tool"') || 
      text.includes('"name"') ||
      text.includes('"function"') ||
      text.includes('"cmd"')
    );
  }
  
  /**
   * Extract and parse tool JSON from response
   */
  static extractToolCalls(text) {
    const toolCalls = [];
    
    try {
      // Check for multiple JSON objects on separate lines
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"tool"')) {
          try {
            const parsed = JSON.parse(trimmed);
            const toolCall = this.convertToToolCall(parsed);
            if (toolCall) {
              toolCalls.push(toolCall);
            }
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }
      
      // If we found tools from line-by-line parsing, return them
      if (toolCalls.length > 0) {
        return toolCalls;
      }
      
      // FALLBACK: Try to parse the entire response as single JSON
      const trimmed = text.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          const toolCall = this.convertToToolCall(parsed);
          if (toolCall) {
            toolCalls.push(toolCall);
            return toolCalls;
          }
        } catch (e) {
          // Not valid JSON, continue to regex extraction
        }
      }
      
      // FALLBACK: Try to find JSON in the text (handles multi-line, escaped chars, etc)
      // Look for anything that starts with { and has "tool" in it
      const jsonStart = text.indexOf('{');
      if (jsonStart !== -1 && text.includes('"tool"')) {
        // Try to find the matching closing brace
        let depth = 0;
        let inString = false;
        let escape = false;
        let jsonEnd = -1;
        
        for (let i = jsonStart; i < text.length; i++) {
          const char = text[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"' && !escape) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') {
              depth--;
              if (depth === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
        }
        
        if (jsonEnd !== -1) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          try {
            const parsed = JSON.parse(jsonStr);
            const toolCall = this.convertToToolCall(parsed);
            if (toolCall) {
              toolCalls.push(toolCall);
              // Don't return yet - look for more JSON objects
              // Check if there's more text after this JSON
              const remainingText = text.substring(jsonEnd + 1);
              if (remainingText.includes('{') && remainingText.includes('"tool"')) {
                // Recursively extract more tools
                const moreCalls = this.extractToolCalls(remainingText);
                toolCalls.push(...moreCalls);
              }
              return toolCalls;
            }
          } catch (e) {
            // Failed to parse, continue to regex
          }
        }
      }
      
      // LAST RESORT: Simple regex for single-line JSON
      const jsonMatches = text.match(/\{[^{}]*"tool"[^{}]*\}/g);
      
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
    
    // Remove complete JSON objects (with proper braces)
    cleaned = cleaned.replace(/\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]+\}/g, '');
    
    // Remove malformed JSON that starts with { and has "tool" but may be incomplete
    cleaned = cleaned.replace(/\{[^}]*"tool"[^}]*(}|$)/g, '');
    
    // Remove incomplete JSON fragments that start with {"tool"
    cleaned = cleaned.replace(/\{"tool"[^}]*$/g, '');
    
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