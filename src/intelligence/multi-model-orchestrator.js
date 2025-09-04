// Multi-Model Orchestrator for OrionCLI
// Uses o3 for planning and reasoning, gpt-5-chat for execution

const colors = require('../utils/colors');

class MultiModelOrchestrator {
  constructor() {
    this.modelCapabilities = {
      'o3': {
        strengths: ['reasoning', 'planning', 'analysis', 'complex_logic'],
        weaknesses: ['tool_execution', 'speed'],
        role: 'planner'
      },
      'gpt-5': {
        strengths: ['coding', 'technical', 'accuracy'],
        weaknesses: ['planning'],
        role: 'technical_executor'
      },
      'gpt-5-chat': {
        strengths: ['tool_execution', 'speed', 'multi_tool', 'file_ops'],
        weaknesses: ['complex_reasoning'],
        role: 'executor'
      },
      'gpt-5-mini': {
        strengths: ['speed', 'simple_tasks'],
        weaknesses: ['complex_tasks'],
        role: 'simple_executor'
      },
      'gpt-4o': {
        strengths: ['vision', 'multimodal'],
        weaknesses: ['text_only_tasks'],
        role: 'visual_analyzer'
      }
    };
    
    this.executionState = {
      plan: null,
      currentStep: 0,
      results: [],
      errors: []
    };
  }
  
  // Determine best model for a specific role
  selectModelForRole(role, taskComplexity = 'medium') {
    switch(role) {
      case 'planner':
        return 'o3'; // Always use o3 for planning
      
      case 'executor':
        // For tool execution, use gpt-5-chat
        return 'gpt-5-chat';
      
      case 'coder':
        return 'gpt-5';
      
      case 'analyzer':
        return taskComplexity === 'simple' ? 'gpt-5-mini' : 'o3';
      
      default:
        return 'gpt-5-chat';
    }
  }
  
  // Create execution plan using o3
  async createPlan(input, context, client, systemPrompt) {
    console.log(colors.dim('🧠 Using o3 for planning...'));
    
    const planningPrompt = `${systemPrompt}

PLANNING MODE - CREATE DETAILED EXECUTION PLAN:
You are the planning brain. Analyze this request and create a detailed step-by-step plan.
Output a JSON plan with this EXACT structure:

{
  "analysis": "Brief analysis of what needs to be done",
  "complexity": "simple|medium|complex|mega",
  "steps": [
    {
      "id": 1,
      "description": "Clear description of this step",
      "tool": "tool_name",
      "args": { "arg1": "value1" },
      "dependencies": [],
      "estimated_time": "1s"
    }
  ],
  "parallelizable": [
    [1, 2, 3],  // Steps that can run in parallel
    [4, 5]      // Next batch
  ]
}

User request: ${input}

Create the most efficient plan to accomplish this. Be thorough - include EVERY step needed.`;
    
    const messages = [
      { role: 'system', content: planningPrompt },
      { role: 'user', content: input }
    ];
    
    const completion = await client.chat.completions.create({
      model: 'o3',
      messages,
      temperature: 0.3 // Lower temperature for consistent planning
    });
    
    const planResponse = completion.choices[0].message.content;
    
    // Parse the plan
    try {
      const planMatch = planResponse.match(/\{[\s\S]*\}/);
      if (planMatch) {
        const plan = JSON.parse(planMatch[0]);
        console.log(colors.success(`✅ Plan created with ${plan.steps.length} steps`));
        return plan;
      }
    } catch (e) {
      console.log(colors.warning('⚠️ Could not parse plan, falling back to direct execution'));
    }
    
    return null;
  }
  
  // Select best model based on tool type
  selectModelForTool(toolName) {
    // Code generation tools -> gpt-5
    if (toolName.match(/code|function|class|script/i)) {
      return 'gpt-5';
    }
    
    // Simple file operations -> gpt-5-mini for speed
    if (toolName.match(/^(read_file|list_files|file_exists)$/i)) {
      return 'gpt-5-mini';
    }
    
    // Complex file operations -> gpt-5-chat
    if (toolName.match(/write_file|edit_file|create|update/i)) {
      return 'gpt-5-chat';
    }
    
    // System/bash commands -> gpt-5-chat
    if (toolName.match(/bash|execute|system|git/i)) {
      return 'gpt-5-chat';
    }
    
    // Web/search -> gpt-5-chat
    if (toolName.match(/web|search|fetch/i)) {
      return 'gpt-5-chat';
    }
    
    // Default to gpt-5-chat for reliability
    return 'gpt-5-chat';
  }
  
