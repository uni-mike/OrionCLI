# Available Models in OrionCLI

## Model Overview

OrionCLI supports multiple state-of-the-art language models, each optimized for different use cases.

## Supported Models

### GPT-5 Family (Default)
- **gpt-5**: Best for coding and technical tasks
- **gpt-5-chat**: Optimized for conversational interactions
- **gpt-5-mini**: Fast responses for simple queries
- **o4-mini**: Ultra-fast for basic operations

### GPT-4 Models
- **gpt-4o**: GPT-4 Optimized with vision capabilities
- **gpt-4o-mini**: Efficient GPT-4 variant for faster responses

### Advanced Reasoning
- **o3**: Advanced reasoning model for complex problem-solving
- **deepseek-r1**: DeepSeek's reasoning model for analytical tasks

## Model Selection

### Command Line
```bash
# Start with specific model
./orion.js --model gpt-4o

# Use specific environment file
./orion.js --env .env.4o
```

### Interactive Mode
```bash
# Switch models during conversation
/model gpt-5-chat
/model deepseek-r1
/model o3
```

## Environment Configuration

### Default Models (.env)
```env
ORION_DEFAULT_KEY=your_api_key
AZURE_OPENAI_API_VERSION=2024-12-01-preview
```

### GPT-4o Models (.env.4o)
```env
AZURE_4O_KEY=your_gpt4o_key
AZURE_4O_ENDPOINT=https://your-endpoint.openai.azure.com
```

### DeepSeek (.env.deepseek)
```env
DEEPSEEK_KEY=your_deepseek_key
DEEPSEEK_ENDPOINT=https://your-endpoint.models.ai.azure.com
```

## Model Capabilities

| Model | Speed | Reasoning | Coding | Vision | Cost |
|-------|-------|-----------|--------|--------|------|
| gpt-5 | Medium | High | Excellent | No | Medium |
| gpt-5-chat | Medium | High | Good | No | Medium |
| gpt-5-mini | Fast | Medium | Good | No | Low |
| o3 | Slow | Excellent | Good | No | High |
| gpt-4o | Medium | High | Good | Yes | Medium |
| gpt-4o-mini | Fast | Medium | Good | Yes | Low |
| deepseek-r1 | Medium | Excellent | Good | No | Medium |
| o4-mini | Very Fast | Low | Fair | No | Very Low |

## Best Practices

### Task-Based Selection
- **Coding**: Use `gpt-5` or `gpt-4o`
- **Analysis**: Use `o3` or `deepseek-r1`
- **Conversation**: Use `gpt-5-chat`
- **Quick tasks**: Use `gpt-5-mini` or `o4-mini`
- **Vision tasks**: Use `gpt-4o` (only model with vision)

### Performance Tips
1. Start with faster models for initial exploration
2. Switch to advanced models for complex reasoning
3. Use mini variants for repetitive tasks
4. Leverage model strengths for specific domains