// Adaptive Multi-Model Orchestrator with Feedback Loops
// Uses appropriate models with deterministic settings for tool execution

const colors = require('../utils/colors');

class AdaptiveOrchestrator {
  constructor() {
    this.modelConfigs = {
      'o3': {
        role: 'planner_analyzer',
        capabilities: ['reasoning', 'planning', 'analysis', 'strategy'],
        supportsTemperature: false,
        temperature: null // o3 doesn't support temperature
      },
      'gpt-5': {
        role: 'code_expert',
        capabilities: ['code_generation', 'technical', 'algorithms'],
        supportsTemperature: true,
        temperature: 0.2 // Low for deterministic code generation
      },
      'gpt-5-chat': {
        role: 'executor',
        capabilities: ['tool_execution', 'file_ops', 'general_tasks'],
        supportsTemperature: true,
        temperature: 0.3 // Low for reliable execution
      },
      'gpt-5-mini': {
        role: 'speed_executor',
        capabilities: ['simple_tasks', 'quick_ops', 'basic_reads'],
        supportsTemperature: true,
        temperature: 0.1 // Very low for consistency
      },
      'gpt-4o': {
        role: 'visual',
        capabilities: ['image_analysis', 'multimodal'],
        supportsTemperature: true,
        temperature: 0.3
      },
      'o4-mini': {
        role: 'checker',
        capabilities: ['existence_checks', 'simple_queries'],
        supportsTemperature: true,
        temperature: 0 // Zero for maximum determinism
      }
    };
    
    this.state = {
      goal: null,
      strategy: null,
      completedSteps: [],
      errors: [],
      adaptations: 0,
      currentChunk: null
    };
  }
  
  // Select optimal model based on task requirements
  selectModel(taskType, complexity = 'medium', context = {}) {
    // Task-specific model selection matrix
    const taskModelMap = {
      // Planning & Analysis
      'plan': 'o3',
      'analyze': complexity === 'simple' ? 'gpt-5-chat' : 'o3',
      'strategize': 'o3',
      'error_recovery': 'o3',
      
      // File Operations
      'create_dir': 'gpt-5-mini',
      'write_file': 'gpt-5-chat',
      'read_file': complexity === 'simple' ? 'gpt-5-mini' : 'gpt-5-chat',
      'edit_file': 'gpt-5-chat',
      'delete_file': 'gpt-5-chat',
      'list_files': 'gpt-5-mini',
      'file_exists': 'o4-mini',
      
      // Code Generation
      'generate_code': 'gpt-5',
      'write_function': 'gpt-5',
      'create_class': 'gpt-5',
      'refactor_code': 'gpt-5',
      
      // System Operations
      'bash_simple': 'gpt-5-mini',
      'bash_complex': 'gpt-5-chat',
      'git_operation': 'gpt-5-chat',
      'docker_command': 'gpt-5-chat',
      'ssh_operation': 'gpt-5-chat',
      
      // Web & Search
      'web_search': 'gpt-5-chat',
      'api_call': 'gpt-5-chat',
      
      // Visual
      'analyze_image': 'gpt-4o',
      'create_diagram': 'gpt-4o'
    };
    
    let selectedModel = taskModelMap[taskType] || 'gpt-5-chat';
    
    // Upgrade model if previous attempt failed
    if (context.previousFailure) {
      const upgradeMap = {
        'o4-mini': 'gpt-5-mini',
        'gpt-5-mini': 'gpt-5-chat',
        'gpt-5-chat': 'gpt-5',
        'gpt-5': 'o3'
      };
      selectedModel = upgradeMap[selectedModel] || selectedModel;
    }
    
    return selectedModel;
  }
  
  // Helper to get client for specific model
  getClientForModel(modelName, clientInfo) {
    // If clientInfo has the factory functions, use them
    if (clientInfo.config && clientInfo.createClient) {
      const savedModel = process.env.MODEL;
      process.env.MODEL = modelName;
      const config = clientInfo.config();
      const client = clientInfo.createClient.call({ config });
      process.env.MODEL = savedModel;
      return client;
    }
    // Otherwise use the provided client
    return clientInfo.client || clientInfo;
  }
  
