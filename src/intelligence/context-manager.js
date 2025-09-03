/**
 * Smart Context Management System
 * Handles token counting, context compression, and intelligent summarization
 */

const tiktoken = require('tiktoken');

class ContextManager {
  constructor() {
    // Token limits for different models
    this.modelLimits = {
      'gpt-5': 128000,       // 128K context
      'gpt-5-chat': 128000,  // 128K context
      'gpt-5-mini': 128000,  // 128K context
      'o3': 200000,          // 200K context (reasoning model)
      'gpt-4o': 128000,      // 128K context
      'o4-mini': 128000      // 128K context
    };
    
    // Target context sizes
    this.targets = {
      maxContext: 1000000,        // 1M tokens target before compaction
      compactTarget: 50000,       // 50K tokens after compaction
      summaryChunkSize: 10000,    // Summarize every 10K tokens
      keepRecentTokens: 20000,    // Always keep last 20K tokens intact
      systemPromptReserve: 5000   // Reserve 5K for system prompt
    };
    
    // Conversation segments for intelligent compression
    this.segments = {
      systemPrompts: [],
      userPrompts: [],
      assistantResponses: [],
      toolCalls: [],
      summaries: []
    };
    
    // Statistics
    this.stats = {
      totalTokensProcessed: 0,
      compactionCount: 0,
      currentContextSize: 0
    };
    
    // Initialize tokenizer (using cl100k_base encoding)
    try {
      this.encoding = tiktoken.encoding_for_model('gpt-4');
    } catch {
      // Fallback to approximate counting if tiktoken not available
      this.encoding = null;
    }
  }
  
