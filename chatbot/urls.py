from django.urls import path
from orders.views import ChatbotView, ChatbotPublicView, KnowledgeBaseView

urlpatterns = [
    path('chat/', ChatbotView.as_view()),
    path('chat/public/', ChatbotPublicView.as_view()),
    path('knowledge/', KnowledgeBaseView.as_view()),
]
