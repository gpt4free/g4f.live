class Client {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'https://text.pollinations.ai';
        if (this.baseUrl != "https://text.pollinations.ai") {
            this.apiEndpoint = `${this.baseUrl}/chat/completions`
        } else {
            this.apiEndpoint = `${this.baseUrl}/openai`;
        }
        this.apiKey = options.apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
            ...(options.headers || {})
        };
        this.modelAliases = options.modelAliases || !options.baseUrl ? {
          "deepseek-v3": "deepseek",
          "deepseek-r1": "deepseek-reasoning",
          "grok-3-mini-high": "grok",
          "llama-4-scout": "llamascout",
          "mistral-small-3.1": "mistral",
          "gpt-4.1-mini": "openai",
          "gpt-4o-audio": "openai-audio",
          "gpt-4.1-nano": "openai-fast",
          "gpt-4.1": "openai-large",
          "o3": "openai-reasoning",
          "gpt-4o-mini": "openai-roblox",
          "phi-4": "phi",
          "qwen2.5-coder": "qwen-coder",
          "gpt-4o-mini-search": "searchgpt",
        } : {};
        this.swapAliases = {}
        Object.keys(this.modelAliases).forEach(key => {
          this.swapAliases[this.modelAliases[key]] = key;
        });
    }

    get chat() {
        return {
            completions: {
            create: async (params) => {
                if (params.model && this.modelAliases[params.model]) {
                  params.model = this.modelAliases[params.model];
                }
                const requestOptions = {
                    method: 'POST',
                    headers: this.headers,
                    body: JSON.stringify(params)
                };

                if (params.stream) {
                    return this._streamCompletion(requestOptions);
                } else {
                    return this._regularCompletion(requestOptions);
                }
            }
            }
        };
    }

    get models() {
      return {
        list: async () => {
          const response = await fetch(`${this.baseUrl}/models`, {
            method: 'GET',
            headers: this.headers
          });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch models: ${response.status}`);
          }

          let data = await response.json();
          data = data.data || data;
          data.forEach((model, index) => {
            if (!model.id) {
              model.id = this.swapAliases[model.name] || model.name;
              data[index] = model;
            }
          });
          return data;
        }
      };
    }

    async _regularCompletion(requestOptions) {
        const response = await fetch(this.apiEndpoint, requestOptions);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        return await response.json();
    }

  async *_streamCompletion(requestOptions) {
    const response = await fetch(this.apiEndpoint, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Streaming not supported in this environment');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.trim()) continue;
          if (part === 'data: [DONE]') continue;

          try {
            if (part.startsWith('data: ')) {
              const data = JSON.parse(part.slice(6));
              yield data;
            }
          } catch (err) {
            console.error('Error parsing chunk:', part, err);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  _normalizeMessages(messages) {
    return messages.map(message => ({
      role: message.role,
      content: message.content
    }));
  }
}

export default Client;