# GPT4Free.js React Integration Guide

## Overview

This guide explains how to integrate the GPT4Free.js client into your React applications for AI-powered features like chat completions, image generation, and multi-provider support.

---

## Installation

### NPM/Yarn

```bash
# Using npm
npm install @gpt4free/g4f.dev

# Using yarn
yarn add @gpt4free/g4f.dev
```

### CDN (Alternative)

```html
<script type="module">
  import { Client, PollinationsAI, DeepInfra } from 'https://g4f.dev/dist/js/client.js';
</script>
```

---

## Basic Setup

### 1. Create a Client Hook

```jsx
// hooks/useAIClient.js
import { useState, useCallback } from 'react';
import { PollinationsAI, DeepInfra, Together } from '@gpt4free/g4f.dev';

export const useAIClient = () => {
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeClient = useCallback((provider, apiKey = null) => {
    try {
      setError(null);
      
      switch (provider) {
        case 'pollinations':
          setClient(new PollinationsAI({ apiKey }));
          break;
        case 'deepinfra':
          setClient(new DeepInfra({ apiKey }));
          break;
        case 'together':
          setClient(new Together({ apiKey }));
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    client,
    isLoading,
    error,
    initializeClient,
    setIsLoading,
    setError
  };
};
```

### 2. Provider Configuration Component

```jsx
// components/AIProviderSetup.jsx
import { useState } from 'react';

const AIProviderSetup = ({ onProviderSelect }) => {
  const [provider, setProvider] = useState('pollinations');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onProviderSelect(provider, apiKey);
  };

  return (
    <div className="provider-setup">
      <h2>AI Provider Setup</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Provider:</label>
          <select 
            value={provider} 
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="pollinations">Pollinations AI</option>
            <option value="deepinfra">DeepInfra</option>
            <option value="together">Together AI</option>
            <option value="huggingface">HuggingFace</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>API Key (optional for some providers):</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
        </div>
        
        <button type="submit">Connect</button>
      </form>
    </div>
  );
};

export default AIProviderSetup;
```

---

## Chat Implementation

### 1. Chat Hook

```jsx
// hooks/useAIChat.js
import { useState, useCallback, useRef } from 'react';

export const useAIChat = (client) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (userMessage, model = 'gpt-4.1', options = {}) => {
    if (!client) {
      throw new Error('AI client not initialized');
    }

    setIsLoading(true);
    setStreamingContent('');
    abortControllerRef.current = new AbortController();

    try {
      const newMessages = [
        ...messages,
        { role: 'user', content: userMessage }
      ];

      setMessages(newMessages);

      const response = await client.chat.completions.create({
        model,
        messages: newMessages,
        stream: options.stream || false,
        signal: abortControllerRef.current.signal,
        ...options
      });

      if (options.stream) {
        // Handle streaming response
        let fullContent = '';
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          setStreamingContent(fullContent);
        }
        
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: fullContent }
        ]);
        setStreamingContent('');
      } else {
        // Handle regular response
        const assistantMessage = response.choices[0]?.message?.content;
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: assistantMessage }
        ]);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Chat error:', error);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, messages]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent('');
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopGeneration,
    clearChat
  };
};
```

### 2. Chat Component

```jsx
// components/AIChat.jsx
import { useState, useRef, useEffect } from 'react';
import { useAIChat } from '../hooks/useAIChat';

const AIChat = ({ client }) => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState('gpt-4.1');
  const [availableModels, setAvailableModels] = useState([]);
  const messagesEndRef = useRef(null);
  
  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    stopGeneration,
    clearChat
  } = useAIChat(client);

  // Load available models
  useEffect(() => {
    if (client) {
      client.models.list()
        .then(models => {
          const chatModels = models.filter(m => m.type === 'chat');
          setAvailableModels(chatModels);
        })
        .catch(console.error);
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input, model, { stream: true });
    setInput('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  if (!client) {
    return <div>Please set up an AI provider first.</div>;
  }

  return (
    <div className="ai-chat">
      <div className="chat-header">
        <select 
          value={model} 
          onChange={(e) => setModel(e.target.value)}
        >
          {availableModels.map(model => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
        <button onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <strong>{message.role === 'user' ? 'You' : 'Assistant'}:</strong>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        
        {streamingContent && (
          <div className="message assistant">
            <strong>Assistant:</strong>
            <div className="message-content streaming">
              {streamingContent}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
        >
          Send
        </button>
        {isLoading && (
          <button type="button" onClick={stopGeneration}>
            Stop
          </button>
        )}
      </form>
    </div>
  );
};

export default AIChat;
```

