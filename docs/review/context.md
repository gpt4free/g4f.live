# Chat Conversation Context Guide

This guide explains how different G4F providers handle conversation context, message formatting, and conversation management.

## Message Format

### Standard Message Structure
```python
messages = [
    {
        "role": "system",    # or "user", "assistant"
        "content": "message content"
    }
]
```

## Provider-Specific Conversation Handling

### 1. Models Using Message History (Most Common)
```python
from g4f.client import AsyncClient

class Conversation:
    def __init__(self):
        self.client = AsyncClient()
        self.history = [
            {"role": "system", "content": "You are a helpful assistant."}
        ]
    
    async def chat(self, message):
        self.history.append({"role": "user", "content": message})
        
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=self.history
        )
        
        assistant_response = response.choices[0].message.content
        self.history.append({"role": "assistant", "content": assistant_response})
        return assistant_response
```

### 2. Models Using Conversation Objects (Like OpenaiAccount)
```python
from g4f.client import AsyncClient
from g4f.Provider import OpenaiAccount

class ConversationManager:
    def __init__(self):
        self.client = AsyncClient(provider=OpenaiAccount)
        self.conversation = None
    
    async def chat(self, message):
        if self.conversation:
            response = await self.client.chat.completions.create(
                messages=message,
                conversation=self.conversation
            )
        else:
            response = await self.client.chat.completions.create(
                messages=message
            )
            self.conversation = response.conversation
        
        return response.choices[0].message.content
```

## Complete Conversation Class with JSON Support

```python
import json
import asyncio
from g4f.client import AsyncClient
from typing import List, Dict, Optional

class JsonConversation:
    def __init__(self, system_message: str = "You are a helpful assistant."):
        self.history: List[Dict] = [
            {"role": "system", "content": system_message}
        ]
        self.conversation_id: Optional[str] = None
        self.provider_type: str = "message_history"  # or "conversation_object"
    
    def add_message(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
    
    def to_dict(self) -> Dict:
        """Export conversation to dictionary"""
        return {
            "history": self.history,
            "conversation_id": self.conversation_id,
            "provider_type": self.provider_type
        }
    
    def to_json(self) -> str:
        """Export conversation to JSON string"""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'JsonConversation':
        """Import conversation from dictionary"""
        conv = cls()
        conv.history = data.get("history", [])
        conv.conversation_id = data.get("conversation_id")
        conv.provider_type = data.get("provider_type", "message_history")
        return conv
    
    @classmethod
    def from_json(cls, json_str: str) -> 'JsonConversation':
        """Import conversation from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)

class UniversalChat:
    def __init__(self, provider=None, model: str = "gpt-4o-mini"):
        self.client = AsyncClient(provider=provider)
        self.model = model
        self.conversation = JsonConversation()
    
    async def send_message(self, user_message: str) -> str:
        """Universal method that works with all provider types"""
        
        # Add user message to history
        self.conversation.add_message("user", user_message)
        
        try:
            # Try conversation-based approach first
            if hasattr(self.conversation, 'conversation_id') and self.conversation.conversation_id:
                response = await self.client.chat.completions.create(
                    messages=user_message,
                    conversation=self.conversation.conversation_id
                )
            else:
                # Fall back to message history approach
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=self.conversation.history
                )
                
                # Check if response has conversation object
                if hasattr(response, 'conversation') and response.conversation:
                    self.conversation.conversation_id = response.conversation
                    self.conversation.provider_type = "conversation_object"
        
        except Exception as e:
            # If conversation approach fails, try message history
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation.history
            )
            self.conversation.provider_type = "message_history"
        
        # Get assistant response
        assistant_response = response.choices[0].message.content
        
        # Add to history
        self.conversation.add_message("assistant", assistant_response)
        
        return assistant_response
    
    def export_conversation(self) -> str:
        """Export full conversation to JSON"""
        return self.conversation.to_json()
    
    def import_conversation(self, json_str: str):
        """Import conversation from JSON"""
        self.conversation = JsonConversation.from_json(json_str)
```

## Usage Examples

### Example 1: Basic Usage
```python
async def main():
    chat = UniversalChat()
    
    # Chat normally
    response1 = await chat.send_message("Hello!")
    print("AI:", response1)
    
    response2 = await chat.send_message("How are you?")
    print("AI:", response2)
    
    # Export conversation
    exported = chat.export_conversation()
    print("Exported:", exported)
    
    # Save to file
    with open("conversation.json", "w") as f:
        f.write(exported)

asyncio.run(main())
```

### Example 2: Import and Continue
```python
async def continue_chat():
    # Load previous conversation
    with open("conversation.json", "r") as f:
        saved_data = f.read()
    
    # Create new chat and import
    chat = UniversalChat()
    chat.import_conversation(saved_data)
    
    # Continue chatting with full context
    response = await chat.send_message("What was our previous conversation about?")
    print("AI:", response)

asyncio.run(continue_chat())
```

### Example 3: Provider-Specific Handling
```python
from g4f.Provider import OpenaiAccount, Bing

async def provider_examples():
    # OpenAI Account (uses conversation objects)
    openai_chat = UniversalChat(provider=OpenaiAccount)
    response = await openai_chat.send_message("I was born in 1990.")
    print("OpenAI:", response)
    
    # Check conversation type
    print("Provider type:", openai_chat.conversation.provider_type)
    
    # Bing (uses message history)
    bing_chat = UniversalChat(provider=Bing, model="gpt-4")
    response = await bing_chat.send_message("Hello!")
    print("Bing:", response)
    print("Provider type:", bing_chat.conversation.provider_type)

asyncio.run(provider_examples())
```

## Key Points

1. **Message History Providers**: Most providers use the `messages` parameter with full conversation history
2. **Conversation Object Providers**: Some providers (like OpenaiAccount) use conversation IDs and only need the latest message
3. **Automatic Detection**: The UniversalChat class automatically detects and adapts to the provider's requirements
4. **JSON Export/Import**: Full conversation state can be saved and restored
5. **Error Handling**: Falls back to message history if conversation objects fail

This approach ensures compatibility across different G4F providers while maintaining conversation context persistence.