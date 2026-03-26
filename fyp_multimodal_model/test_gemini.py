import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
print(f"Loaded API Key: {api_key[:5]}...{api_key[-5:]}" if api_key else "NO KEY FOUND")

try:
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Say hello World!',
    )
    print(f"SUCCESS! Response: {response.text}")
except Exception as e:
    print(f"ERROR: {str(e)}")
