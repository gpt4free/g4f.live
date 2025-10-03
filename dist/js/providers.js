import { Client, Custom, PollinationsAI, DeepInfra, Puter, HuggingFace, Worker, Audio } from "/dist/js/client.js";
window.providers = {
    "api-airforce": {class: Client, baseUrl: "https://api.airforce/v1", tags: "🎨 👓"},
    "anon-drop": {class: Client, baseUrl: "https://anondrop.net/v1", tags: ""},
    "audio": {class: Audio, baseUrl: "https://g4f.dev/api/audio", tags: "🎧"},
    "azure": {class: Client, baseUrl: "https://g4f.dev/api/azure", tags: "👓"},
    "custom": {class: Custom, tags: ""},
    "deep-infra": {class: DeepInfra, tags: "🎨 👓"},
    "gemini": {class: Client, baseUrl: "https://g4f.dev/api/gemini", tags: "👓"},
    "gpt-oss-120b": {class: Client, baseUrl: "https://g4f.dev/api/gpt-oss-120b", tags: ""},
    "grok": {class: Client, baseUrl: "https://g4f.dev/api/grok", tags: ""},
    "hugging-face": {class: HuggingFace, tags: ""},
    "ollama": {class: Client, baseUrl: "https://g4f.dev/api/ollama", tags: ""},
    "openrouter": {class: Client, baseUrl: "https://g4f.dev/api/openrouter", tags: "👓"},
    "pollinations-ai": {class: PollinationsAI, baseUrl: "https://g4f.dev/api/pollinations.ai", tags: "🎨 👓"},
    "puter": {class: Puter, tags: "👓"},
    "worker": {class: Worker, baseUrl: "https://g4f.dev/api/worker", tags: "🎨"}
};