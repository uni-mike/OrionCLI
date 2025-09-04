#!/usr/bin/env node

// Test API connectivity for all models
require('dotenv').config();
const { AzureOpenAI } = require('openai');

async function testModel(modelName, deployment, endpoint, apiKey) {
  console.log(`\nTesting ${modelName}...`);
  
  try {
    const client = new AzureOpenAI({
      endpoint: endpoint,
      apiKey: apiKey,
      apiVersion: '2024-10-01-preview',
      deployment: deployment
    });
    
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Reply with exactly: "OK"' }
    ];
    
    const completionParams = {
      model: deployment,
      messages: messages
    };
    
    // Only add temperature for models that support it
    if (modelName !== 'o3') {
      completionParams.temperature = 0.1;
    }
    
    console.log(`  Calling API...`);
    const completion = await client.chat.completions.create(completionParams);
    const response = completion.choices[0].message.content;
    
    if (response) {
      console.log(`  ✅ ${modelName} works! Response: ${response.substring(0, 50)}`);
      return true;
    } else {
      console.log(`  ❌ ${modelName} returned empty response`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ${modelName} failed: ${error.message}`);
    if (error.message.includes('401')) {
      console.log(`     Check API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    }
    if (error.message.includes('404')) {
      console.log(`     Check deployment name: ${deployment}`);
    }
    return false;
  }
}

async function testAllModels() {
  console.log('Testing API Connectivity for All Models');
  console.log('=' .repeat(50));
  
  const models = [
    {
      name: 'gpt-5-chat',
      deployment: 'gpt-5-chat',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY
    },
    {
      name: 'gpt-5',
      deployment: 'gpt-5',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY
    },
    {
      name: 'gpt-5-mini',
      deployment: 'gpt-5-mini',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY
    },
    {
      name: 'o3',
      deployment: 'o3',
      endpoint: process.env.ORION_O3_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.ORION_O3_KEY || process.env.AZURE_OPENAI_KEY
    },
    {
      name: 'gpt-4o',
      deployment: 'gpt-4o',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY
    }
  ];
  
  const results = {};
  
  for (const model of models) {
    if (!model.apiKey || !model.endpoint) {
      console.log(`\n⚠️ Skipping ${model.name} - missing credentials`);
      console.log(`  Endpoint: ${model.endpoint ? 'SET' : 'NOT SET'}`);
      console.log(`  API Key: ${model.apiKey ? 'SET' : 'NOT SET'}`);
      results[model.name] = false;
      continue;
    }
    
    results[model.name] = await testModel(model.name, model.deployment, model.endpoint, model.apiKey);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('Summary:');
  
  let workingModels = 0;
  for (const [model, works] of Object.entries(results)) {
    console.log(`  ${model}: ${works ? '✅' : '❌'}`);
    if (works) workingModels++;
  }
  
  console.log(`\n${workingModels}/${Object.keys(results).length} models working`);
  
  if (!results['o3'] && !results['gpt-5-chat']) {
    console.log('\n⚠️ Critical: Neither o3 nor gpt-5-chat working!');
    console.log('Orchestration will fail without at least one of these.');
  } else if (!results['o3']) {
    console.log('\n⚠️ Warning: o3 not working');
    console.log('Will need to use gpt-5-chat for planning instead.');
  }
}

testAllModels().catch(console.error);