---

## Image Generation

```jsx
// components/ImageGenerator.jsx
import { useState } from 'react';

const ImageGenerator = ({ client }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [model, setModel] = useState('flux');

  const generateImage = async () => {
    if (!prompt.trim() || !client) return;

    setIsGenerating(true);
    try {
      const result = await client.images.generate({
        model,
        prompt: prompt.trim(),
        size: '512x512'
      });

      setGeneratedImages(prev => [
        { prompt, url: result.data[0].url, timestamp: new Date() },
        ...prev
      ]);
    } catch (error) {
      console.error('Image generation error:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="image-generator">
      <h3>AI Image Generation</h3>
      
      <div className="generator-controls">
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="flux">Flux</option>
          <option value="gpt-image">GPT Image</option>
          <option value="sdxl-turbo">SDXL Turbo</option>
        </select>
        
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          onKeyPress={(e) => e.key === 'Enter' && generateImage()}
        />
        
        <button 
          onClick={generateImage} 
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </button>
      </div>

      <div className="generated-images">
        {generatedImages.map((image, index) => (
          <div key={index} className="generated-image">
            <img src={image.url} alt={image.prompt} />
            <p>{image.prompt}</p>
            <small>{image.timestamp.toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGenerator;
```

---

## Complete App Integration

```jsx
// App.jsx
import { useState } from 'react';
import AIProviderSetup from './components/AIProviderSetup';
import AIChat from './components/AIChat';
import ImageGenerator from './components/ImageGenerator';
import { useAIClient } from './hooks/useAIClient';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const { client, initializeClient } = useAIClient();

  return (
    <div className="app">
      <header>
        <h1>GPT4Free.js React App</h1>
      </header>

      <main>
        {!client ? (
          <AIProviderSetup onProviderSelect={initializeClient} />
        ) : (
          <>
            <nav className="tabs">
              <button 
                className={activeTab === 'chat' ? 'active' : ''}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button 
                className={activeTab === 'images' ? 'active' : ''}
                onClick={() => setActiveTab('images')}
              >
                Image Generation
              </button>
            </nav>

            <div className="tab-content">
              {activeTab === 'chat' && <AIChat client={client} />}
              {activeTab === 'images' && <ImageGenerator client={client} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
```

---

## Error Handling and Loading States

```jsx
// components/ErrorBoundary.jsx
import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AI Client Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## Styling (CSS)

```css
/* styles.css */
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.provider-setup {
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
}

.tabs button.active {
  background: #007bff;
  color: white;
}

.ai-chat {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.chat-header {
  padding: 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  padding: 10px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
}

.message.user {
  background: #007bff;
  color: white;
  margin-left: 20%;
}

.message.assistant {
  background: #f8f9fa;
  margin-right: 20%;
}

.message-content.streaming {
  color: #666;
  font-style: italic;
}

.chat-input-form {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ddd;
}

.chat-input-form input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px;
}

.image-generator {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
}

.generator-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.generated-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.generated-image {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.generated-image img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
```

---

## Best Practices

1. **Error Boundaries**: Wrap AI components with error boundaries
2. **Loading States**: Always show loading indicators during API calls
3. **Abort Controllers**: Implement cancellation for long-running requests
4. **Local Storage**: Persist chat history and settings
5. **Rate Limiting**: Implement client-side rate limiting if needed
6. **Model Validation**: Validate models against provider capabilities

---

## Example Usage in Next.js

For Next.js applications, you might need to handle server-side rendering:

```jsx
// components/ClientSideAIChat.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAIClient } from '../hooks/useAIClient';
import AIChat from './AIChat';

export default function ClientSideAIChat() {
  const { client, initializeClient } = useAIClient();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return client ? <AIChat client={client} /> : <AIProviderSetup onProviderSelect={initializeClient} />;
}
```

This integration provides a robust foundation for building AI-powered React applications with GPT4Free.js!