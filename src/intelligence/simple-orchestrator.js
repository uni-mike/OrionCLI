// Simplified Multi-Model Orchestrator
// Uses gpt-5-chat for both planning and execution to avoid complexity

const colors = require('../utils/colors');

class SimpleOrchestrator {
  constructor() {
    this.executionCount = 0;
    this.maxExecutions = 50; // Prevent infinite loops
  }
  
  // Check if task needs orchestration (10+ operations)
  needsOrchestration(input) {
    // Count numbered items
    const numberedItems = (input.match(/\d+\./g) || []).length;
    if (numberedItems >= 10) return true;
    
    // Check for explicit operation count
    if (input.match(/\b(\d{2,})\s+(operations?|steps?|tasks?|files?)/i)) return true;
    
    return false;
  }
  
  // Parse numbered list into steps
  parseSteps(input) {
    const steps = [];
    const lines = input.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\d+)\.\s+(.+)/);
      if (match) {
        const stepText = match[2];
        
        // Parse the step into action and details
        let action = 'unknown';
        let target = '';
        let content = '';
        
        if (stepText.match(/create\s+directory/i)) {
          action = 'create_dir';
          target = stepText.match(/directory\s+(\S+)/i)?.[1] || '';
        } else if (stepText.match(/create\s+(file\s+)?(\S+\.txt)/i)) {
          action = 'create_file';
          const fileMatch = stepText.match(/(\S+\.txt)\s+with\s+"([^"]+)"/i);
          if (fileMatch) {
            target = fileMatch[1];
            content = fileMatch[2];
          }
        } else if (stepText.match(/list\s+files/i)) {
          action = 'list_files';
          target = stepText.match(/in\s+(\S+)/i)?.[1] || '.';
        }
        
        steps.push({
          number: parseInt(match[1]),
          text: stepText,
          action,
          target,
          content
        });
      }
    }
    
    return steps;
  }
  
  // Execute a single step
  async executeStep(step, clientInfo, onToolExecution) {
    this.executionCount++;
    
    // Safety check
    if (this.executionCount > this.maxExecutions) {
      console.log(colors.error('❌ Execution limit reached'));
      return false;
    }
    
    console.log(colors.dim(`⚙️ Step ${step.number}: ${step.text}`));
    
    // Generate appropriate tool JSON based on action
    let toolJson = '';
    
    switch (step.action) {
      case 'create_dir':
        toolJson = JSON.stringify({
          tool: 'execute_bash',
          args: { command: `mkdir -p ${step.target}` }
        });
        break;
        
      case 'create_file':
        toolJson = JSON.stringify({
          tool: 'write_file',
          args: { 
            filename: step.target,
            content: step.content
          }
        });
        break;
        
      case 'list_files':
        toolJson = JSON.stringify({
          tool: 'list_files',
          args: { path: step.target }
        });
        break;
        
      default:
        // For unknown actions, try to use gpt-5-chat to figure it out
        const client = this.getClient(clientInfo);
        try {
          const response = await client.chat.completions.create({
            model: 'gpt-5-chat',
            messages: [
              { role: 'system', content: 'Output only the tool JSON.' },
              { role: 'user', content: `Execute: ${step.text}\nOutput the appropriate tool JSON.` }
            ]
          });
          toolJson = response.choices[0].message.content;
        } catch (error) {
          console.log(colors.error(`Failed to generate tool for: ${step.text}`));
          return false;
        }
    }
    
    // Execute the tool
    if (toolJson && onToolExecution) {
      try {
        await onToolExecution(toolJson);
        return true;
      } catch (error) {
        console.log(colors.warning(`⚠️ Step ${step.number} failed: ${error.message}`));
        return false;
      }
    }
    
    return false;
  }
  
  // Get client for model
  getClient(clientInfo) {
    if (clientInfo.createClient) {
      process.env.MODEL = 'gpt-5-chat';
      return clientInfo.createClient.call({ 
        config: clientInfo.config 
      });
    }
    return clientInfo.client || clientInfo;
  }
  
  // Main orchestration
  async orchestrate(input, clientInfo, systemPrompt, onToolExecution) {
    console.log(colors.info('🚀 Starting simplified orchestration...'));
    
    // Reset counter
    this.executionCount = 0;
    
    // Parse steps from input
    const steps = this.parseSteps(input);
    
    if (steps.length === 0) {
      console.log(colors.warning('No steps found to execute'));
      return { completedSteps: 0, errors: 0, success: false };
    }
    
    console.log(colors.dim(`📋 Found ${steps.length} steps to execute`));
    
    // Execute each step
    let completed = 0;
    let errors = 0;
    
    for (const step of steps) {
      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await this.executeStep(step, clientInfo, onToolExecution);
      if (success) {
        completed++;
      } else {
        errors++;
      }
      
      // Progress update
      if (completed % 5 === 0) {
        console.log(colors.dim(`📊 Progress: ${completed}/${steps.length} completed`));
      }
    }
    
    // Final summary
    const successRate = completed / steps.length;
    console.log(colors.dim(`\n📊 Orchestration Complete:`));
    console.log(colors.dim(`  Completed: ${completed}/${steps.length}`));
    console.log(colors.dim(`  Errors: ${errors}`));
    console.log(colors.dim(`  Success Rate: ${Math.round(successRate * 100)}%`));
    
    return {
      completedSteps: completed,
      errors: errors,
      success: successRate >= 0.8
    };
  }
}

module.exports = SimpleOrchestrator;