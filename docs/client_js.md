# Polinations.AI / GPT4Free.js Client Documentation

## Overview
This JavaScript class provides a unified interface for interacting with both Pollinations.AI and GPT4Free API endpoints. It supports both regular and streaming completions, model listing, and automatic model alias resolution.

## Installation
Include the client in your HTML:
```html
<script type="module">
    import Client from 'https://g4f.dev/dist/js/client.js';
</script>
```
Or install the NPM package:
```bash
npm install @gpt4free/g4f.dev
```

## Initialization
```javascript
// For Pollinations.AI (default)
const client = new Client();

// For GPT4Free / OpenAI endpoint
const client = new Client({ baseUrl: "http://localhost:8080/v1" });

// With API key
const client = new Client({ apiKey: "your-api-key" });
```

## Core Methods

### Chat Completions
```javascript
// Regular completion
const completion = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [
        { role: 'system', content: 'Talk like a pirate' },
        { role: 'user', content: 'Hello there!' }
    ]
});

// Streaming completion
const stream = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [...],
    stream: true
});

for await (const chunk of stream) {
    console.log(chunk.choices[0]?.delta?.content);
}
```

### Model Management
```javascript
// List available models
const models = await client.models.list();
models.forEach(model => {
    console.log(`ID: ${model.id}`);
});
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `baseUrl` | string | API endpoint base URL | `https://text.pollinations.ai` |
| `apiKey` | string | Authorization token | `undefined` |
| `headers` | object | Additional headers | `{}` |
| `modelAliases` | object | Custom model name mappings | [See default aliases] |

## Default Model Aliases
The client automatically maps these common names to backend-specific model identifiers:

| Alias | Maps To |
|-------|---------|
| `deepseek-v3` | `deepseek` |
| `gpt-4.1` | `openai-large` |
| `gpt-4.1-mini` | `openai` |
| ... | ... |

## Error Handling
The client throws errors for:
- Failed API requests (non-2xx responses)
- Streaming errors in unsupported environments
- Model listing failures

## Examples

### Basic Completion
```javascript
const result = await client.chat.completions.create({
    model: 'gpt-4.1',
    messages: [{ role: 'user', content: 'Explain quantum computing' }]
});
```

### Audio Model Usage
```javascript
const audioResponse = await client.chat.completions.create({
    model: 'gpt-4o-audio',
    messages: [...],
    audio: {
        voice: 'alloy',
        format: 'mp3'
    },
    modalities: ['text', 'audio']
});
```

### Image Generation

You can generate images using the `client.images.generate` method. Choose from supported models like `"flux"`, `"gpt-image"`, or `"sdxl-turbo"` and control image size if needed.

```js
const result = await client.images.generate({
    model: 'flux',  // Or "gpt-image", "sdxl-turbo"
    prompt: 'Generate a logo for the URL https://g4f.dev',
    size: '512x512' // Optional, default is 1024x1024
});
const image = new Image();
image.src = result.data[0].url;
document.body.appendChild(image);
```

**Parameters:**

| Option | Type | Description | Default |
| --- | --- | --- | --- |
| `model` | string | Image generation model: `"flux"`, `"gpt-image"`, `"sdxl-turbo"` | — |
| `prompt` | string | Text prompt describing the desired image | — |
| `size` | string | Image resolution, e.g. `"512x512"` or `"1024x1024"` | `"1024x1024"` |

The `result.data` array contains URLs to generated images. You can add these images directly to the page, as shown above.

---

## Notes
- When using Pollinations.AI (`baseUrl` not specified), additional model aliases are automatically applied
- The client normalizes message formats before sending requests
- Streaming requires a modern browser with ReadableStream support