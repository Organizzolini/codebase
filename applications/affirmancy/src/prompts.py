from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate,
)

search_sources_prompt_template: PromptTemplate = PromptTemplate.from_template(
    '"{subject_name}" {category_name} meaning interpretation significance symbolism themes'
)

affirmations_generate_document_from_sources_prompt_template: ChatPromptTemplate = (
    ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(
                """\
You are a reference document writer for spiritual subjects. Summarize web search results into a flowing prose reference document.
Output ONLY plain text in flowing paragraphs. Do NOT use any markdown formatting — no headings, no bullet points, no tables, no bold, no italic, no code fences.
Target length 1000 words maximum.
Use only the provided search results as the source of truth. Do not use prior knowledge."""
            ),
            HumanMessagePromptTemplate.from_template(
                """\
Web search results for "{subject_name}" ({category_name}):

{sources}

---

Write a reference document about the meaning of "{subject_name}" ({category_name_plural}) using the search results above.

Your response must be plain flowing prose with NO markdown formatting whatsoever — no headings, no bullet points, \
no numbered lists, no tables, no bold, no italic, no code fences. Write in connected paragraphs only.

The document should thoroughly cover these topics, weaving them together naturally rather than treating them as separate sections:

- The core meaning, interpretation, and significance of "{subject_name}" within {category_name_plural}. Ignore history and origins; focus deeply on what "{subject_name}" means, what it represents spiritually and symbolically, and how it relates to other subjects in the category.
- How the deeper meaning and themes of "{subject_name}" apply to life: love, relationships, work, finances, health, and fortune.
- Key symbols, imagery, and archetypes associated with "{subject_name}" and what they reveal about its meaning.

Interleave these topics freely wherever connections arise. Let the structure emerge from the content.\
"""
            ),
        ]
    )
)

semantic_generate_document_from_sources_prompt_template: ChatPromptTemplate = (
    ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(
                """\
You are a reference document writer for spiritual subjects. Summarize web search results into a flowing prose reference document.
Output ONLY plain text in flowing paragraphs. Do NOT use any markdown formatting — no headings, no bullet points, no tables, no bold, no italic, no code fences.
Target length 1000 words maximum.
This document will be used for semantic vector embedding, so use a controlled, consistent vocabulary of archetypal and psychological terms (e.g., active/receptive, expanding/contracting, light/shadow, structured/formless, conscious/unconscious, ascending/descending, individual/collective).
Every sentence should encode precise conceptual content. Avoid narrative filler.
Use only the provided search results as the source of truth. Do not use prior knowledge."""
            ),
            HumanMessagePromptTemplate.from_template(
                """\
Web search results for "{subject_name}" ({category_name}):

{sources}

---

Write a reference document about the meaning of "{subject_name}" ({category_name_plural}) using the search results above.

Your response must be plain flowing prose with NO markdown formatting whatsoever — no headings, no bullet points, \
no numbered lists, no tables, no bold, no italic, no code fences. Write in connected paragraphs only.

Address these semantic facets in order, using consistent archetypal vocabulary so this document is comparable with others in the same corpus:

First, state the core archetype or principle that "{subject_name}" most purely embodies. Then describe its energetic character \
using precise descriptors — active or receptive, expanding or contracting, concentrated or diffuse, light or shadow, structured or formless. \
Describe its psychological and emotional dimension: what inner state, emotion, or psychic process does it represent?

Next, explicitly describe how "{subject_name}" relates to, contrasts with, or builds upon other {category_name_plural}. \
Name specific subjects where meaningful — e.g., what it stands in polarity with, what it follows from, what it leads toward.

Then describe how the meaning of "{subject_name}" expresses itself across life domains: love, relationships, work, finances, health, and fortune. \
Root each application in the core archetype rather than listing generic advice.

Finally, describe the key symbols and images associated with "{subject_name}", explaining specifically why each symbol carries this meaning \
and what aspect of the core archetype it embodies.\
"""
            ),
        ]
    )
)

affirmations_analyze_sources_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """\
You are an expert researcher. Analyze web search results and extract a concise, factual research brief.
Identify what is well-supported by the sources and flag anything uncertain or contradicted."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Web search results for "{subject_name}" ({category_name}):

{sources}

---

Analyze the results above and produce a concise research brief:

1. **Core Themes & Meaning**: The 3–5 most important themes and interpretations of "{subject_name}". Emphasize what "{subject_name}" fundamentally means and represents.
2. **Life Applications**: How the meaning and themes of "{subject_name}" apply to love, relationships, work, finances, health, and fortune.
3. **Symbols & Archetypes**: Key symbols, imagery, and archetypes and what they reveal about the meaning of "{subject_name}".

Be concise."""
        ),
    ]
)

