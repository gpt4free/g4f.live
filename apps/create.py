import asyncio

from g4f.cookies import read_cookie_files
from g4f.client import AsyncClient
from g4f.Provider import Azure

import g4f.debug
g4f.debug.logging = True

read_cookie_files()

model = ""
apps = [
  #"To-Do List App",
  #"Calculator",
  #"Tip Calculator",
  #"Unit Converter (Length, Weight, Temperature)",
  #"Weather Forecast Display (using a public API)",
  #"Quote Generator",
  #"Random Password Generator",
  #"Countdown Timer",
  #"Simple BMI Calculator",
  #"Notepad / Notes App",
  #"Color Picker",
  #"Currency Converter",
  #"Image Slider / Carousel",
  #"Stopwatch",
  "Digital Clock",
  "Markdown Previewer",
  "Simple Poll / Voting App",
  "Hangman Game",
  "Sudoku Solver (basic)",
  "Flashcard Learning App"
]
client = AsyncClient(provider=Azure)

async def create_app(app_name: str):
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "user", "content": f"Create a advanced {app_name} app using HTML, CSS, and JavaScript in a singe .html file."}
        ]
    )
    filename = f"{app_name.replace(' ', '_').replace('/', '').replace('__', '_').lower()}.md"
    response.choices[0].message.save(filename, allowed_types=["html"])
    print(f"App '{app_name}' created successfully as {filename}")
    
async def main():
    for app in apps:
        print(f"Creating app: {app}")
        await create_app(app)
    print("All apps created successfully.")

asyncio.run(main())