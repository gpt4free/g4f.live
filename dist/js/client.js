class Client {
    constructor(options = {}) {
        this.defaultModel = options.defaultModel || null;
        if (options.baseUrl) {
            this.baseUrl = options.baseUrl;
            this.apiEndpoint = `${this.baseUrl}/chat/completions`
            this.imageEndpoint = `${this.baseUrl}/images/generations`
        } else {
            this.baseUrl = 'https://text.pollinations.ai';
            this.apiEndpoint = `${this.baseUrl}/openai`;
            this.imageEndpoint = `https://image.pollinations.ai/prompt/{prompt}`;
        }
        this.apiKey = options.apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {}),
            ...(options.headers || {})
        };
        this.modelAliases = options.modelAliases || (!options.baseUrl ? {
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
          "gpt-image": "gptimage",
          "sdxl-turbo": "turbo",
        } : {});
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
                } else if (!params.model && this.defaultModel) {
                  params.model = this.defaultModel;
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

    get images() {
        return {
            generate: async (params) => {
                if (params.model && this.modelAliases[params.model]) {
                    params.model = this.modelAliases[params.model];
                }
                if (this.imageEndpoint.includes('{prompt}')) {
                    return this._defaultImageGeneration(params, { headers: this.headers });
                }
                return this._regularImageGeneration(params, { headers: this.headers });
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

    async _defaultImageGeneration(params, requestOptions) {
        params = {...params};
        let prompt = params.prompt ? params.prompt : '';
        prompt = encodeURIComponent(prompt.replaceAll(" ", "+"));
        delete params.prompt;
        if (params.nologo === undefined) {
            params.nologo = true;
        }
        if (params.size) {
            [params.width, params.height] = params.size.split('x');
            delete params.size;
        }
        const encodedParams = new URLSearchParams(params);
        let url = this.imageEndpoint.replace('{prompt}', prompt);
        url += '?' + encodedParams.toString();
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`Image generation request failed with status ${response.status}`);
        }

        return {data: [{url: response.url}]}
    }

    async _regularImageGeneration(params, requestOptions) {
        const response = await fetch(this.imageEndpoint, {
              method: 'POST',
              body: JSON.stringify(params),
              ...requestOptions
          });

        if (!response.ok) {
            throw new Error(`Image generation request failed with status ${response.status}`);
        }

        return await response.json();
    }
}

class Together extends Client {
    constructor(options = {}) {
        super({
            baseUrl: 'https://api.together.xyz/v1',
            defaultModel: 'blackbox/meta-llama-3-1-8b',
            modelAliases: {
                "flux": "black-forest-labs/FLUX.1-schnell-Free",
                ...options.modelAliases
            },
            ...options
        });
    }

    async _regularImageGeneration(params, requestOptions) {
        if (params.size) {
            [params.width, params.height] = params.size.split('x');
            delete params.size;
        }
        return super._regularImageGeneration(params, requestOptions);
    }
}

class Puter {
    constructor(options = {}) {
        this.defaultModel = options.defaultModel || null;
        this.puter = options.puter || this._injectPuter();
    }

    get chat() {
        return {
            completions: {
                create: async (params) => {
                    const { messages, ...options } = params;
                    if (!options.model && this.defaultModel) {
                        options.model = this.defaultModel;
                    }
                    if (options.stream) {
                        return this._streamCompletion(messages, options);
                    }
                    const response = await (await this.puter).ai.chat(messages, false, options);
                    if (response.choices == undefined && response.message !== undefined) {
                        return {
                            ...response,
                            get choices() {
                                return [{message: response.message}];
                            }
                        };
                    } else {
                        return response;
                    }
                }
            }
        };
    }

    get models() {
      return {
        list: async () => {
            const response = await fetch("https://api.puter.com/puterai/chat/models/");
            let models = await response.json();
            models = models.models;
            const blockList = ["abuse", "costly", "fake", "model-fallback-test-1"];
            models = models.filter((model) => !model.includes("/") && !blockList.includes(model));
            return models.map(model => {
                return {
                    id: model,
                    type: "chat"
                };
            });
        }
      };
    }

    async _injectPuter() {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                reject(new Error('Puter can only be used in a browser environment'));
                return;
            }
            if (window.puter) {
                resolve(puter);
                return;
            }
            var tag = document.createElement('script');
            tag.src = "https://js.puter.com/v2/";
            tag.onload = () => {
                resolve(puter);
            }
            tag.onerror = reject;
            var firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        });
    }

    async *_streamCompletion(messages, options = {}) {
        for await (const item of await ((await this.puter).ai.chat(messages, false, options))) {
          if (item.choices == undefined && item.text !== undefined) {
            yield {
                ...item,
                get choices() {
                    return [{delta: {content: item.text}}];
                }
            };
          } else {
            yield item
          }
        }
    }
}

export { Client, Together, Puter };
export default Client;