  // Create initial understanding and strategy
  async createStrategy(input, clientInfo) {
    console.log(colors.dim('🧠 o3: Analyzing request and creating strategy...'));
    
    try {
    const client = this.getClientForModel('o3', clientInfo);
    
    const strategyPrompt = `Analyze this request and create an execution strategy.

Request: ${input}

Output a JSON strategy:
{
  "goal": "Clear description of the end goal",
  "complexity": "simple|medium|complex|mega",
  "total_steps_estimate": <number>,
  "approach": "Description of overall approach",
  "phases": [
    {
      "phase": 1,
      "description": "Phase description",
      "steps_estimate": <number>
    }
  ],
  "critical_points": ["Points where validation is crucial"],
  "parallelizable": true/false,
  "estimated_time": "Xs-Xm"
}`;
    
    const messages = [
      { role: 'system', content: 'You are a strategic planner. Create execution strategies.' },
      { role: 'user', content: strategyPrompt }
    ];
    
    const completion = await client.chat.completions.create({
      model: 'o3',
      messages
      // o3 doesn't support temperature
    });
    
    const response = completion.choices[0].message.content;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[0]);
        this.state.strategy = strategy;
        this.state.goal = strategy.goal;
        console.log(colors.success(`✅ Strategy created: ${strategy.approach}`));
        return strategy;
      }
    } catch (e) {
      console.log(colors.warning('⚠️ Could not parse strategy'));
    }
    
    } catch (error) {
      console.log(colors.error(`❌ Strategy creation failed: ${error.message}`));
      return null;
    }
    
    return null;
  }
  
  // Plan next chunk adaptively
  async planNextChunk(clientInfo, systemPrompt) {
    const client = this.getClientForModel('o3', clientInfo);
    const currentState = {
      completed: this.state.completedSteps.length,
      errors: this.state.errors.length,
      adaptations: this.state.adaptations
    };
    
    console.log(colors.dim(`📋 o3: Planning next chunk (${currentState.completed} steps completed)...`));
    
    const chunkPrompt = `${systemPrompt}

CURRENT STATE:
- Goal: ${this.state.goal}
- Strategy: ${this.state.strategy?.approach}
- Completed: ${currentState.completed} steps
- Errors encountered: ${currentState.errors}
- Previous adaptations: ${currentState.adaptations}

Plan the next 5-10 steps to progress toward the goal.
Consider what has been completed and any errors encountered.

Output JSON:
{
  "chunk_id": <number>,
  "steps": [
    {
      "id": <number>,
      "action": "Description",
      "tool": "tool_name",
      "args": {},
      "model_hint": "suggested_model",
      "can_parallel": true/false
    }
  ]
}`;
    
    const messages = [
      { role: 'system', content: 'You are planning the next execution chunk.' },
      { role: 'user', content: chunkPrompt }
    ];
    
    const completion = await client.chat.completions.create({
      model: 'o3',
      messages
    });
    
    const response = completion.choices[0].message.content;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const chunk = JSON.parse(jsonMatch[0]);
        this.state.currentChunk = chunk;
        return chunk;
      }
    } catch (e) {
      console.log(colors.warning('⚠️ Could not parse chunk plan'));
    }
    
    return null;
  }
  
  // Execute a single step with appropriate model and temperature
  async executeStep(step, clientInfo, systemPrompt) {
    // Determine task type from tool name
    let taskType = step.tool;
    if (step.tool === 'execute_bash') {
      taskType = step.args?.command?.length > 50 ? 'bash_complex' : 'bash_simple';
    }
    
    // Select optimal model
    let model = step.model_hint || this.selectModel(taskType);
    
    // Fix invalid model names from o3
    if (model === 'shell' || model === 'bash' || !this.modelConfigs[model]) {
      model = 'gpt-5-chat'; // Default to reliable executor
    }
    
    const modelConfig = this.modelConfigs[model];
    const client = this.getClientForModel(model, clientInfo);
    
    console.log(colors.dim(`⚙️ ${model}: ${step.action}`));
    
    const executionPrompt = `${systemPrompt}

EXECUTE THIS SPECIFIC STEP:
Output only the tool JSON, no explanation.

Step: ${step.action}
Tool: ${step.tool}
Arguments: ${JSON.stringify(step.args)}

Format:
{"tool": "${step.tool}", "args": ${JSON.stringify(step.args)}}`;
    
    const messages = [
      { role: 'system', content: 'Execute the given step precisely.' },
      { role: 'user', content: executionPrompt }
    ];
    
    const completionParams = {
      model: model,
      messages
    };
    
    // Add temperature only if model supports it and it's not default
    if (modelConfig.supportsTemperature && modelConfig.temperature !== undefined && modelConfig.temperature !== 1) {
      // Some models only support default temperature
      if (model === 'gpt-5' || model === 'gpt-5-mini') {
        // These models may not support custom temperature
        // Skip temperature setting to avoid errors
      } else {
        completionParams.temperature = modelConfig.temperature;
      }
    }
    
    const completion = await client.chat.completions.create(completionParams);
    
    return {
      response: completion.choices[0].message.content,
      model: model,
      step: step
    };
  }
  
  // Execute chunk with feedback and adaptation
  async executeChunk(chunk, clientInfo, systemPrompt, onToolExecution) {
    const results = [];
    const failures = [];
    
    for (const step of chunk.steps) {
      let success = false;
      let attempts = 0;
      let lastError = null;
      
      while (!success && attempts < 3) {
        try {
          attempts++;
          
          // Add context if retrying
          const context = attempts > 1 ? { previousFailure: true } : {};
          
          // Execute step
          const result = await this.executeStep(step, clientInfo, systemPrompt);
          
          // Process tool execution
          if (result.response && onToolExecution) {
            await onToolExecution(result.response);
          }
          
          // Mark as successful
          this.state.completedSteps.push(step);
          results.push({ step, success: true, model: result.model });
          success = true;
          
        } catch (error) {
          lastError = error;
          console.log(colors.warning(`⚠️ Attempt ${attempts} failed: ${error.message}`));
          
          // If not last attempt, try with upgraded model
          if (attempts < 3) {
            step.model_hint = this.selectModel(
              step.tool,
              'complex',
              { previousFailure: true }
            );
            console.log(colors.dim(`🔄 Retrying with ${step.model_hint}...`));
          }
        }
      }
      
      if (!success) {
        failures.push({ step, error: lastError });
        this.state.errors.push({ step: step.id, error: lastError?.message });
      }
    }
    
    // Calculate success rate
    const successRate = results.filter(r => r.success).length / chunk.steps.length;
    
    return {
      results,
      failures,
      successRate,
      needsAdaptation: successRate < 0.8
    };
  }
  
  // Analyze failures and create recovery plan
  async analyzeAndRecover(failures, clientInfo) {
    const client = this.getClientForModel('o3', clientInfo);
    if (failures.length === 0) return null;
    
    console.log(colors.dim(`🔍 o3: Analyzing ${failures.length} failures...`));
    
    const analysisPrompt = `Analyze these failures and suggest recovery:

Failures:
${failures.map(f => `- Step ${f.step.id}: ${f.step.action} - Error: ${f.error?.message}`).join('\n')}

Suggest recovery strategy:
{
  "analysis": "What went wrong",
  "recovery_steps": [
    {
      "action": "Recovery action",
      "tool": "tool_name",
      "args": {},
      "reason": "Why this will work"
    }
  ]
}`;
    
    const messages = [
      { role: 'system', content: 'Analyze failures and suggest recovery.' },
      { role: 'user', content: analysisPrompt }
    ];
    
    const completion = await client.chat.completions.create({
      model: 'o3',
      messages
    });
    
    const response = completion.choices[0].message.content;
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const recovery = JSON.parse(jsonMatch[0]);
        console.log(colors.info(`💡 Recovery strategy: ${recovery.analysis}`));
        return recovery;
      }
    } catch (e) {
      console.log(colors.warning('⚠️ Could not parse recovery plan'));
    }
    
    return null;
  }
  
  // Main orchestration loop
  async orchestrate(input, clientInfo, systemPrompt, onToolExecution) {
    console.log(colors.info('🚀 Starting adaptive orchestration...'));
    
    // Step 1: Create strategy
    const strategy = await this.createStrategy(input, clientInfo);
    if (!strategy) {
      console.log(colors.error('Failed to create strategy'));
      return null;
    }
    
    // Step 2: Execute in adaptive chunks
    let complete = false;
    let chunkCount = 0;
    const maxChunks = Math.ceil(strategy.total_steps_estimate / 7); // Average 7 steps per chunk
    
    while (!complete && chunkCount < maxChunks) {
      chunkCount++;
      
      // Plan next chunk
      const chunk = await this.planNextChunk(clientInfo, systemPrompt);
      if (!chunk) {
        console.log(colors.warning('No more chunks to execute'));
        break;
      }
      
      // Execute chunk
      const chunkResults = await this.executeChunk(
        chunk,
        clientInfo,
        systemPrompt,
        onToolExecution
      );
      
      // Handle failures and adaptation
      if (chunkResults.needsAdaptation) {
        console.log(colors.warning(`⚠️ Chunk success rate: ${Math.round(chunkResults.successRate * 100)}%`));
        
        // Analyze and recover
        const recovery = await this.analyzeAndRecover(chunkResults.failures, clientInfo);
        if (recovery && recovery.recovery_steps) {
          // Execute recovery steps
          const recoveryChunk = {
            chunk_id: -1,
            steps: recovery.recovery_steps.map((s, i) => ({
              id: `recovery_${i}`,
              action: s.action,
              tool: s.tool,
              args: s.args
            }))
          };
          
          console.log(colors.info('🔧 Executing recovery plan...'));
          await this.executeChunk(recoveryChunk, clientInfo, systemPrompt, onToolExecution);
        }
        
        this.state.adaptations++;
      }
      
      // Check if goal is achieved
      if (this.state.completedSteps.length >= strategy.total_steps_estimate * 0.9) {
        console.log(colors.success('✅ Goal appears to be achieved'));
        complete = true;
      }
    }
    
    // Final summary
    const summary = {
      goal: this.state.goal,
      strategy: this.state.strategy,
      completedSteps: this.state.completedSteps.length,
      errors: this.state.errors.length,
      adaptations: this.state.adaptations,
      success: complete
    };
    
    console.log(colors.dim('📊 Orchestration Summary:'));
    console.log(colors.dim(`  Completed: ${summary.completedSteps} steps`));
    console.log(colors.dim(`  Errors: ${summary.errors}`));
    console.log(colors.dim(`  Adaptations: ${summary.adaptations}`));
    
    return summary;
  }
  
  // Check if task needs orchestration
  needsOrchestration(input) {
    // Numbered lists with many items
    const numberedItems = (input.match(/\d+\./g) || []).length;
    if (numberedItems >= 10) return true;
    
    // Explicit count of operations
    if (input.match(/\b(\d{2,})\s+(operations?|steps?|tasks?|items?)/i)) return true;
    
    // Multiple "and then" or sequencing words
    const sequenceWords = (input.match(/\b(then|after|next|finally|subsequently)\b/gi) || []).length;
    if (sequenceWords >= 3) return true;
    
    // Long complex instructions
    if (input.length > 500 && input.includes('Create')) return true;
    
    // Keywords indicating complexity
    if (input.match(/\b(comprehensive|complete|entire|everything|all of these)\b/i)) return true;
    
    return false;
  }
}

module.exports = AdaptiveOrchestrator;