"""FAQ-only chatbot responses from the knowledge base (no LLM required)."""

import re

from .models import KnowledgeBase


def _tokenize(text):
    stop = {
        'the', 'and', 'for', 'with', 'about', 'this', 'that', 'what', 'when', 'where', 'which',
        'who', 'why', 'how', 'can', 'could', 'would', 'should', 'will', 'your', 'you', 'are',
        'from', 'into', 'have', 'has', 'was', 'were', 'been', 'there', 'their', 'here', 'our',
        'but', 'not', 'dont', 'doesnt', 'isnt', 'im', 'i', 'me', 'my', 'do', 'to', 'a', 'an',
    }
    tokens = re.findall(r"[a-z0-9]+", (text or '').lower())
    return [t for t in tokens if len(t) > 2 and t not in stop]


def _parse_qa_pairs(text_content):
    pairs = []
    if not text_content:
        return pairs

    blocks = re.split(r'\n\s*\n', text_content.strip())
    for block in blocks:
        q_match = re.search(r"Question:\s*(.+)", block, flags=re.IGNORECASE)
        if not q_match:
            continue
        question = q_match.group(1).strip()
        a_match = re.search(
            r"Answer:\s*(.*?)($|\n\nQuestion:|\nSteps:)",
            block,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if a_match:
            answer = a_match.group(1).strip()
        else:
            answer = block[q_match.end():].strip()
        if question and answer:
            pairs.append((question, answer))
    return pairs


def _score_question_match(user_message, question):
    user_tokens = _tokenize(user_message)
    if not user_tokens:
        return 0

    question_lower = question.lower()
    message_lower = user_message.lower().strip()

    if message_lower == question.lower().strip():
        return 1000

    if message_lower in question_lower or question_lower in message_lower:
        return 500

    score = sum(1 for token in user_tokens if token in question_lower)
    return score


def find_best_qa_match(user_message):
    """Return (answer, title, url, score) for the best knowledge-base Q&A match."""
    best = None
    best_score = 0

    for item in KnowledgeBase.objects.all().order_by('-created_at'):
        for question, answer in _parse_qa_pairs(item.text_content or ''):
            score = _score_question_match(user_message, question)
            if score > best_score:
                best_score = score
                best = (answer.strip(), item.title or 'Knowledge Base', item.website_url or '')

    if best and best_score >= 2:
        return (*best, best_score)
    return None


def format_faq_response(answer, title, url=None):
    source_line = f"{title} ({url})" if url else title
    return f"{answer.strip()}\n\nSource: {source_line}"


def answer_from_knowledge_base(user_message, context='', sources=None):
    """
    Produce an FAQ answer without calling Ollama.
    Returns (response_text, sources_list).
    """
    sources = sources or []

    match = find_best_qa_match(user_message)
    if match:
        answer, title, url, _score = match
        if url and url not in sources:
            sources = [url, *sources]
        return format_faq_response(answer, title, url), sources

    if context:
        snippet = context.split('\n\n---\n\n')[0].strip()
        snippet = re.sub(r'^Title:\s*.+\n', '', snippet, count=1).strip()
        if snippet:
            title = 'Knowledge Base'
            if sources:
                return format_faq_response(snippet[:800], title, sources[0]), sources
            return format_faq_response(snippet[:800], title), sources

    return "I don't know based on the website information available.", sources
