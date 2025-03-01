from google import genai
from google.genai.types import GenerateContentConfig, GoogleSearch, HttpOptions, Tool

import os
from google.cloud import aiplatform

class Google:
    def __init__(self):
        # Initialize the Vertex AI SDK
        aiplatform.init()
        self.model_name = self.model_get() # Store model name, not metadata
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/vol1/Starmony-v1/llm/cred.json'
        self.client = genai.Client(http_options=HttpOptions(api_version="v1")) # Initialize genai client

    def model_get(self, model='others'):
        metadata = {'others': "gemini-2.0-pro-exp-02-05"}
        return metadata.get(model, metadata.get('others')) # Return model name string

    def generate(self, template,
                 top_p=None,
                 top_k=20,
                 temperature=0.6,
                 system_instructions=None, # system_instructions is not directly used in genai example
                 max_output_tokens=None) -> str:


        # --- Model Invocation using genai ---
        response = self.client.models.generate_content(
            model=self.model_name, # Use stored model name
            contents=template,
            config=GenerateContentConfig(
                tools=[
                    Tool(google_search=GoogleSearch()) # Enable Google Search Tool
                ],
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                max_output_tokens=max_output_tokens,
            ),
        )

        return response.text.strip()