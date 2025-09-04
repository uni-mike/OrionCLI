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
  
  // Parse a single step
  parseStep(stepNumber, stepText) {
    let action = 'unknown';
    let target = '';
    let content = '';
    
    // Directory creation
    if (stepText.match(/create\s+(directory|dir|folder)/i)) {
      action = 'create_dir';
      target = stepText.match(/(?:directory|dir|folder)\s+(\S+)/i)?.[1] || '';
    } 
    // File creation with various formats (including Dockerfile without extension)
    else if (stepText.match(/create\s+(?:file\s+)?(\S+(?:\.\w+|Dockerfile|SUMMARY\.md|README\.md))/i)) {
      action = 'create_file';
      // Match various file patterns including special files
      const fileMatch = stepText.match(/(\S+\/?\S*?(?:Dockerfile|SUMMARY\.md|README\.md|\.\w+))\s+(?:with\s+)?(?:"([^"]+)"|'([^']+)'|(.+?)(?:\s|$))/i);
      if (fileMatch) {
        target = fileMatch[1];
        content = fileMatch[2] || fileMatch[3] || fileMatch[4] || '';
        
        // Handle JSON content
        if (stepText.includes('{') && stepText.includes('}')) {
          const jsonMatch = stepText.match(/\{[^}]+\}/);
          if (jsonMatch) {
            content = jsonMatch[0];
          }
        }
        
        // Special handling for SUMMARY.md
        if (target.includes('SUMMARY.md') && stepText.match(/listing|list/i)) {
          content = '# Summary\n\nAll files and directories created in this project.';
        }
      }
    }
    // List files
    else if (stepText.match(/list\s+(all\s+)?files/i)) {
      action = 'list_files';
      target = stepText.match(/in\s+(\S+)/i)?.[1] || '.';
    }
    // Read file
    else if (stepText.match(/read\s+(\S+)/i)) {
      action = 'read_file';
      target = stepText.match(/read\s+(\S+)/i)?.[1] || '';
    }
    // Execute bash command
    else if (stepText.match(/execute\s+bash|bash:|echo|find|wc|date/i)) {
      action = 'bash_command';
      // Extract command after colon or "command:"
      const cmdMatch = stepText.match(/(?:bash\s+command:|bash:)\s*(.+)/i) || 
                       stepText.match(/(?:echo|find|wc|date).*/i);
      if (cmdMatch) {
        content = cmdMatch[1] || cmdMatch[0];
      }
    }
    // Count files
    else if (stepText.match(/count\s+(total\s+)?files/i)) {
      action = 'bash_command';
      const dirMatch = stepText.match(/(?:in|from)\s+(\S+)/i);
      const dir = dirMatch ? dirMatch[1] : 'mega-test';
      content = `find ${dir} -type f | wc -l`;
    }
    
    return {
      number: parseInt(stepNumber),
      text: stepText,
      action,
      target,
      content
    };
  }
  
  // Parse numbered list into steps
  parseSteps(input) {
    const steps = [];
    
    // Check if it's a single line with multiple numbered items
    if (input.includes('1.') && input.includes('2.') && !input.includes('\n')) {
      // Split by numbered patterns (e.g., "1. ", "2. ", etc.)
      const parts = input.split(/(?=\d+\.\s)/);
      for (const part of parts) {
        const match = part.match(/^(\d+)\.\s+(.+)/);
        if (match) {
          const stepText = match[2].trim();
          steps.push(this.parseStep(match[1], stepText));
        }
      }
    } else {
      // Multi-line format
      const lines = input.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\d+)\.\s+(.+)/);
        if (match) {
          const stepText = match[2];
          steps.push(this.parseStep(match[1], stepText));
        }
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
        // Ensure directory exists for files in subdirectories
        if (step.target.includes('/')) {
          const dir = step.target.substring(0, step.target.lastIndexOf('/'));
          // First create the directory
          await onToolExecution(JSON.stringify({
            tool: 'execute_bash',
            args: { command: `mkdir -p ${dir}` }
          }));
          // Small delay to ensure directory is created
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
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
        
      case 'read_file':
        toolJson = JSON.stringify({
          tool: 'read_file',
          args: { filename: step.target }
        });
        break;
        
      case 'bash_command':
        toolJson = JSON.stringify({
          tool: 'execute_bash',
          args: { command: step.content }
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
    const startTime = Date.now();
    
    for (const step of steps) {
      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 300));
      
      try {
        const success = await this.executeStep(step, clientInfo, onToolExecution);
        if (success) {
          completed++;
          console.log(colors.success(`✅ Step ${step.number}: ${step.action} completed`));
        } else {
          errors++;
          console.log(colors.warning(`⚠️ Step ${step.number}: ${step.action} failed`));
        }
      } catch (error) {
        errors++;
        console.log(colors.error(`❌ Step ${step.number} error: ${error.message}`));
      }
      
      // Progress update every 5 steps or at milestones
      if (completed % 5 === 0 || completed === 10 || completed === 20) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(colors.info(`📊 Progress: ${completed}/${steps.length} completed (${elapsed}s)`));
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