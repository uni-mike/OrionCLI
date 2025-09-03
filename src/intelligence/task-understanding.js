/**
 * Intelligent Task Understanding System
 * Makes OrionCLI incredibly smart at understanding user intent
 */

class TaskUnderstanding {
  constructor() {
    // Intent patterns with confidence scores
    this.intentPatterns = {
      // File Operations
      readFile: {
        patterns: [
          /what.*(?:is|does|about|in).*(?:file|document)/i,
          /show.*(?:me)?.*(?:file|content)/i,
          /(?:read|view|open|look at|check|display).*file/i,
          /what's.*in.*\.[\w]+/i,
          /explain.*(?:this)?.*(?:file|code)/i,
          /analyze.*(?:this)?.*(?:file|code)/i
        ],
        confidence: 0.95,
        tools: ['read_file'],
        description: 'User wants to read or understand file contents'
      },
      
      createFile: {
        patterns: [
          /(?:create|make|write|generate).*(?:new)?.*file/i,
          /(?:create|make|build).*(?:a|an|new).*(?:component|module|class|function)/i,
          /implement.*(?:feature|functionality|component)/i,
          /add.*(?:new)?.*(?:file|component|module)/i
        ],
        confidence: 0.90,
        tools: ['write_file'],
        description: 'User wants to create new files or components'
      },
      
      editFile: {
        patterns: [
          /(?:edit|modify|change|update|fix|correct).*(?:file|code|function|class)/i,
          /(?:add|insert|append|prepend).*(?:to|into).*file/i,
          /(?:remove|delete).*(?:from|in).*file/i,
          /(?:replace|substitute).*in.*file/i,
          /refactor.*(?:code|function|class)/i
        ],
        confidence: 0.90,
        tools: ['edit_file', 'update_file'],
        description: 'User wants to modify existing files'
      },
      
      // Search Operations
      searchCode: {
        patterns: [
          /(?:search|find|locate|look for).*(?:in|across|through).*(?:code|files|project)/i,
          /where.*(?:is|are|does).*(?:defined|used|implemented)/i,
          /(?:find|show).*(?:all)?.*(?:references|usages|occurrences)/i,
          /grep.*for/i,
          /which.*files.*(?:contain|have|include)/i
        ],
        confidence: 0.85,
        tools: ['search_files', 'grep_content'],
        description: 'User wants to search through codebase'
      },
      
      // Git Operations
      gitStatus: {
        patterns: [
          /git.*status/i,
          /what.*(?:changes|modified|uncommitted)/i,
          /show.*(?:git)?.*(?:diff|changes)/i,
          /what's.*(?:changed|new|modified)/i
        ],
        confidence: 0.90,
        tools: ['git_status', 'git_diff'],
        description: 'User wants git status information'
      },
      
      gitCommit: {
        patterns: [
          /(?:commit|save|push).*(?:changes|code|work)/i,
          /create.*commit/i,
          /git.*commit/i
        ],
        confidence: 0.85,
        tools: ['git_add', 'git_commit'],
        description: 'User wants to commit changes'
      },
      
      // System Operations
      runCommand: {
        patterns: [
          /(?:run|execute|start).*(?:command|script|test|build)/i,
          /npm.*(?:run|install|test)/i,
          /(?:build|compile|test).*(?:project|code|app)/i,
          /(?:start|launch).*(?:server|app|application)/i
        ],
        confidence: 0.85,
        tools: ['execute_bash'],
        description: 'User wants to run system commands'
      },
      
      // Project Understanding
      explainProject: {
        patterns: [
          /what.*(?:is|does).*(?:this|project|app|application).*(?:do|about)/i,
          /explain.*(?:project|codebase|architecture)/i,
          /(?:how|what).*(?:works|structured|organized)/i,
          /give.*overview/i
        ],
        confidence: 0.80,
        tools: ['read_file', 'list_files', 'analyze_structure'],
        description: 'User wants to understand the project'
      },
      
      // Help & Documentation
      needHelp: {
        patterns: [
          /(?:help|assist).*(?:me|with)/i,
          /how.*(?:do|can|should).*(?:I|we)/i,
          /what.*(?:command|tool).*(?:should|can).*(?:use|run)/i,
          /(?:guide|tutorial|documentation)/i
        ],
        confidence: 0.75,
        tools: ['show_help', 'suggest_command'],
        description: 'User needs help or guidance'
      }
    };
    
    // Context enhancement patterns
    this.contextEnhancers = {
      fileContext: {
        pattern: /(?:in|from|at|within).*[\/\\]?[\w\-\.]+\.[\w]+/i,
        extractor: (text) => {
          const match = text.match(/[\/\\]?[\w\-\.\/\\]+\.[\w]+/);
          return match ? { file: match[0] } : null;
        }
      },
      
      lineContext: {
        pattern: /(?:line|row).*\d+/i,
        extractor: (text) => {
          const match = text.match(/(?:line|row).*(\d+)/i);
          return match ? { line: parseInt(match[1]) } : null;
        }
      },
      
      functionContext: {
        pattern: /(?:function|method|class).*[\w_]+/i,
        extractor: (text) => {
          const match = text.match(/(?:function|method|class)\s+([\w_]+)/i);
          return match ? { target: match[1] } : null;
        }
      }
    };
    
    // Learning from user patterns
    this.userPatterns = new Map();
    this.sessionHistory = [];
  }
  
