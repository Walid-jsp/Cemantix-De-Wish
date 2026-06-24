import google.generativeai as genai
import time
import os

genai.configure(api_key="AIzaSyA-fake-key-fake-key")

start = time.time()
try:
    model = genai.GenerativeModel(model_name="gemini-3.5-flash")
    chat = model.start_chat(history=[])
    response = chat.send_message("Hello")
    print("Success")
except Exception as e:
    print(f"Failed in {time.time() - start:.2f}s with: {type(e).__name__} - {e}")
