## Documentation: API endpoints and usage

Overview
- This collection exposes multiple base URLs (providers) for chat-style completions. Each entry in the table lists a base URL (with /models removed) and whether an API key is required.
- Base URL extraction: remove /models from the URL in your table to get the API base_url you should use in requests.

| Base URLs | API key | Notes |
| --- | --- | --- |
| [https://localhost:1337/v1](https://localhost:1337/v1/models) | none required | use it locally |
| [https://g4f.dev/api/gpt-oss-120b](https://g4f.dev/api/gpt-oss-120b/models) | none required | use gpt-oss-120b for free |
| [https://g4f.dev/api/groq](https://g4f.dev/api/groq/models) | none required | Use Groq provder |
| [https://g4f.dev/api/ollama](https://g4f.dev/api/ollama/models) | none required | Use Ollama provider |
| [https://g4f.dev/api/pollinations.ai](https://g4f.dev/api/pollinations.ai/models) | none required | Proxy for pollinations.ai |
| [https://g4f.dev/api/nvidia](https://g4f.dev/api/nvidia/models) | none required | Use Nvidia provider |
| [https://g4f.dev/api/Azure](https://g4f.dev/api/Azure/models) | provided by [g4f.dev/api_key](https://g4f.dev/api_key.html) | Use Azure on my bill
| [https://host.g4f.dev/v1](https://host.g4f.dev/v1/models) | provided by [g4f.dev/api_key](https://g4f.dev/api_key.html) | Hosted instance, many models

How to choose a base URL
- If you want a local or self-hosted instance, you can use:
  - https://localhost:1337/v1
- If you want a free or public provider, you can use one of the g4f.dev endpoints (e.g., gpt-oss-120b, groq, ollama, pollinations.ai, nvidia).
- If you want an Azure-backed usage, use:
  - https://g4f.dev/api/Azure (you’ll need an API key from https://g4f.dev/api_key.html)

API usage basics
- Endpoints: All chat-style interactions use the chat completions endpoint at {base_url}/chat/completions
- Authentication:
  - If the table entry says "none required", you do not need to pass an API key.
  - If an API key is required (Azure or hosted instances), supply api_key in your client configuration or request headers as dictated by your client library (see examples).
- Payload shape (typical):
  - model: string (e.g., gpt-oss-120b, gpt-4o, etc.)
  - temperature: number (optional)
  - messages: array of { role: "system" | "user" | "assistant", content: string }

Example payload
```json
{
  "model": "gpt-4o",
  "temperature": 0.9,
  "messages": [{"role": "user", "content": "Hello, how are you?"}]
}
```

Examples

1) Python requests (local example)
- Sends a chat completion to the local endpoint at /v1/chat/completions

```python
import requests

payload = {
    "model": "gpt-4o",
    "temperature": 0.9,
    "messages": [{"role": "user", "content": "Hello, how are you?"}]
}

response = requests.post("http://localhost:1337/v1/chat/completions", json=payload)

if response.status_code == 200:
    print(response.text)
else:
    print(f"Request failed with status code {response.status_code}")
    print("Response:", response.text)
```

2) Python with OpenAI client (custom base_url)
- Use the OpenAI Python client but point it at your chosen base URL

```python
from openai import OpenAI

client = OpenAI(
    api_key="secret",  #  A API key is required; set 'secrect' for "none required api_key" providers
    base_url="https://g4f.dev/api/gpt-oss-120b"  # replace with the chosen base_url
)

response = client.chat.completions.create(
    model="gpt-oss-120b",
    messages=[{"role": "user", "content": "Explain quantum computing"}],
)

print(response.choices[0].message.content)
```

3) JavaScript (HTML/JS client)
- Basic usage in a browser-like environment using GPT4Free.js

```html
<script type="module">
    import Client from 'https://g4f.dev/dist/js/client.js';

    // Initialize a client with a base URL and optional API key
    const client = new Client({ baseUrl: 'http://localhost:1337/v1', apiKey: 'secret' });

    const result = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Tell me a joke.' }
        ]
    });
</script>
```

Notes and quick tips
- If you use a hosted instance (host.g4f.dev or Azure-based), you’ll likely need an API key. Retrieve it from the referenced API key resource (g4f.dev/api_key.html) and configure your client accordingly.
- The examples assume a chat-style completions API where you pass messages and receive a response containing the assistant’s content.
- The base_url is always the URL without the trailing /models segment.
