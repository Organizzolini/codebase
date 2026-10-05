"""🧬 Models"""

from pydantic import BaseModel, field_validator

from src.grammars import Grammar
from src.subjects import Subject


class Affirmation(BaseModel):
    text: str


class GrammarAffirmations(BaseModel):
    grammar: Grammar
    affirmations: list[Affirmation]


class SubjectAffirmations(BaseModel):
    subject: Subject
    grammars: list[GrammarAffirmations]


class GeneratedAffirmations(BaseModel):
    affirmations: list[str]

    @field_validator("affirmations")
    @classmethod
    def strip_trailing_periods(_cls, affirmation: list[str]) -> list[str]:
        return [text.rstrip(".") for text in affirmation]


class ValidationResult(BaseModel):
    valid: bool
    reason: str | None = None