  /**
   * Count tokens in a string or message
   */
  countTokens(text) {
    if (this.encoding) {
      return this.encoding.encode(text).length;
    }
    // Fallback: approximate 1 token per 4 characters
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Count tokens in an array of messages
   */
  countMessageTokens(messages) {
    let total = 0;
    for (const msg of messages) {
      // Each message has overhead: role (1 token) + content + formatting (~4 tokens)
      total += 5; // Message overhead
      total += this.countTokens(msg.role);
      total += this.countTokens(msg.content || '');
      
      // Tool calls have additional overhead
      if (msg.tool_calls) {
        total += msg.tool_calls.length * 10; // Approximate tool call overhead
      }
    }
    return total;
  }
  
  /**
   * Intelligent context management - decide what to keep, compress, or discard
   */
  async manageContext(conversationHistory, currentModel = 'gpt-5-chat') {
    const currentTokens = this.countMessageTokens(conversationHistory);
    const modelLimit = this.modelLimits[currentModel] || 128000;
    
    this.stats.currentContextSize = currentTokens;
    
    // If we're approaching 1M tokens, trigger compaction
    if (currentTokens > this.targets.maxContext) {
      return await this.compactContext(conversationHistory);
    }
    
    // If approaching model limit, do smart trimming
    if (currentTokens > modelLimit * 0.8) {
      return this.smartTrim(conversationHistory, modelLimit);
    }
    
    // Context is fine, return as-is
    return conversationHistory;
  }
  
  /**
   * Compact context when approaching 1M tokens
   */
  async compactContext(conversationHistory) {
    console.log(`🗜️ Compacting context: ${this.stats.currentContextSize} tokens → ${this.targets.compactTarget} tokens`);
    
    this.stats.compactionCount++;
    
    // Segment the conversation
    const segments = this.segmentConversation(conversationHistory);
    
    // Keep recent messages intact
    const recentMessages = segments.recent;
    const recentTokens = this.countMessageTokens(recentMessages);
    
    // Calculate how many tokens we can use for summaries
    const summaryBudget = this.targets.compactTarget - recentTokens - this.targets.systemPromptReserve;
    
    // Create summaries for different segments
    const summaries = [];
    
    // Summarize old conversations
    if (segments.old.length > 0) {
      const oldSummary = await this.createSummary(segments.old, 'conversation_history', summaryBudget * 0.3);
      summaries.push({
        role: 'system',
        content: `[CONTEXT SUMMARY - Previous Conversations]\n${oldSummary}`
      });
    }
    
    // Summarize tool interactions
    if (segments.tools.length > 0) {
      const toolSummary = await this.createSummary(segments.tools, 'tool_usage', summaryBudget * 0.2);
      summaries.push({
        role: 'system',
        content: `[TOOL USAGE SUMMARY]\n${toolSummary}`
      });
    }
    
    // Extract and preserve key information
    const keyInfo = this.extractKeyInformation(segments.middle);
    if (keyInfo) {
      summaries.push({
        role: 'system',
        content: `[KEY INFORMATION]\n${keyInfo}`
      });
    }
    
    // Build compacted context
    const compacted = [
      ...summaries,
      ...recentMessages
    ];
    
    console.log(`✅ Compaction complete: ${this.countMessageTokens(compacted)} tokens`);
    
    return compacted;
  }
  
  /**
   * Segment conversation into categories
   */
  segmentConversation(conversationHistory) {
    const totalMessages = conversationHistory.length;
    const recentCount = Math.min(20, Math.floor(totalMessages * 0.3)); // Keep 30% or last 20 messages
    
    const segments = {
      old: [],      // Very old messages (first 40%)
      middle: [],   // Middle messages (30%)
      recent: [],   // Recent messages (last 30%)
      tools: []     // Tool-related messages
    };
    
    // Categorize messages
    conversationHistory.forEach((msg, index) => {
      // Extract tool messages
      if (msg.tool_calls || msg.content?.includes('🔧') || msg.content?.includes('Tool:')) {
        segments.tools.push(msg);
      }
      
      // Segment by position
      if (index < totalMessages * 0.4) {
        segments.old.push(msg);
      } else if (index < totalMessages * 0.7) {
        segments.middle.push(msg);
      } else {
        segments.recent.push(msg);
      }
    });
    
    return segments;
  }
  
  /**
   * Create intelligent summary of messages
   */
  async createSummary(messages, summaryType = 'general', maxTokens = 5000) {
    const content = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const contentTokens = this.countTokens(content);
    
    // If content is already small enough, return as-is
    if (contentTokens <= maxTokens) {
      return content;
    }
    
    // Create summary based on type
    switch (summaryType) {
      case 'conversation_history':
        return this.summarizeConversation(messages, maxTokens);
      
      case 'tool_usage':
        return this.summarizeToolUsage(messages, maxTokens);
      
      default:
        return this.generalSummary(messages, maxTokens);
    }
  }
  
  /**
   * Summarize conversation history
   */
  summarizeConversation(messages, maxTokens) {
    const summary = [];
    const topics = new Set();
    const decisions = [];
    const files = new Set();
    
    messages.forEach(msg => {
      // Extract topics
      if (msg.content) {
        // Extract file mentions
        const fileMatches = msg.content.match(/[\w-]+\.(js|ts|json|md|txt|yml|yaml)/g);
        if (fileMatches) {
          fileMatches.forEach(f => files.add(f));
        }
        
        // Extract decisions and conclusions
        if (msg.role === 'assistant' && msg.content.includes('✅')) {
          const lines = msg.content.split('\n').filter(l => l.includes('✅'));
          decisions.push(...lines.slice(0, 3)); // Keep top 3 decisions
        }
        
        // Extract topics (simplified)
        if (msg.role === 'user') {
          const firstLine = msg.content.split('\n')[0];
          if (firstLine.length < 100) {
            topics.add(firstLine);
          }
        }
      }
    });
    
    // Build summary
    if (topics.size > 0) {
      summary.push(`Topics discussed: ${Array.from(topics).slice(0, 10).join(', ')}`);
    }
    
    if (files.size > 0) {
      summary.push(`Files worked on: ${Array.from(files).join(', ')}`);
    }
    
    if (decisions.length > 0) {
      summary.push(`Key decisions:\n${decisions.join('\n')}`);
    }
    
    // Add message count
    summary.push(`(${messages.length} messages summarized)`);
    
    return summary.join('\n\n');
  }
  
  /**
   * Summarize tool usage
   */
  summarizeToolUsage(messages, maxTokens) {
    const toolStats = {};
    const toolResults = [];
    
    messages.forEach(msg => {
      if (msg.tool_calls) {
        msg.tool_calls.forEach(call => {
          const toolName = call.function.name;
          toolStats[toolName] = (toolStats[toolName] || 0) + 1;
        });
      }
      
      // Capture important tool results
      if (msg.content?.includes('✅') || msg.content?.includes('Created') || msg.content?.includes('Modified')) {
        toolResults.push(msg.content.split('\n')[0]); // First line only
      }
    });
    
    const summary = [];
    
    // Tool usage statistics
    if (Object.keys(toolStats).length > 0) {
      const toolList = Object.entries(toolStats)
        .sort((a, b) => b[1] - a[1])
        .map(([tool, count]) => `${tool} (${count}x)`)
        .join(', ');
      summary.push(`Tools used: ${toolList}`);
    }
    
    // Key results
    if (toolResults.length > 0) {
      summary.push(`Key results:\n${toolResults.slice(0, 5).join('\n')}`);
    }
    
    return summary.join('\n\n');
  }
  
  /**
   * General summary fallback
   */
  generalSummary(messages, maxTokens) {
    const userQuestions = [];
    const assistantAnswers = [];
    
    messages.forEach(msg => {
      if (msg.role === 'user' && msg.content.length < 200) {
        userQuestions.push(msg.content);
      } else if (msg.role === 'assistant') {
        // Extract first meaningful line
        const lines = msg.content.split('\n').filter(l => l.trim().length > 10);
        if (lines.length > 0) {
          assistantAnswers.push(lines[0]);
        }
      }
    });
    
    const summary = [];
    
    if (userQuestions.length > 0) {
      summary.push(`User requests: ${userQuestions.slice(-5).join('; ')}`);
    }
    
    if (assistantAnswers.length > 0) {
      summary.push(`Key responses: ${assistantAnswers.slice(-5).join('; ')}`);
    }
    
    return summary.join('\n\n');
  }
  
  /**
   * Extract key information to preserve
   */
  extractKeyInformation(messages) {
    const keyInfo = {
      errors: [],
      solutions: [],
      configurations: [],
      codeSnippets: []
    };
    
    messages.forEach(msg => {
      if (!msg.content) return;
      
      // Extract errors
      if (msg.content.includes('Error:') || msg.content.includes('error:')) {
        const errorLines = msg.content.split('\n').filter(l => l.toLowerCase().includes('error'));
        keyInfo.errors.push(...errorLines.slice(0, 2));
      }
      
      // Extract solutions
      if (msg.content.includes('Fixed') || msg.content.includes('Solution:') || msg.content.includes('Resolved')) {
        const solutionLines = msg.content.split('\n').filter(l => 
          l.includes('Fixed') || l.includes('Solution') || l.includes('Resolved')
        );
        keyInfo.solutions.push(...solutionLines.slice(0, 2));
      }
      
      // Extract configurations (package.json, config files, etc.)
      if (msg.content.includes('"dependencies"') || msg.content.includes('config')) {
        keyInfo.configurations.push(msg.content.slice(0, 200));
      }
    });
    
    // Build key information summary
    const summary = [];
    
    if (keyInfo.errors.length > 0) {
      summary.push(`Errors encountered:\n${keyInfo.errors.slice(-3).join('\n')}`);
    }
    
    if (keyInfo.solutions.length > 0) {
      summary.push(`Solutions applied:\n${keyInfo.solutions.slice(-3).join('\n')}`);
    }
    
    if (keyInfo.configurations.length > 0) {
      summary.push(`Configuration changes: ${keyInfo.configurations.length} modifications`);
    }
    
    return summary.length > 0 ? summary.join('\n\n') : null;
  }
  
  /**
   * Smart trim when approaching model limits
   */
  smartTrim(conversationHistory, modelLimit) {
    const targetTokens = Math.floor(modelLimit * 0.7); // Keep 70% of limit
    const currentTokens = this.countMessageTokens(conversationHistory);
    
    if (currentTokens <= targetTokens) {
      return conversationHistory;
    }
    
    // Calculate how many messages to keep
    const keepRecent = Math.max(10, Math.floor(conversationHistory.length * 0.5));
    
    // Keep system messages and recent conversation
    const trimmed = conversationHistory.slice(-keepRecent);
    
    // Add context summary at the beginning
    const droppedCount = conversationHistory.length - keepRecent;
    if (droppedCount > 0) {
      trimmed.unshift({
        role: 'system',
        content: `[Context: ${droppedCount} previous messages trimmed for token management]`
      });
    }
    
    return trimmed;
  }
  
  /**
   * Get context statistics
   */
  getStats() {
    return {
      ...this.stats,
      encoderAvailable: this.encoding !== null,
      targets: this.targets,
      modelLimits: this.modelLimits
    };
  }
  
  /**
   * Estimate remaining context space
   */
  getRemainingSpace(currentTokens, model = 'gpt-5-chat') {
    const limit = this.modelLimits[model] || 128000;
    const remaining = limit - currentTokens;
    const percentage = (currentTokens / limit) * 100;
    
    return {
      used: currentTokens,
      limit: limit,
      remaining: remaining,
      percentage: percentage.toFixed(1),
      status: percentage < 50 ? 'good' : percentage < 80 ? 'moderate' : 'critical'
    };
  }
}

module.exports = ContextManager;