  // Execute a single step using appropriate executor model
  async executeStep(step, client, systemPrompt) {
    // Smart model selection based on tool type
    const executorModel = this.selectModelForTool(step.tool);
    console.log(colors.dim(`⚙️ Step ${step.id}: ${step.description} (${executorModel})`));
    
    const executionPrompt = `${systemPrompt}

EXECUTION MODE - EXECUTE THIS SPECIFIC STEP:
You are the execution engine. Execute ONLY this specific step.
Output the appropriate tool JSON and nothing else.

Step to execute:
- Description: ${step.description}
- Tool: ${step.tool}
- Arguments: ${JSON.stringify(step.args)}

Output the tool call in this format:
{"tool": "${step.tool}", "args": ${JSON.stringify(step.args)}}

Execute this step now.`;
    
    const messages = [
      { role: 'system', content: executionPrompt },
      { role: 'user', content: `Execute: ${step.description}` }
    ];
    
    const completion = await client.chat.completions.create({
      model: executorModel,
      messages,
      temperature: 0.5
    });
    
    return completion.choices[0].message.content;
  }
  
  // Execute plan with progress tracking
  async executePlan(plan, client, systemPrompt, onToolExecution) {
    const results = [];
    
    // Handle parallelizable groups
    if (plan.parallelizable && plan.parallelizable.length > 0) {
      for (const group of plan.parallelizable) {
        console.log(colors.info(`⚡ Executing ${group.length} steps in parallel`));
        
        const groupPromises = group.map(stepId => {
          const step = plan.steps.find(s => s.id === stepId);
          if (!step) return null;
          return this.executeStep(step, client, systemPrompt);
        });
        
        const groupResults = await Promise.all(groupPromises);
        
        // Process results
        for (const result of groupResults) {
          if (result && onToolExecution) {
            await onToolExecution(result);
          }
          results.push(result);
        }
      }
    } else {
      // Sequential execution
      for (const step of plan.steps) {
        const result = await this.executeStep(step, client, systemPrompt);
        if (result && onToolExecution) {
          await onToolExecution(result);
        }
        results.push(result);
        
        // Update progress
        this.executionState.currentStep++;
        const progress = Math.round((this.executionState.currentStep / plan.steps.length) * 100);
        console.log(colors.dim(`📊 Progress: ${progress}%`));
      }
    }
    
    return results;
  }
  
  // Main orchestration method
  async orchestrate(input, context, client, systemPrompt, onToolExecution) {
    try {
      // Step 1: Create plan using o3
      const plan = await this.createPlan(input, context, client, systemPrompt);
      
      if (!plan) {
        // Fallback to direct execution
        console.log(colors.warning('⚠️ No plan created, using direct execution'));
        return null;
      }
      
      this.executionState.plan = plan;
      this.executionState.currentStep = 0;
      this.executionState.results = [];
      
      // Step 2: Execute plan using appropriate models
      const results = await this.executePlan(plan, client, systemPrompt, onToolExecution);
      
      // Step 3: Analyze results if needed
      if (plan.complexity === 'mega' || plan.complexity === 'complex') {
        console.log(colors.dim('🧠 Analyzing results with o3...'));
        // Could add result analysis here if needed
      }
      
      return {
        plan,
        results,
        success: true
      };
      
    } catch (error) {
      console.error(colors.error('Orchestration error:'), error);
      return null;
    }
  }
  
  // Check if task needs orchestration
  needsOrchestration(input) {
    // Mega tasks with many steps
    if (input.match(/\d{2,}/) && input.match(/operations?|steps?|tasks?/i)) {
      return true;
    }
    
    // Multiple numbered items
    const numberedItems = input.match(/\d+\.\s/g);
    if (numberedItems && numberedItems.length > 5) {
      return true;
    }
    
    // Complex multi-step instructions
    if (input.split(/[,;]/).length > 5) {
      return true;
    }
    
    // Explicit complexity keywords
    if (input.match(/\b(comprehensive|complete|all|every|entire|full)\b/i)) {
      return true;
    }
    
    return false;
  }
}

module.exports = MultiModelOrchestrator;