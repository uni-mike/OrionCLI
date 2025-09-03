/**
 * Enhanced Orchestration System
 * Ensures proper tool chaining, planning, and todo management
 */

class EnhancedOrchestration {
  constructor() {
    this.activePlan = null;
    this.executionHistory = [];
    this.todoList = [];
    
    // Define common workflows that should trigger todo planning
    this.complexWorkflows = {
      multiFileEdit: {
        triggers: ['multiple files', 'all files', 'across the project', 'refactor'],
        requiresTodo: true,
        steps: ['analyze_scope', 'create_plan', 'execute_changes', 'verify_results']
      },
      
      featureImplementation: {
        triggers: ['implement', 'add feature', 'create component', 'build'],
        requiresTodo: true,
        steps: ['understand_requirements', 'design_solution', 'implement', 'test', 'document']
      },
      
      debugging: {
        triggers: ['fix bug', 'debug', 'error', 'not working', 'broken'],
        requiresTodo: true,
        steps: ['identify_issue', 'analyze_cause', 'develop_fix', 'test_fix', 'verify']
      },
      
      projectSetup: {
        triggers: ['setup project', 'initialize', 'configure', 'install'],
        requiresTodo: true,
        steps: ['check_requirements', 'install_dependencies', 'configure', 'test_setup']
      }
    };
    
    // Tool chains for automatic sequencing
    this.toolChains = {
      fileModification: [
        { tool: 'read_file', when: 'always' },
        { tool: 'create_backup', when: 'if_important' },
        { tool: 'edit_file', when: 'always' },
        { tool: 'validate_syntax', when: 'if_code' },
        { tool: 'format_code', when: 'if_configured' }
      ],
      
      gitCommit: [
        { tool: 'git_status', when: 'always' },
        { tool: 'git_diff', when: 'always' },
        { tool: 'run_tests', when: 'if_available' },
        { tool: 'git_add', when: 'if_changes' },
        { tool: 'git_commit', when: 'always' }
      ],
      
      codeSearch: [
        { tool: 'search_files', when: 'always' },
        { tool: 'grep_content', when: 'if_needed' },
        { tool: 'analyze_results', when: 'always' }
      ]
    };
  }
  
  /**
   * Analyze if task requires todo planning
   */
  requiresTodoPlanning(task, context) {
    const taskLower = task.toLowerCase();
    
    // Check if task matches complex workflows
    for (const [workflowName, workflow] of Object.entries(this.complexWorkflows)) {
      if (workflow.requiresTodo) {
        for (const trigger of workflow.triggers) {
          if (taskLower.includes(trigger)) {
            return {
              required: true,
              workflow: workflowName,
              reason: `Complex task detected: ${trigger}`,
              steps: workflow.steps
            };
          }
        }
      }
    }
    
    // Check for multi-step indicators
    const multiStepIndicators = [
      /step[s]?\s+\d+/i,
      /first.*then.*finally/i,
      /\d+\.\s+\w+.*\d+\.\s+\w+/,
      /and then/i,
      /after that/i
    ];
    
    for (const indicator of multiStepIndicators) {
      if (indicator.test(task)) {
        return {
          required: true,
          workflow: 'custom',
          reason: 'Multi-step task detected',
          steps: this.extractStepsFromTask(task)
        };
      }
    }
    
    // Check if user explicitly mentions planning
    if (/plan|todo|tasks|steps/i.test(taskLower)) {
      return {
        required: true,
        workflow: 'custom',
        reason: 'Planning requested',
        steps: []
      };
    }
    
    return { required: false };
  }
  
  /**
   * Build execution plan with todo items
   */
  async buildExecutionPlan(task, context) {
    const plan = {
      id: this.generatePlanId(),
      task: task,
      todos: [],
      toolChain: [],
      estimatedTime: 0,
      status: 'planning'
    };
    
    // Check if todo planning is needed
    const todoCheck = this.requiresTodoPlanning(task, context);
    
    if (todoCheck.required) {
      // Create todo items for complex task
      plan.todos = this.createTodoItems(task, todoCheck);
      
      // Map todos to tool chains
      for (const todo of plan.todos) {
        const tools = this.mapTodoToTools(todo);
        plan.toolChain.push({
          todoId: todo.id,
          tools: tools,
          status: 'pending'
        });
      }
    } else {
      // Simple task - direct tool chain
      plan.toolChain = this.buildSimpleToolChain(task, context);
    }
    
    // Estimate execution time
    plan.estimatedTime = this.estimateExecutionTime(plan.toolChain);
    
    // Store active plan
    this.activePlan = plan;
    
    return plan;
  }
  
