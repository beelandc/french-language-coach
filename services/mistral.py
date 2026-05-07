import json
from typing import Any

from mistralai.client import Mistral as _MistralClient

from config import settings


class MistralClient:
    def __init__(self):
        self.client = _MistralClient(api_key=settings.MISTRAL_API_KEY)
        self.model = "mistral-large-latest"

    def get_chat_response(self, messages: list[dict[str, str]], system_prompt: str) -> str:
        """Get a chat completion from Mistral with the given messages and system prompt."""
        chat_messages = [{"role": "system", "content": system_prompt}] + messages

        response = self.client.chat.complete(
            model=self.model,
            messages=chat_messages,
        )
        return response.choices[0].message.content

    def get_feedback(self, messages: list[dict[str, str]]) -> dict[str, Any]:
        """Generate structured feedback from a conversation."""
        feedback_prompt = """Analyse cette conversation en français entre un apprenant et un natif.
        Évalue uniquement en français. Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
        {
            "grammar_score": <int 0-100>,
            "vocabulary_score": <int 0-100>,
            "fluency_score": <int 0-100>,
            "overall_score": <int 0-100>,
            "strengths": ["<str>", ...],
            "focus_area": "<str>",
            "example_corrections": [
                {"original": "<str>", "corrected": "<str>", "explanation": "<str>"},
                ...
            ]
        }
        Ne retourne RIEN d'autre que le JSON. Sois strict sur la grammaire, le vocabulaire et la fluidité.
        focus_area doit être la SEULE chose la plus impactante à améliorer."""

        system_msg = {"role": "system", "content": feedback_prompt}
        user_content = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        user_msg = {"role": "user", "content": user_content}

        response = self.client.chat.complete(
            model=self.model,
            messages=[system_msg, user_msg],
            response_format={"type": "json_object"},
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except (json.JSONDecodeError, AttributeError):
            return {
                "grammar_score": 50,
                "vocabulary_score": 50,
                "fluency_score": 50,
                "overall_score": 50,
                "strengths": ["Bonne tentative"],
                "focus_area": "Pratiquer davantage",
                "example_corrections": []
            }


mistral_client = MistralClient()
