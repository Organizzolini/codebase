import pytest
from langchain_core.messages import HumanMessage, SystemMessage

from src.prompts import (
    affirmations_analyze_document_prompt_template as analyze_document_prompt_template,
)
from src.prompts import (
    affirmations_analyze_sources_prompt_template as analyze_sources_prompt_template,
)
from src.prompts import (
    affirmations_generate_affirmations_prompt_template as generate_affirmations_prompt_template,
)
from src.prompts import (
    affirmations_generate_document_from_sources_prompt_template as generate_document_from_sources_prompt_template,
)
from src.prompts import (
    affirmations_generate_document_prompt_template as generate_document_prompt_template,
)
from src.prompts import (
    affirmations_validate_affirmation_prompt_template as validate_affirmation_prompt_template,
)
from src.prompts import (
    search_sources_prompt_template,
)


@pytest.mark.unit
def test_analyze_card_prompt_format() -> None:
    messages = analyze_document_prompt_template.format_messages(
        subject_name="The Fool",
        category_name="Tarot Card",
        document="The Fool represents new beginnings...",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert "The Fool" in str(messages[1].content)
    assert "new beginnings" in str(messages[1].content)


@pytest.mark.unit
def test_generate_affirmations_prompt_format() -> None:
    messages = generate_affirmations_prompt_template.format_messages(
        subject_name="The Fool",
        document_analysis="Core themes: freedom, adventure, new beginnings.",
        grammar_name="⭐ Indicative Active Present Simple First Singular",
        grammar_specifiers="Indicative, Active, Present, Simple, First, Singular",
        grammar_description="Use simple present tense, first person singular, active voice.",
        grammar_examples="I am free; I trust myself; I embrace the journey",
        grammar_emoji="⭐",
        grammar_specifier_descriptions="- State a direct fact or present truth (indicative mood).",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    content = str(messages[1].content)
    assert "The Fool" in content
    assert "freedom" in content
    assert "Indicative" in content


@pytest.mark.unit
def test_validate_affirmation_prompt_format() -> None:
    messages = validate_affirmation_prompt_template.format_messages(
        affirmation_text="I trust the universe.",
        grammar_name="⭐ Indicative Active Present Simple First Singular",
        grammar_specifiers="Indicative, Active, Present, Simple, First, Singular",
        grammar_description="Use simple present tense, first person singular, active voice.",
        grammar_examples="I am free; I trust myself; I embrace the journey",
        grammar_specifier_descriptions="- State a direct fact or present truth (indicative mood).",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    content = str(messages[1].content)
    assert "I trust the universe." in content
    assert "Indicative" in content


@pytest.mark.unit
def test_search_query_prompt_format() -> None:
    result = search_sources_prompt_template.format(
        subject_name="The Fool",
        category_name="Tarot Card",
    )
    assert "The Fool" in result
    assert "Tarot Card" in result


@pytest.mark.unit
def test_analyze_sources_prompt_format() -> None:
    messages = analyze_sources_prompt_template.format_messages(
        subject_name="The Fool",
        category_name="Tarot Card",
        sources="Some web content about The Fool...",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert "The Fool" in str(messages[1].content)
    assert "Some web content" in str(messages[1].content)


@pytest.mark.unit
def test_generate_document_from_sources_prompt_format() -> None:
    messages = generate_document_from_sources_prompt_template.format_messages(
        subject_name="The Fool",
        category_name="Tarot Card",
        category_name_plural="Tarot Cards",
        sources="Web content about The Fool...",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    content = str(messages[1].content)
    assert "The Fool" in content
    assert "Tarot Cards" in content
    assert "Web content" in content


@pytest.mark.unit
def test_generate_document_prompt_format() -> None:
    messages = generate_document_prompt_template.format_messages(
        subject_name="The Fool",
        category_name="Tarot Card",
        category_name_plural="Tarot Cards",
        source_analysis="Key themes: freedom and new beginnings.",
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert isinstance(messages[1], HumanMessage)
    assert "The Fool" in str(messages[1].content)
    assert "Tarot Cards" in str(messages[1].content)