  /**
   * Create todo items for task
   */
  createTodoItems(task, todoCheck) {
    const todos = [];
    
    if (todoCheck.steps && todoCheck.steps.length > 0) {
      // Use predefined steps
      todoCheck.steps.forEach((step, index) => {
        todos.push({
          id: `todo_${Date.now()}_${index}`,
          content: this.humanizeStep(step),
          status: 'pending',
          activeForm: this.getActiveForm(step),
          priority: index === 0 ? 'high' : 'medium'
        });
      });
    } else {
      // Extract steps from task description
      const extractedSteps = this.extractStepsFromTask(task);
      extractedSteps.forEach((step, index) => {
        todos.push({
          id: `todo_${Date.now()}_${index}`,
          content: step,
          status: 'pending',
          activeForm: this.getActiveFormFromContent(step),
          priority: index === 0 ? 'high' : 'medium'
        });
      });
    }
    
    return todos;
  }
  
  /**
   * Extract steps from task description
   */
  extractStepsFromTask(task) {
    const steps = [];
    
    // Check for numbered steps
    const numberedSteps = task.match(/\d+\.\s+[^.]+/g);
    if (numberedSteps) {
      return numberedSteps.map(s => s.replace(/^\d+\.\s+/, ''));
    }
    
    // Check for keyword-based steps
    const keywords = ['first', 'then', 'next', 'after', 'finally'];
    const sentences = task.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      for (const keyword of keywords) {
        if (sentence.toLowerCase().includes(keyword)) {
          steps.push(sentence.trim());
          break;
        }
      }
    });
    
    // If no steps found, create basic ones
    if (steps.length === 0) {
      steps.push(`Analyze requirements for: ${task.slice(0, 50)}`);
      steps.push('Implement solution');
      steps.push('Test and verify');
    }
    
    return steps;
  }
  
  /**
   * Map todo item to required tools
   */
  mapTodoToTools(todo) {
    const tools = [];
    const content = todo.content.toLowerCase();
    
    // File operations
    if (/read|view|check|analyze/.test(content)) {
      tools.push('read_file', 'list_files');
    }
    if (/write|create|add/.test(content)) {
      tools.push('write_file', 'create_file');
    }
    if (/edit|modify|update|change/.test(content)) {
      tools.push('edit_file', 'str_replace_editor');
    }
    if (/search|find|locate/.test(content)) {
      tools.push('search_files', 'grep_content');
    }
    
    // Git operations
    if (/commit|save|push/.test(content)) {
      tools.push('git_status', 'git_commit');
    }
    if (/branch|merge/.test(content)) {
      tools.push('git_branch', 'git_merge');
    }
    
    // System operations
    if (/run|execute|test|build/.test(content)) {
      tools.push('execute_bash');
    }
    if (/install|setup|configure/.test(content)) {
      tools.push('execute_bash', 'write_file');
    }
    
    // Default fallback
    if (tools.length === 0) {
      tools.push('execute_bash', 'file_tools');
    }
    
    return tools;
  }
  
  /**
   * Build simple tool chain for non-complex tasks
   */
  buildSimpleToolChain(task, context) {
    const chain = [];
    const taskLower = task.toLowerCase();
    
    // File reading
    if (/what is|explain|show|read/.test(taskLower)) {
      chain.push({ tool: 'read_file', params: context });
    }
    
    // File modification
    if (/edit|modify|change|update/.test(taskLower)) {
      chain.push(
        { tool: 'read_file', params: context },
        { tool: 'edit_file', params: context }
      );
    }
    
    // File creation
    if (/create|write|new file/.test(taskLower)) {
      chain.push({ tool: 'create_file', params: context });
    }
    
    // Search operations
    if (/search|find|grep/.test(taskLower)) {
      chain.push({ tool: 'search_files', params: context });
    }
    
    // Git operations
    if (/git|commit|push|pull/.test(taskLower)) {
      chain.push(
        { tool: 'git_status', params: {} },
        { tool: 'git_diff', params: {} }
      );
    }
    
    return chain;
  }
  
  /**
   * Execute the plan step by step
   */
  async executePlan(plan, toolExecutor) {
    const results = {
      planId: plan.id,
      success: true,
      completedTodos: [],
      executedTools: [],
      errors: []
    };
    
    // Update plan status
    plan.status = 'executing';
    
    // Execute each todo/tool chain
    for (const chain of plan.toolChain) {
      try {
        // Update todo status if exists
        if (chain.todoId) {
          const todo = plan.todos.find(t => t.id === chain.todoId);
          if (todo) {
            todo.status = 'in_progress';
            results.completedTodos.push(todo.id);
          }
        }
        
        // Execute tools in sequence
        for (const tool of chain.tools) {
          const result = await this.executeToolWithRetry(tool, toolExecutor);
          results.executedTools.push({
            tool: tool,
            result: result,
            timestamp: Date.now()
          });
          
          // Check for errors
          if (result.error) {
            results.errors.push(result.error);
            
            // Attempt recovery
            const recovery = await this.attemptRecovery(tool, result);
            if (recovery) {
              results.executedTools.push({
                tool: 'recovery',
                result: recovery
              });
            }
          }
        }
        
        // Update todo status to completed
        if (chain.todoId) {
          const todo = plan.todos.find(t => t.id === chain.todoId);
          if (todo) {
            todo.status = 'completed';
          }
        }
        
      } catch (error) {
        results.errors.push(error.message);
        results.success = false;
      }
    }
    
    // Update plan status
    plan.status = results.success ? 'completed' : 'failed';
    
    // Store in history
    this.executionHistory.push({
      plan: plan,
      results: results,
      timestamp: Date.now()
    });
    
    return results;
  }
  
  /**
   * Execute tool with retry logic
   */
  async executeToolWithRetry(tool, toolExecutor, maxRetries = 2) {
    let attempts = 0;
    let lastError = null;
    
    while (attempts < maxRetries) {
      try {
        const result = await toolExecutor(tool);
        
        // Check if successful
        if (!result.error) {
          return result;
        }
        
        lastError = result.error;
        attempts++;
        
        // Wait before retry
        if (attempts < maxRetries) {
          await this.sleep(1000 * attempts);
        }
      } catch (error) {
        lastError = error.message;
        attempts++;
      }
    }
    
    return { error: lastError };
  }
  
  /**
   * Attempt to recover from tool failure
   */
  async attemptRecovery(tool, result) {
    const error = result.error || '';
    
    // File not found - suggest alternatives
    if (error.includes('not found') || error.includes('ENOENT')) {
      return {
        suggestion: 'Try listing files first to find the correct path',
        alternativeTools: ['list_files', 'search_files']
      };
    }
    
    // Permission denied - suggest elevation
    if (error.includes('permission') || error.includes('EACCES')) {
      return {
        suggestion: 'Permission denied. Try with elevated privileges',
        alternativeTools: ['execute_bash:sudo']
      };
    }
    
    // Syntax error - suggest validation
    if (error.includes('syntax') || error.includes('SyntaxError')) {
      return {
        suggestion: 'Syntax error detected. Validate the code',
        alternativeTools: ['validate_syntax', 'lint_code']
      };
    }
    
    return null;
  }
  
  /**
   * Get current plan status
   */
  getPlanStatus() {
    if (!this.activePlan) {
      return { status: 'no_active_plan' };
    }
    
    const completedTodos = this.activePlan.todos.filter(t => t.status === 'completed').length;
    const totalTodos = this.activePlan.todos.length;
    
    return {
      status: this.activePlan.status,
      progress: totalTodos > 0 ? (completedTodos / totalTodos * 100).toFixed(0) + '%' : 'N/A',
      currentTodo: this.activePlan.todos.find(t => t.status === 'in_progress'),
      remainingTodos: this.activePlan.todos.filter(t => t.status === 'pending').length
    };
  }
  
  /**
   * Format plan for display
   */
  formatPlanForDisplay(plan) {
    let output = '📋 **Execution Plan**\n\n';
    
    if (plan.todos.length > 0) {
      output += '**Todo Items:**\n';
      plan.todos.forEach((todo, index) => {
        const status = todo.status === 'completed' ? '✅' :
                       todo.status === 'in_progress' ? '🔄' : '⏳';
        output += `${index + 1}. ${status} ${todo.content}\n`;
      });
      output += '\n';
    }
    
    output += `**Estimated Time:** ${this.formatTime(plan.estimatedTime)}\n`;
    output += `**Tools Required:** ${plan.toolChain.length} tool chains\n`;
    
    return output;
  }
  
  // Helper methods
  
  generatePlanId() {
    return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  humanizeStep(step) {
    return step.replace(/_/g, ' ')
               .replace(/([A-Z])/g, ' $1')
               .trim()
               .replace(/^./, str => str.toUpperCase());
  }
  
  getActiveForm(step) {
    const forms = {
      analyze_scope: 'Analyzing scope',
      create_plan: 'Creating plan',
      execute_changes: 'Executing changes',
      verify_results: 'Verifying results',
      understand_requirements: 'Understanding requirements',
      design_solution: 'Designing solution',
      implement: 'Implementing',
      test: 'Testing',
      document: 'Documenting'
    };
    
    return forms[step] || 'Processing';
  }
  
  getActiveFormFromContent(content) {
    const firstWord = content.split(' ')[0].toLowerCase();
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1) + 'ing';
  }
  
  estimateExecutionTime(toolChain) {
    // Estimate 500ms per tool average
    return toolChain.length * 500;
  }
  
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EnhancedOrchestration;