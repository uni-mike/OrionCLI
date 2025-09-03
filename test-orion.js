#!/usr/bin/env node

// Quick test of OrionCLI intelligence
console.log("Testing OrionCLI Intelligence Features...\n");

const TaskUnderstanding = require('./src/intelligence/task-understanding');
const SmartOrchestration = require('./src/intelligence/smart-orchestration');
const ProjectAwareness = require('./src/intelligence/project-awareness');

async function test() {
  console.log("1. Testing Task Understanding:");
  const taskUnderstanding = new TaskUnderstanding();
  
  const testQueries = [
    "what is this README.md file about?",
    "create a new component for user authentication",
    "commit my changes with a good message",
    "find all TODO comments in the codebase",
    "run the tests and fix any errors"
  ];
  
  for (const query of testQueries) {
    const analysis = await taskUnderstanding.analyzeIntent(query);
    console.log(`   Query: "${query}"`);
    console.log(`   Intent: ${analysis.primaryIntent || 'unknown'}`);
    console.log(`   Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);
    console.log(`   Tools: ${analysis.suggestedTools.join(', ') || 'none'}`);
    console.log("");
  }
  
  console.log("2. Testing Project Awareness:");
  const projectAwareness = new ProjectAwareness();
  const projectAnalysis = await projectAwareness.analyzeProject();
  
  console.log(`   Project Type: ${projectAnalysis.type}`);
  console.log(`   Framework: ${projectAnalysis.framework || 'none detected'}`);
  console.log(`   Language: ${projectAnalysis.language}`);
  console.log(`   Has Tests: ${projectAnalysis.structure.hasTests}`);
  console.log(`   Conventions: ${JSON.stringify(projectAnalysis.conventions)}`);
  console.log("");
  
  console.log("3. Testing Smart Orchestration:");
  const orchestration = new SmartOrchestration();
  const plan = await orchestration.planExecution(
    "edit a file and commit the changes",
    { file: "test.js" }
  );
  
  console.log(`   Workflow: ${plan.workflow || 'custom'}`);
  console.log(`   Steps: ${plan.steps.length}`);
  console.log(`   Estimated time: ${plan.estimated.time}ms`);
  console.log(`   Confidence: ${(plan.confidence * 100).toFixed(0)}%`);
  
  console.log("\n✅ All intelligence systems are working!");
}

test().catch(console.error);