semantic_analyze_sources_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """\
You are an expert researcher. Analyze web search results and extract a concise, factual research brief.
Identify what is well-supported by the sources and flag anything uncertain or contradicted."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Web search results for "{subject_name}" ({category_name}):

{sources}

---

Analyze the results above and produce a concise research brief structured around these semantic facets:

1. **Core Archetype**: The single principle or archetype "{subject_name}" most purely embodies. State it directly and precisely.
2. **Energetic Character**: Its energetic quality using stable descriptors — active or receptive, expanding or contracting, concentrated or diffuse, light or shadow, structured or formless.
3. **Psychological Dimension**: The inner state, emotion, or psychic process it represents. What does it feel like from the inside?
4. **Relational Position**: How "{subject_name}" contrasts with, complements, or builds upon other {category_name_plural}. Name specific subjects.
5. **Life Applications**: How the core archetype expresses itself in love, relationships, work, finances, health, and fortune.
6. **Symbolic Carriers**: Key symbols and images, and why each specifically embodies the core archetype.

Be concise. Use consistent archetypal vocabulary: active/receptive, light/shadow, expansion/contraction, individual/collective, conscious/unconscious."""
        ),
    ]
)

affirmations_generate_document_prompt_template: ChatPromptTemplate = (
    ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(
                """\
You are a reference document writer for spiritual subjects. Summarize a research brief into a flowing prose reference document.
Output ONLY plain text in flowing paragraphs. Do NOT use any markdown formatting — no headings, no bullet points, no tables, no bold, no italic, no code fences.
Target length 1000 words maximum.
Use only the provided research brief as the source of truth. Do not use prior knowledge."""
            ),
            HumanMessagePromptTemplate.from_template(
                """\
Research brief for "{subject_name}" ({category_name}):

{source_analysis}

---

Write a reference document about the meaning of "{subject_name}" ({category_name_plural}) using the research brief above.

Your response must be plain flowing prose with NO markdown formatting whatsoever — no headings, no bullet points, \
no numbered lists, no tables, no bold, no italic, no code fences. Write in connected paragraphs only.

Cover the following topics in order, transitioning naturally between them:

Begin by explaining the core meaning and interpretation of "{subject_name}". Ignore its history and origins; focus deeply on what it means. \
Describe its significance within {category_name_plural} and how it relates to other subjects in the category.

Then discuss how the deeper meaning and themes of "{subject_name}" apply to different aspects of life: love, relationships, work, finances, health, and fortune.

Finally, highlight key symbols, imagery, and archetypes associated with "{subject_name}" and what they reveal about its meaning.\
"""
            ),
        ]
    )
)

semantic_generate_document_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """\
You are a reference document writer for spiritual subjects. Summarize a research brief into a flowing prose reference document.
Output ONLY plain text in flowing paragraphs. Do NOT use any markdown formatting — no headings, no bullet points, no tables, no bold, no italic, no code fences.
Target length 1000 words maximum.
This document will be used for semantic vector embedding, so use a controlled, consistent vocabulary of archetypal and psychological terms (e.g., active/receptive, expanding/contracting, light/shadow, structured/formless, conscious/unconscious, ascending/descending, individual/collective).
Every sentence should encode precise conceptual content. Avoid narrative filler.
Use only the provided research brief as the source of truth. Do not use prior knowledge."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Research brief for "{subject_name}" ({category_name}):

{source_analysis}

---

Write a reference document about the meaning of "{subject_name}" ({category_name_plural}) using the research brief above.

Your response must be plain flowing prose with NO markdown formatting whatsoever — no headings, no bullet points, \
no numbered lists, no tables, no bold, no italic, no code fences. Write in connected paragraphs only.

Address these semantic facets in order, using consistent archetypal vocabulary so this document is comparable with others in the same corpus:

First, state the core archetype or principle that "{subject_name}" most purely embodies. Then describe its energetic character \
using precise descriptors — active or receptive, expanding or contracting, concentrated or diffuse, light or shadow, structured or formless. \
Describe its psychological and emotional dimension: what inner state, emotion, or psychic process does it represent?

Next, explicitly describe how "{subject_name}" relates to, contrasts with, or builds upon other {category_name_plural}. \
Name specific subjects where meaningful — e.g., what it stands in polarity with, what it follows from, what it leads toward.

Then describe how the meaning of "{subject_name}" expresses itself across life domains: love, relationships, work, finances, health, and fortune. \
Root each application in the core archetype rather than listing generic advice.

Finally, describe the key symbols and images associated with "{subject_name}", explaining specifically why each symbol carries this meaning \
and what aspect of the core archetype it embodies.\
"""
        ),
    ]
)