  /**
   * Analyze user input and determine intent with confidence
   */
  async analyzeIntent(input) {
    const analysis = {
      primaryIntent: null,
      confidence: 0,
      suggestedTools: [],
      context: {},
      alternatives: [],
      reasoning: []
    };
    
    // Check each intent pattern
    for (const [intentName, intent] of Object.entries(this.intentPatterns)) {
      for (const pattern of intent.patterns) {
        if (pattern.test(input)) {
          const score = this.calculateConfidence(input, pattern, intent);
          
          if (score > analysis.confidence) {
            // Move current primary to alternatives
            if (analysis.primaryIntent) {
              analysis.alternatives.push({
                intent: analysis.primaryIntent,
                confidence: analysis.confidence
              });
            }
            
            analysis.primaryIntent = intentName;
            analysis.confidence = score;
            analysis.suggestedTools = intent.tools;
            analysis.reasoning.push(`Matched pattern: ${pattern.source}`);
          } else if (score > 0.5) {
            analysis.alternatives.push({
              intent: intentName,
              confidence: score
            });
          }
        }
      }
    }
    
    // Extract context from input
    for (const [contextType, enhancer] of Object.entries(this.contextEnhancers)) {
      if (enhancer.pattern.test(input)) {
        const extracted = enhancer.extractor(input);
        if (extracted) {
          Object.assign(analysis.context, extracted);
          analysis.reasoning.push(`Found ${contextType}: ${JSON.stringify(extracted)}`);
        }
      }
    }
    
    // Learn from this interaction
    this.learnFromInteraction(input, analysis);
    
    // Add smart suggestions based on context
    analysis.suggestions = this.generateSmartSuggestions(analysis);
    
    return analysis;
  }
  
  /**
   * Calculate confidence score for intent matching
   */
  calculateConfidence(input, pattern, intent) {
    let score = intent.confidence;
    
    // Boost score for exact matches
    if (pattern.test(input) && input.match(pattern)[0].length > input.length * 0.7) {
      score += 0.05;
    }
    
    // Check user history for similar patterns
    const historicalBoost = this.getHistoricalConfidence(input, intent);
    score += historicalBoost;
    
    // Normalize score
    return Math.min(score, 1.0);
  }
  
  /**
   * Learn from user interactions to improve future predictions
   */
  learnFromInteraction(input, analysis) {
    // Store in session history
    this.sessionHistory.push({
      input,
      analysis,
      timestamp: Date.now()
    });
    
    // Update user patterns
    if (analysis.primaryIntent) {
      const key = `${analysis.primaryIntent}:${analysis.confidence > 0.8 ? 'high' : 'low'}`;
      
      if (!this.userPatterns.has(key)) {
        this.userPatterns.set(key, []);
      }
      
      this.userPatterns.get(key).push({
        input,
        context: analysis.context,
        timestamp: Date.now()
      });
    }
    
    // Cleanup old history (keep last 100 interactions)
    if (this.sessionHistory.length > 100) {
      this.sessionHistory = this.sessionHistory.slice(-100);
    }
  }
  
  /**
   * Get confidence boost from historical patterns
   */
  getHistoricalConfidence(input, intent) {
    let boost = 0;
    
    // Check recent history for similar intents
    const recentSimilar = this.sessionHistory
      .slice(-10)
      .filter(h => h.analysis.primaryIntent === intent.name);
    
    if (recentSimilar.length > 2) {
      boost += 0.05; // User is working on similar tasks
    }
    
    return boost;
  }
  
