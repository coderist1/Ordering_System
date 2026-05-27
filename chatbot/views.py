import requests
from django.conf import settings
from pypdf import PdfReader
from bs4 import BeautifulSoup

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView

from .models import KnowledgeBase, ChatMessage
from .serializers import KnowledgeBaseSerializer, ChatMessageSerializer


class ChatbotView(APIView):

    def post(self, request, *args, **kwargs):

        user_message = request.data.get("message")

        # save user message
        user_chat = ChatMessage.objects.create(
            role='user',
            message=user_message
        )

        # get knowledge
        knowledge = KnowledgeBase.objects.all()

        context = ""

        for item in knowledge:
            if item.text_content:
                context += item.text_content + "\n"
            elif item.pdf_file:
                # Extract text from PDF
                reader = PdfReader(item.pdf_file.path)
                for page in reader.pages:
                    context += page.extract_text() + "\n"
            elif item.website_url:
                # Scrape text from website
                response = requests.get(item.website_url)
                soup = BeautifulSoup(response.content, 'html.parser')
                context += soup.get_text() + "\n"

        prompt = f"""
You are a helpful assistant.

Knowledge:
{context}

User:
{user_message}
"""

        try:
            ollama_url = getattr(settings, 'OLLAMA_URL', 'http://localhost:11434')
            ollama_model = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:0.5b')
            response = requests.post(
                f"{ollama_url.rstrip('/')}/api/generate",
                json={
                    "model": ollama_model,
                    "prompt": prompt,
                    "stream": False
                },
                timeout=60
            )
            response.raise_for_status()
            data = response.json()
            ai_response = data.get("response", "Error: No response from AI model.")
        except requests.exceptions.RequestException as e:
            ai_response = f"Error communicating with AI model: {str(e)}"
        except KeyError:
            ai_response = "Error: Unexpected response format from AI model."

        # save AI response
        ai_chat = ChatMessage.objects.create(
            role='assistant',
            message=ai_response
        )

        return Response({
            "user": ChatMessageSerializer(user_chat).data,
            "assistant": ChatMessageSerializer(ai_chat).data
        })


class KnowledgeBaseView(ListCreateAPIView):
    queryset = KnowledgeBase.objects.all()
    serializer_class = KnowledgeBaseSerializer