affirmations_analyze_document_prompt_template: ChatPromptTemplate = (
    ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(
                """\
You are a spiritual subject analyst. Distill a reference document into a concise thematic brief for affirmation generation.
Output a plain text brief of at most 300 words. No markdown, no headers, no bullet points.
Focus only on: core themes, emotional tone, key symbols, and spiritual lessons."""
            ),
            HumanMessagePromptTemplate.from_template(
                """\
Reference document for "{subject_name}" ({category_name}):

{document}

---

Write a concise thematic brief for "{subject_name}" ({category_name}) covering core themes, emotional tone, key symbols, and spiritual lessons. \
Maximum 300 words. Plain text only — no markdown, no headers."""
            ),
        ]
    )
)

affirmations_generate_affirmations_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """You are an affirmation writer specializing in spirituality and personal growth.
Generate exactly 3 affirmations for the given tarot card that match a specific grammatical form.
Each affirmation must conform to the grammar's mood, voice, tense, aspect, person, number, polarity, and form.
Each affirmation must be thematically connected to the card's meaning, symbolism, and spiritual lessons.
Each affirmation must be 12 words or fewer — be concise and direct.
Do not end affirmations with a period."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Tarot card: {subject_name}
Thematic brief: {document_analysis}

Grammar: {grammar_name}
Grammar description: {grammar_description}
Example affirmations for this grammar: {grammar_examples}
Grammatical specifiers: {grammar_specifiers}
Grammatical specifier descriptions — follow every rule below exactly:
{grammar_specifier_descriptions}
Grammar emoji: {grammar_emoji}

---

Generate exactly 3 affirmations for "{subject_name}" that:
1. Match the grammatical form: {grammar_name} ({grammar_specifiers})
2. Follow every grammar rule listed above — these are hard requirements, not suggestions
3. Are thematically connected to {subject_name}'s meaning and symbolism
4. Follow the style of the examples: {grammar_examples}
5. Are 12 words or fewer — be concise and direct
6. Do not end with a period

Return a JSON object with an "affirmations" key containing a list of exactly 3 affirmation strings."""
        ),
    ]
)

affirmations_validate_affirmation_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """\
You are a grammar validator. Check whether an affirmation matches specific grammatical constraints.
Use ONLY the provided descriptions and examples as your criteria — never invent or apply grammar rules beyond what is explicitly stated in those descriptions.
If the affirmation structurally matches the descriptions and examples and violates no explicitly stated rule, it is valid.
If valid, return {{"valid": true}}. If invalid, return {{"valid": false, "reason": "brief explanation"}}."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Affirmation: "{affirmation_text}"
Grammar name: {grammar_name}
Grammar description: {grammar_description}
Grammatical specifiers: {grammar_specifiers}
Specifier descriptions:
{grammar_specifier_descriptions}
Grammar examples: {grammar_examples}

---

Does this affirmation match the grammatical constraints ({grammar_specifiers})?
Judge only against the descriptions and examples above — do not apply any unstated grammar rules.

If valid: {{"valid": true}}
If invalid: {{"valid": false, "reason": "brief explanation"}}"""
        ),
    ]
)

affirmations_validate_affirmation_subject_prompt_template: ChatPromptTemplate = ChatPromptTemplate.from_messages(
    [
        SystemMessagePromptTemplate.from_template(
            """\
You are a subject relevance validator. Check whether an affirmation is thematically appropriate for a given subject.
An affirmation is valid if its themes, imagery, and meaning are genuinely rooted in the subject's symbolism as described in the reference document.
An affirmation is invalid if it is too generic, contradicts the subject's meaning, or could apply equally to any subject.
If valid, return {{"valid": true}}. If invalid, return {{"valid": false, "reason": "brief explanation"}}."""
        ),
        HumanMessagePromptTemplate.from_template(
            """\
Affirmation: "{affirmation_text}"
Subject: "{subject_name}" ({category_name})

Reference document about "{subject_name}":
{document}

---

Is this affirmation thematically grounded in the meaning and symbolism of "{subject_name}" as described in the reference document above?

If valid: {{"valid": true}}
If invalid: {{"valid": false, "reason": "brief explanation"}}"""
        ),
    ]
)