  /**
   * Generate smart suggestions based on analysis
   */
  generateSmartSuggestions(analysis) {
    const suggestions = [];
    
    // File-based suggestions
    if (analysis.context.file) {
      const ext = analysis.context.file.split('.').pop();
      
      if (ext === 'js' || ext === 'ts') {
        suggestions.push('Consider running tests after changes');
        suggestions.push('Check for linting errors');
      } else if (ext === 'json') {
        suggestions.push('Validate JSON structure');
      } else if (ext === 'md') {
        suggestions.push('Preview markdown rendering');
      }
    }
    
    // Intent-based suggestions
    if (analysis.primaryIntent === 'editFile') {
      suggestions.push('Create a backup before major changes');
      suggestions.push('Consider using version control');
    } else if (analysis.primaryIntent === 'gitCommit') {
      suggestions.push('Review changes before committing');
      suggestions.push('Write descriptive commit message');
    } else if (analysis.primaryIntent === 'runCommand') {
      suggestions.push('Check command syntax first');
      suggestions.push('Consider running in test environment');
    }
    
    // Context-aware suggestions
    if (this.sessionHistory.length > 5) {
      const recentIntents = this.sessionHistory
        .slice(-5)
        .map(h => h.analysis.primaryIntent)
        .filter(Boolean);
      
      if (recentIntents.includes('editFile') && !recentIntents.includes('gitCommit')) {
        suggestions.push('Don\'t forget to commit your changes');
      }
    }
    
    return suggestions;
  }
  
  /**
   * Get intelligent tool recommendations
   */
  getToolRecommendations(context) {
    const recommendations = [];
    
    // Project type detection
    if (context.hasPackageJson) {
      recommendations.push({
        tool: 'npm_scripts',
        reason: 'Node.js project detected',
        commands: ['npm test', 'npm run build', 'npm start']
      });
    }
    
    if (context.hasPipfile || context.hasRequirementsTxt) {
      recommendations.push({
        tool: 'python_tools',
        reason: 'Python project detected',
        commands: ['pip install -r requirements.txt', 'python -m pytest']
      });
    }
    
    if (context.hasDockerfile) {
      recommendations.push({
        tool: 'docker_tools',
        reason: 'Docker configuration found',
        commands: ['docker build', 'docker-compose up']
      });
    }
    
    return recommendations;
  }
  
  /**
   * Fuzzy match file names for better UX
   */
  fuzzyMatchFile(input, availableFiles) {
    const matches = [];
    const searchTerm = input.toLowerCase();
    
    for (const file of availableFiles) {
      const fileName = file.toLowerCase();
      let score = 0;
      
      // Exact match
      if (fileName === searchTerm) {
        score = 1.0;
      }
      // Contains match
      else if (fileName.includes(searchTerm)) {
        score = 0.8;
      }
      // Fuzzy match
      else {
        score = this.calculateFuzzyScore(searchTerm, fileName);
      }
      
      if (score > 0.3) {
        matches.push({ file, score });
      }
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Calculate fuzzy matching score
   */
  calculateFuzzyScore(search, target) {
    let score = 0;
    let searchIndex = 0;
    
    for (let i = 0; i < target.length && searchIndex < search.length; i++) {
      if (target[i] === search[searchIndex]) {
        score += (1 / search.length);
        searchIndex++;
      }
    }
    
    return score;
  }
  
  /**
   * Generate helpful error recovery suggestions
   */
  getErrorRecoverySuggestions(error) {
    const suggestions = [];
    
    if (error.includes('ENOENT') || error.includes('not found')) {
      suggestions.push('Check if the file path is correct');
      suggestions.push('Try listing files in the directory first');
      suggestions.push('Use tab completion for file names');
    } else if (error.includes('permission')) {
      suggestions.push('Check file permissions');
      suggestions.push('Try with sudo if appropriate');
      suggestions.push('Ensure you have write access');
    } else if (error.includes('syntax')) {
      suggestions.push('Check for syntax errors');
      suggestions.push('Validate your code format');
      suggestions.push('Use a linter to find issues');
    } else if (error.includes('network') || error.includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify the URL is correct');
      suggestions.push('Try again in a moment');
    }
    
    return suggestions;
  }
}

module.exports = TaskUnderstanding;