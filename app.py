from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from strands import Agent, tool
from strands.models.ollama import OllamaModel

# === Flask Setup ===
app = Flask(__name__)
CORS(app)

# === Ollama Check ===
try:
    response = requests.get("http://localhost:11434/api/tags")
    print("✅ Ollama is running. Available models:")
    for model in response.json().get("models", []):
        print(f"- {model['name']}")
except requests.exceptions.ConnectionError:
    print("❌ Ollama not running. Start it with `ollama serve`")
    exit()

# === Custom Tool: Fake Weather Reporter ===
@tool
def get_weather(city: str) -> str:
    """Returns a fake weather report for a given city based on its knowledge of that city."""
    weather_map = {
        "new york": "🌤️ 25°C, partly cloudy",
        "san francisco": "🌁 18°C, foggy",
        "london": "🌧️ 16°C, rainy",
        "mumbai": "☀️ 32°C, sunny",
    }
    city_lower = city.lower()
    weather = weather_map.get(city_lower, "🌦️ 22°C, mild weather (default)")
    return f"The current weather in {city.title()} is {weather}."

@tool
def get_average(numbers: list) -> str:
    """Returns the average of a list of numbers."""
    if not numbers:
        return "⚠️ No numbers provided."
    average = sum(numbers) / len(numbers)
    return f"The average is {average:.2f}."

# === Ollama Model Setup ===
ollama_model = OllamaModel(
    model_id="llama3.2:1b",
    host="http://localhost:11434",
    params={"max_tokens": 4096, "temperature": 0.7, "top_p": 0.9, "stream": False}
)

# === Agent with 1 Tool ===
agent = Agent(
    system_prompt="You are a friendly assistant that answers questions based on the provided tools.",
    model=ollama_model,
    tools=[get_weather, get_average]
)

# USAGE: get weather of London

# === POST /ask Endpoint ===
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    query = data.get("query", "")
    if not query:
        return jsonify({"response": "⚠️ No query provided"}), 400

    try:
        result = agent(query)
        # If result is a Trace object, convert to plain text
        if hasattr(result, "final") and isinstance(result.final, str):
            return jsonify({"response": result.final})
        return jsonify({"response": str(result)})
    except Exception as e:
        return jsonify({"response": f"❌ Error: {str(e)}"}), 500


# === Run Server ===
if __name__ == "__main__":
    app.run(port=5001, debug=True)
