from enum import StrEnum

from pydantic import BaseModel, computed_field


class DescribedEnum(StrEnum):
    """StrEnum base that stores a per-member generation instruction and usage examples."""

    _description: str
    _examples: tuple[str, str, str, str, str, str]

    def __new__(
        cls,
        name: str,
        description: str,
        examples: tuple[str, str, str, str, str, str],
    ) -> DescribedEnum:
        described_enum = str.__new__(cls, name)
        described_enum._value_ = name
        described_enum._description = description
        described_enum._examples = examples
        return described_enum

    @staticmethod
    def create(
        *,
        name: str,
        description: str,
        examples: tuple[str, str, str, str, str, str],
    ) -> tuple[str, str, tuple[str, str, str, str, str, str]]:
        return (name, description, examples)

    @property
    def description(self) -> str:
        """Imperative generation instruction for this specifier."""
        return self._description

    @property
    def examples(self) -> tuple[str, str, str, str, str, str]:
        """Short usage examples demonstrating this specifier."""
        return self._examples


class Mood(DescribedEnum):
    """Grammatical mood — the speaker's attitude toward the proposition.

    Realis
        indicative
    Irrealis / Epistemic
        subjunctive · conditional · interrogative · potential
        dubitative · presumptive · energetic · inferential · speculative
    Irrealis / Deontic
        Directive: imperative · prohibitive · jussive · hortative
        Volative:  optative
        commissive · benedictive · aorist · debitive · precative · permissive · necessitative
    """

    # -- Realis ----------------------------------------------------------------
    INDICATIVE = DescribedEnum.create(
        name="INDICATIVE",
        description="The default, unmarked mood in English — identified by the absence of any epistemic or deontic modal marker. Morphologically realized by a fully conjugated finite verb (present or past) asserting a proposition directly, with no 'would', 'might', 'if I were', or similar irrealis marker present.",
        examples=(
            "I am {adjective}...",
            "I {verb}...",
            "I {verb} {noun}...",
            "I have {noun} within me...",
            "I know my {noun}...",
            "I carry {noun} wherever I go...",
        ),
    )

    # -- Irrealis / Epistemic --------------------------------------------------
    SUBJUNCTIVE = DescribedEnum.create(
        name="SUBJUNCTIVE",
        description="Form using an irrealis marker expressing a wish or hypothetical. In English realized by: the bare-stem verb after 'if' or 'that' where agreement is usually expected ('if I were', 'that it be'), the periphrastic wish form 'I wish I were', or the optative-style 'may [base verb]' / 'might [base verb]' in wishing constructions. The morphological subjunctive ('were', 'be') occurs only in fixed patterns; the lexical forms are far more common.",
        examples=(
            "May I be {adjective}...",
            "Might I {verb} {noun}...",
            "Let it be that I am {adjective}...",
            "Were I to {verb}, I would be {adjective}...",
            "I wish I were {adjective}...",
            "If I were to {verb}, all would be {adjective}...",
        ),
    )

    CONDITIONAL = DescribedEnum.create(
        name="CONDITIONAL",
        description="Form using 'would' in the main clause paired with a conditional premise — either an explicit 'if' clause or an implied condition. In English realized by 'would [base verb]' (main clause) accompanied by a condition expressed with simple past or past perfect ('if I [past]', 'if I had [past participle]', 'if given', 'were I to').",
        examples=(
            "I would be {adjective} if I {verb-past}...",
            "I would {verb} {noun} if I {verb-past}...",
            "I could {verb} {noun} if I {verb-past}...",
            "If I {verb-past}, I would {verb} {noun}...",
            "I would {verb} with {noun} if given the chance...",
            "Were I {adjective}, I would {verb} even more...",
        ),
    )

    INTERROGATIVE = DescribedEnum.create(
        name="INTERROGATIVE",
        description=(
            "CRITICAL: The sentence MUST be a QUESTION and MUST end with '?'. "
            "Required patterns: 'Am I not...?', 'Have I not...?', 'Can I not...?', 'Do I not...?'. "
            "The '?' at the very end of the sentence is MANDATORY — never omit it. "
            "Do NOT write a declarative statement. 'Can' and 'have' are valid finite auxiliaries."
        ),
        examples=(
            "Am I not {adjective}?",
            "Have I not {verb-past} {noun}?",
            "Can I not {verb}?",
            "Do I not {verb} with {noun}?",
            "Is my {noun} not {adjective}?",
            "Shall I not {verb} my own {noun}?",
        ),
    )

    POTENTIAL = DescribedEnum.create(
        name="POTENTIAL",
        description=(
            "CRITICAL: The main predicate MUST begin with 'can', 'could', or 'am/is/are able to'. "
            "Valid structures: 'I can [verb]', 'I could [verb]', 'I am able to [verb]'. "
            "The verb that follows the auxiliary must be a simple action verb or adjective — keep it direct and simple. "
            "Do NOT use complex object clauses like 'I can see that...' or 'I can feel that...' — instead write 'I can see clearly', 'I can feel peace'. "
            "Do NOT use a bare indicative verb as the main predicate without a preceding potential auxiliary "
            "(e.g., do NOT write 'I trust...' or 'I believe...' as a standalone clause without 'can'/'could'/'able to')."
        ),
        examples=(
            "I can {verb}...",
            "I could {verb} {noun}...",
            "I am able to {verb}...",
            "I can {verb} with {noun}...",
            "I am able to {verb} {adjective}...",
            "I could {verb} beyond all {noun}...",
        ),
    )

    DUBITATIVE = DescribedEnum.create(
        name="DUBITATIVE",
        description="Form with an explicit grammatical marker of epistemic doubt — a verb or construction that expresses the speaker's active uncertainty or skepticism about whether the proposition is true. In English realized by 'wonder if', 'doubt', 'question whether', 'can hardly believe', 'uncertain whether', or 'could it be that'.",
        examples=(
            "I doubt I am {adjective}...",
            "I question whether I am {adjective}...",
            "I can hardly believe I have {verb-past}...",
            "I wonder if I truly am {adjective}...",
            "Could it be that I {verb} {noun}...",
            "I am uncertain whether I have {verb-past}...",
        ),
    )

    PRESUMPTIVE = DescribedEnum.create(
        name="PRESUMPTIVE",
        description="Form using an epistemic modal of reasoned inference — the speaker presents the proposition as a logical conclusion drawn from evidence or reasoning. In English realized by 'must', 'should', 'I suppose', 'presumably', or 'it follows that'.",
        examples=(
            "I must be {adjective}...",
            "I should be {adjective} of {noun}...",
            "I ought to have {noun}...",
            "I suppose I am {adjective}...",
            "It follows that I {verb} {noun}...",
            "Presumably I {verb} more than I realize...",
        ),
    )

    ENERGETIC = DescribedEnum.create(
        name="ENERGETIC",
        description="Form with an overt emphatic marker that asserts the proposition with greater force than a plain indicative. In English realized by emphatic do-support inserted before the main verb ('I do trust', 'I do carry') or by an overt intensifying adverb reinforcing the predicate ('indeed', 'truly', 'absolutely', 'without question', 'most certainly').",
        examples=(
            "I indeed am {adjective}...",
            "I truly do {verb} in {noun}...",
            "I do {verb} my {noun}...",
            "I absolutely {verb} every {noun}...",
            "I most certainly am {adjective}...",
            "Without question, I {verb} {noun}...",
        ),
    )

    INFERENTIAL = DescribedEnum.create(
        name="INFERENTIAL",
        description="Report something inferred from evidence rather than directly witnessed or asserted. In English realized by evidential adverbs or constructions: 'apparently', 'evidently', 'it seems', 'seem to', 'appear to be', or 'by all accounts'.",
        examples=(
            "I am apparently {verbing}...",
            "It seems I am {adjective}...",
            "I appear to be {adjective}...",
            "Evidently, I {verb} {noun}...",
            "I seem to {verb} with great {noun}...",
            "By all accounts, I am {adjective}...",
        ),
    )

    SPECULATIVE = DescribedEnum.create(
        name="SPECULATIVE",
        description="Form using an epistemic possibility marker indicating that the proposition is possible but uncertain from the speaker's perspective. In English realized by 'might', 'perhaps', 'maybe', 'possibly', 'conceivably', or 'it could be that'.",
        examples=(
            "I might be {adjective}...",
            "Perhaps I am {adjective}...",
            "Maybe I could {verb}...",
            "Possibly I {verb} more than I know...",
            "It could be that I am {adjective}...",
            "Conceivably, I {verb} {noun}...",
        ),
    )

    # -- Irrealis / Deontic / Directive ----------------------------------------
    IMPERATIVE = DescribedEnum.create(
        name="IMPERATIVE",
        description=(
            "Use the imperative mood: the main predicate is formed with the base (uninflected) form of the verb — "
            "identical to the infinitive without 'to' — with no explicit subject. The addressee ('you') is understood. "
            "CRITICAL: ANY sentence beginning with a base-form verb is a valid imperative — there are no restrictions "
            "on the verb itself or what follows it. 'Embrace', 'Know', 'Map', 'Honor', 'Manage', 'Share', 'Channel', "
            "'Master', 'Release', 'Trust' are ALL valid imperative verbs. "
            "The sentence may optionally open with a single adverb before the main verb; the base verb form still drives the predicate. "
            "Multiple imperative verbs may be coordinated with 'and'. "
            "Subordinate clauses may use any voice, tense, or person — only the main predicate must be imperative. "
            "Do NOT use modal auxiliaries ('should', 'must') or an explicit subject."
        ),
        examples=(
            "Be {adjective}",
            "{Verb} your {noun}",
            "Embrace your {adjective} {noun}",
            "Know the {noun} within yourself",
            "{Verb} {noun} and {verb} your {noun}",
            "{Verb} with {adjective} {noun}",
        ),
    )

    PROHIBITIVE = DescribedEnum.create(
        name="PROHIBITIVE",
        description="Form as a negated imperative with an implied second-person subject — the main predicate must be a negative command that explicitly prohibits an action, with no overt subject stated. In English realized by 'do not', 'don't', 'never', 'stop [verb]ing', or 'refuse to'.",
        examples=(
            "Do not {verb} yourself",
            "Never {verb}",
            "Stop {verbing} your {noun}",
            "Refuse to {verb} in {noun}",
            "Do not let {noun} {verb} you",
            "Never allow yourself to {verb}",
        ),
    )

    JUSSIVE = DescribedEnum.create(
        name="JUSSIVE",
        description="Form with a third-person directive construction: the main predicate directs a party other than the speaker or addressee to act. In English realized by 'let [third-person subject] [base verb]' (e.g., 'Let her grow', 'Let the light flow', 'Let them find').",
        examples=(
            "Let her {verb} {noun}...",
            "Let him be {adjective}...",
            "Let them {verb} their {noun}...",
            "Let the {noun} {verb}...",
            "Let each {noun} {verb} their own {noun}...",
            "Let all {noun} {verb} in {noun}...",
        ),
    )

    HORTATIVE = DescribedEnum.create(
        name="HORTATIVE",
        description="Form using a first-person inclusive exhortation. In English realized exclusively by 'let us [base verb]' or its contraction 'let's [base verb]' — the implicit subject is always 'we' encompassing the speaker and addressee together.",
        examples=(
            "Let us be {adjective}...",
            "Let us {verb} this {noun}...",
            "Let us {verb} {noun} together...",
            "Let us {verb} in {noun}...",
            "Let us {verb} one another...",
            "Let us {verb} {adjective} into {noun}...",
        ),
    )

    # -- Irrealis / Deontic / Volative -----------------------------------------
    OPTATIVE = DescribedEnum.create(
        name="OPTATIVE",
        description=(
            "Express a deep wish, longing, or hope — NOT a request for permission. "
            "'May I [verb]' here means 'I wish that I [verb]' (optative wish), NOT 'Am I allowed to [verb]'. "
            "'If only I could [verb]', 'Would that I might [verb]', and 'May I [verb]' are all valid optative forms expressing yearning. "
            "The tone should be longing, aspiration, or heartfelt desire — not a yes/no question about permission."
        ),
        examples=(
            "May I {verb} {noun}...",
            "If only I could {verb}...",
            "Would that I might {verb} my {noun}...",
            "O that I could {verb} in {noun}...",
            "How I wish I might {verb}...",
            "If only I were {adjective} enough to {verb}...",
        ),
    )

    # -- Irrealis / Deontic ----------------------------------------------------
    COMMISSIVE = DescribedEnum.create(
        name="COMMISSIVE",
        description="Form as a first-person speech act that constitutes the commitment through its utterance. In English realized by explicit performative verbs ('I commit', 'I pledge', 'I vow', 'I promise', 'I swear') or by 'I will' used as a solemn first-person promise rather than a mere prediction.",
        examples=(
            "I will be {adjective}...",
            "I commit to {verbing} every {time-unit}...",
            "I pledge to {verb}...",
            "I vow to {verb} my {noun}...",
            "I promise myself I will {verb}...",
            "I swear to {verb} with all my {noun}...",
        ),
    )

    BENEDICTIVE = DescribedEnum.create(
        name="BENEDICTIVE",
        description="Form as a benefactive optative addressed to a second person — the sentence must be structured as a blessing directed toward the addressee. In English realized by 'May you [verb]' or 'May [noun] be upon you'. Distinct from OPTATIVE (a wish for oneself) and JUSSIVE (a directive to a third party).",
        examples=(
            "May you be {verb-past} with {noun}...",
            "May you {verb} {noun}...",
            "May you {verb} and {verb}...",
            "May {noun} be upon you...",
            "May {noun} {verb} through your {noun}...",
            "May your {noun} be {adjective}...",
        ),
    )

    AORIST = DescribedEnum.create(
        name="AORIST",
        description="Form the main predicate in simple past tense to present a single discrete event as a bounded whole that occurred at a specific moment — the action is complete and viewed from the outside with no ongoing relevance to the present.",
        examples=(
            "I was {adjective} that day...",
            "I {verb-past} to the {noun}...",
            "In that moment, I {verb-past}...",
            "Once, I {verb-past} and all was {adjective}...",
            "At that instant, I {verb-past} my {noun}...",
            "I {verb-past} {adverb} in one single act...",
        ),
    )

    DEBITIVE = DescribedEnum.create(
        name="DEBITIVE",
        description="Form using a deontic modal or construction of obligation — the action is required of the speaker by duty or moral debt, not merely desired. In English realized by 'must', 'ought to', 'owe it to myself to', 'it is my duty to', 'am bound to', or 'am obligated to'.",
        examples=(
            "I must be {adjective}...",
            "I ought to {verb} in {noun}...",
            "I owe it to myself to {verb}...",
            "It is my duty to {verb} {noun}...",
            "I am bound to {verb} with {noun}...",
            "I am obligated to {verb} my {noun}...",
        ),
    )

    PRECATIVE = DescribedEnum.create(
        name="PRECATIVE",
        description="Form as a petitionary speech act — the sentence must be structured as an earnest entreaty or prayer. In English realized by 'I pray', 'I beseech', 'I humbly ask', 'grant that', or 'may it be granted that'.",
        examples=(
            "I pray to {verb} {noun}...",
            "Grant that I may be {adjective}...",
            "Let me be {adjective} of {noun}...",
            "I beseech that I may {verb} {noun}...",
            "I humbly ask to {verb} in {noun}...",
            "May it be granted that I {verb}...",
        ),
    )

    PERMISSIVE = DescribedEnum.create(
        name="PERMISSIVE",
        description="Form using a deontic construction that explicitly licenses the right to act. In English realized by 'I am allowed to', 'I permit myself to', 'I give myself permission to', 'I am free to', or 'I grant myself the right to'.",
        examples=(
            "I am allowed to be {adjective}...",
            "I permit myself to {verb}...",
            "I give myself permission to {verb}...",
            "I am free to {verb} my {noun}...",
            "I grant myself the right to be {adjective}...",
            "I allow myself to {verb} {adjective}...",
        ),
    )

    NECESSITATIVE = DescribedEnum.create(
        name="NECESSITATIVE",
        description="Form using a deontic or alethic modal of necessity — the action is presented as required or unavoidable, not merely desired or intended. In English realized by 'must', 'need to', 'have to', 'it is necessary that', or 'it is essential that'.",
        examples=(
            "I need to {verb} in {noun}...",
            "It is necessary that I {verb}...",
            "I must {verb} my {noun}...",
            "It is essential that I {verb} {noun}...",
            "I have to {verb} for my own {noun}...",
            "There is no choice but to {verb} {adjective}...",
        ),
    )


class Voice(DescribedEnum):
    """Grammatical voice — the relationship between subject and verb action."""

    ACTIVE = DescribedEnum.create(
        name="ACTIVE",
        description="Use ACTIVE voice: the subject ('I'/'we') performs the action.",
        examples=(
            "I {verb} {noun}...",
            "I {verb} my {noun}...",
            "I {verb} my own {noun}...",
            "I {verb} with {adjective} {noun}...",
            "I {verb} {noun} every {time-unit}...",
            "I {adverb} {verb} my {noun}...",
        ),
    )

    PASSIVE = DescribedEnum.create(
        name="PASSIVE",
        description=(
            "CRITICAL: The MAIN clause must use PASSIVE voice — the subject receives the action rather than performing it. "
            "Form: '[subject] + be-auxiliary (am/was/have been) + past participle'. "
            "The past participle is the third principal part of the verb (the form used after 'have': driven, held, shaped, seen, moved, etc.). "
            "CRITICAL: The word immediately after the be-auxiliary MUST be a true past participle (a verb form), "
            "NOT a noun, adjective, or present participle (-ing). For example: 'driven', 'held', 'shaped', 'lifted', "
            "'guided', 'embraced', 'supported', 'freed', 'known', 'seen' are valid past participles. "
            "Words like 'visionary', 'potential', 'meaning', 'success', 'absence' are NOT past participles and are INVALID. "
            "Any transitive verb whose past participle naturally expresses a received action is valid. "
            "An optional 'by [agent]' phrase may follow; if two agents are referenced, join them with 'and' in a single 'by' phrase rather than two. "
            "CRITICAL: do NOT use two separate 'by ...' phrases in one sentence. "
            "Subordinate clauses and infinitive phrases may use active voice; only the MAIN predicate must be passive. "
            "Do NOT write an active main predicate."
        ),
        examples=(
            "I am {past-participle}...",
            "I am {past-participle} by {noun}...",
            "I am {past-participle} by {description}...",
            "I have been {past-participle} with {noun}...",
            "I was {past-participle} into {noun}...",
            "I am deeply {past-participle}...",
        ),
    )


class Tense(DescribedEnum):
    """Grammatical tense — when an event takes place.

    Past:           past · recent past · remote past · pluperfect
    Cross-cutting:  nonpast · nonfuture
    Present:        present
    Future:         future · near future · remote future
                    future perfect · future-in-the-past
    """

    # -- Past ------------------------------------------------------------------
    PAST = DescribedEnum.create(
        name="PAST",
        description="Morphologically realized by the simple past form of the verb: regular verbs add -ed (walked, trusted, loved); irregular verbs use their distinct past forms (was, went, saw, knew, felt, grew, etc.). No temporal adverb is required; the past-tense form alone carries the tense.",
        examples=(
            "I was {adjective}...",
            "I {verb-past} {noun}...",
            "I {verb-past} my {noun}...",
            "I {verb-past} with great {noun}...",
            "I once {verb-past} deeply...",
            "I {verb-past} everything I needed...",
        ),
    )

    RECENT_PAST = DescribedEnum.create(
        name="RECENT_PAST",
        description="Place the event in the near past. English has no morphological recency marker, so recency must be signaled lexically. In English realized by temporal adverbs of very recent time: 'just', 'just now', 'moments ago', 'a moment ago', 'only just', or the present perfect with 'just' ('I have just [past participle]').",
        examples=(
            "I was just {adjective}...",
            "I have just {verb-past} to {verb}...",
            "Only moments ago I {verb-past}...",
            "Just now, I {verb-past} {noun}...",
            "A moment ago, I was {adjective}...",
            "I have only just begun to {verb}...",
        ),
    )

    REMOTE_PAST = DescribedEnum.create(
        name="REMOTE_PAST",
        description="Place the event in the distant past. English has no morphological remoteness marker, so remoteness must be signaled lexically. In English realized by temporal adverbs of distant time: 'long ago', 'ages ago', 'years back', 'in a distant past', 'once upon a time', or 'in the ancient past'.",
        examples=(
            "Long ago, I {verb-past} my {noun}...",
            "Years back, I {verb-past} {noun}...",
            "I was once {adjective}, and {verb-past}...",
            "In a distant past, I {verb-past} {noun}...",
            "Ages ago, I {verb-past} with {noun}...",
            "Once upon a time, I {verb-past} my {noun}...",
        ),
    )

    PLUPERFECT = DescribedEnum.create(
        name="PLUPERFECT",
        description="Use the past perfect: 'had + past participle' — the action was completed before another reference point in the past.",
        examples=(
            "I had already {verb-past} {adjective}...",
            "Before that moment, I had {verb-past}...",
            "I had long since {verb-past} my {noun}...",
            "By then, I had {verb-past} every {noun}...",
            "I had already become {adjective}...",
            "Before I knew it, I had {verb-past}...",
        ),
    )

    # -- Cross-cutting ---------------------------------------------------------
    NONPAST = DescribedEnum.create(
        name="NONPAST",
        description="Place the event in the present or future — do not use past-tense forms.",
        examples=(
            "I am {adjective}...",
            "I will {verb} my {noun}...",
            "I {verb} every {time-unit}...",
            "I am {verbing} toward {noun}...",
            "I will soon {verb} {noun}...",
            "I {verb} and will continue to {verb}...",
        ),
    )

    NONFUTURE = DescribedEnum.create(
        name="NONFUTURE",
        description="Place the event in the past or present — do not use future-tense forms such as 'will'.",
        examples=(
            "I am {adjective}...",
            "Yesterday I {verb-past} {noun}...",
            "I have always {verb-past} my {noun}...",
            "I {verb} as I have always {verb-past}...",
            "Even now, I {verb} {noun}...",
            "I {verb-past} once and still {verb}...",
        ),
    )

    # -- Present ---------------------------------------------------------------
    PRESENT = DescribedEnum.create(
        name="PRESENT",
        description="Morphologically realized by the present simple form: first/second/plural person uses the bare stem (I trust, you carry, we grow); third-person singular adds -s (she flows, it knows, he carries). The be-verb present forms are 'am/is/are'. No progressive (-ing) or past (-ed) marking is used.",
        examples=(
            "I am {adjective}...",
            "I {verb} myself...",
            "I {verb} {noun}...",
            "I am {adjective} in this moment...",
            "I {verb} with {noun}...",
            "I am {adjective} and {adjective}...",
        ),
    )

    # -- Future ----------------------------------------------------------------
    FUTURE = DescribedEnum.create(
        name="FUTURE",
        description=(
            "Use the future tense with 'will'. "
            "Keep the structure simple: 'I will [verb] [direct object/complement]'. "
            "Do NOT write complex object clauses like 'I will see my thoughts are...' — use 'I will recognize my thoughts' or 'I will see clearly' instead. "
            "Do NOT end the affirmation with 'now' — that word makes the sentence feel present tense, not future."
        ),
        examples=(
            "I will be {adjective}...",
            "I will {verb} my {noun}...",
            "I will {verb} into {description}...",
            "I will {verb} every {noun} ahead...",
            "I will become {adjective}...",
            "I will {verb} with {adjective} {noun}...",
        ),
    )

    NEAR_FUTURE = DescribedEnum.create(
        name="NEAR_FUTURE",
        description="Place the event in the imminent future. In English realized by periphrastic markers of imminent timing: 'am about to [verb]', 'am on the verge of [verb]ing', 'am just about to [verb]', 'am soon to [verb]', or 'any moment [will/shall verb]'.",
        examples=(
            "I am about to {verb} my {noun}...",
            "I am on the verge of {verbing}...",
            "I am soon to {verb} {description}...",
            "Any moment, I will {verb}...",
            "I am just about to {verb} {noun}...",
            "I am about to {verb} into {noun}...",
        ),
    )

    REMOTE_FUTURE = DescribedEnum.create(
        name="REMOTE_FUTURE",
        description="Place the event in the distant future. English has no morphological remoteness marker, so it must be lexically expressed. In English realized by explicit temporal adverbs of far-future distance: 'someday', 'one day', 'far from now', 'in years to come', 'in ages to come', 'in the distant future', or 'eventually'.",
        examples=(
            "Someday I will {verb} {noun}...",
            "One day I will {verb}...",
            "Far from now, I will have {verb-past}...",
            "In years to come, I will {verb}...",
            "In ages to come, I will have {verb-past}...",
            "In the distant future, I will be {adjective}...",
        ),
    )

    FUTURE_PERFECT = DescribedEnum.create(
        name="FUTURE_PERFECT",
        description=(
            "Use FUTURE PERFECT tense: 'I will have [past participle]...'. "
            "This is DIFFERENT from present perfect ('I have [past participle]'). "
            "'I will have become...', 'I will have achieved...', 'I will have created...' are all valid future perfect. "
            "The 'will have' structure is mandatory. "
            "Do NOT end the affirmation with 'now' — that word undercuts the future-looking perspective."
        ),
        examples=(
            "I will have become {adjective}...",
            "I will have {verb-past} my {noun}...",
            "I will have {verb-past} into {description}...",
            "I will have {verb-past} every {noun}...",
            "I will have grown beyond all {noun}...",
            "I will have {verb-past} with {adjective} {noun}...",
        ),
    )

    FUTURE_IN_THE_PAST = DescribedEnum.create(
        name="FUTURE_IN_THE_PAST",
        description="Express an event that was future relative to a past reference point. In English realized by: 'was going to [base verb]', 'was about to [base verb]', 'was meant to [base verb]', 'was to [base verb]', or the narrative past modal 'would [base verb]' in a context that establishes a preceding past moment.",
        examples=(
            "I was going to be {adjective}...",
            "I was about to {verb} my {noun}...",
            "Back then, I would {verb} my {noun}...",
            "At that time, I was going to {verb}...",
            "I was meant to be {adjective}...",
            "I was to {verb} my {noun} eventually...",
        ),
    )


class Aspect(DescribedEnum):
    """Grammatical aspect — how events extend over time.

    Completeness:   simple · perfective
    Imperfective:   imperfective · progressive · continuous · stative
    Other:          habitual · prospective · gnomic · episodic
                    inceptive · terminative · experiential
    """

    # -- Completeness ----------------------------------------------------------
    SIMPLE = DescribedEnum.create(
        name="SIMPLE",
        description="Express the action plainly without specifying duration or extent over time.",
        examples=(
            "I {verb}...",
            "I {verb} {noun}...",
            "I am {adjective}...",
            "I {verb} with {noun}...",
            "I {verb} my own {noun}...",
            "I simply {verb}...",
        ),
    )

    PERFECTIVE = DescribedEnum.create(
        name="PERFECTIVE",
        description="Express the action as a complete, bounded whole — viewed start-to-finish. Morphologically realized by the simple past tense form of the verb (same form as PAST tense); the perfective reading emerges from context and completive adverbs such as 'completely', 'fully', 'in one act', 'from start to finish', or 'once and for all'.",
        examples=(
            "I {verb-past} and {verb-past}...",
            "I {verb-past} my {noun}...",
            "I {verb-past} the {noun}...",
            "I completely {verb-past} {noun}...",
            "I {verb-past} it all at once...",
            "I {verb-past} from start to finish...",
        ),
    )

    # -- Imperfective ----------------------------------------------------------
    IMPERFECTIVE = DescribedEnum.create(
        name="IMPERFECTIVE",
        description="Form using a past progressive construction — the action was actively unfolding at a reference point in the past, presented as incomplete from the inside rather than as a finished whole.",
        examples=(
            "I was {verbing} toward my {noun}...",
            "I was becoming {adjective}...",
            "I was {verbing} toward {noun}...",
            "I was gradually {verbing} more {adjective}...",
            "I was still {verbing} my {noun}...",
            "I was in the midst of {verbing}...",
        ),
    )

    PROGRESSIVE = DescribedEnum.create(
        name="PROGRESSIVE",
        description="Use the progressive: 'I am [verb]ing...'.",
        examples=(
            "I am {verbing}...",
            "I am {verbing} my {noun}...",
            "I am becoming {adjective}...",
            "I am {verbing} into {noun}...",
            "I am slowly {verbing}...",
            "I am actively {verbing} my {noun}...",
        ),
    )

    CONTINUOUS = DescribedEnum.create(
        name="CONTINUOUS",
        description="Form using a present progressive construction explicitly marked for sustained, unbroken continuation — the action persists without interruption rather than merely occurring at this moment. Distinct from PROGRESSIVE (a neutral in-progress frame) and STATIVE (an unchanging state). In English, the be + -ing frame is required and must be reinforced by a duration or continuation adverb: 'continuously', 'ceaselessly', 'perpetually', 'without pause', 'ever', or 'always'.",
        examples=(
            "I am {verbing} {adjective}...",
            "I am becoming my {noun}...",
            "I am continuously {verbing} {noun}...",
            "I am perpetually {verbing} toward {noun}...",
            "I am ever {verbing} my {noun}...",
            "I am ceaselessly {verbing} with {noun}...",
        ),
    )

    STATIVE = DescribedEnum.create(
        name="STATIVE",
        description="Form using a stative (non-dynamic) verb in the simple present to denote a stable, persistent state. Morphologically, stative aspect uses the bare present form without progressive (-ing) marking; stative verbs are those that cannot naturally appear in the progressive without a change of meaning — verbs of knowing, believing, perceiving, possessing, or relating (e.g., know, believe, love, hold, possess, remain, understand, belong, seem, deserve).",
        examples=(
            "I {verb} my {noun}...",
            "I remain {adjective}...",
            "I {verb} this {noun}...",
            "I {verb} {adjective} {noun}...",
            "I {verb} my own {noun}...",
            "I {verb} to this {noun}...",
        ),
    )

    # -- Other -----------------------------------------------------------------
    HABITUAL = DescribedEnum.create(
        name="HABITUAL",
        description="Form by including a temporal frequency marker — an adverb or adverbial phrase that explicitly signals the action as recurring or habitual, establishing it as a regular pattern rather than a single event.",
        examples=(
            "I always {verb} {noun}...",
            "I regularly {verb} {noun}...",
            "I consistently {verb} for {noun}...",
            "Every day, I {verb} my {noun}...",
            "Each morning, I {verb} with {noun}...",
            "I routinely {verb} {adjective}...",
        ),
    )

    PROSPECTIVE = DescribedEnum.create(
        name="PROSPECTIVE",
        description="Express the aspect of readiness or preparation oriented toward a future action — focus is on the internal state of preparedness, not merely the timing. Distinct from NEAR_FUTURE (which marks imminent timing regardless of readiness). In English realized by preparatory periphrases: 'am ready to [verb]', 'am poised to [verb]', 'am prepared to [verb]', 'stand ready to [verb]', 'am set to [verb]', or 'am on the verge of [verb]ing'.",
        examples=(
            "I am about to {verb}...",
            "I am on the verge of {verbing}...",
            "I am ready to {verb} on {noun}...",
            "I am poised to {verb} {noun}...",
            "I am prepared to {verb} my {noun}...",
            "I stand ready to {verb}...",
        ),
    )

    GNOMIC = DescribedEnum.create(
        name="GNOMIC",
        description="Express a universal truth or timeless principle. The gnomic aspect has no special morphological or lexical marker in English — it is realized structurally by the simple present with a generic or universal subject (not 'I' or 'we'). The proposition must read as a timeless generalization, not a report of a specific event or personal action.",
        examples=(
            "{Noun} {verbs} through {noun}...",
            "{Noun} is {verb-past} in {noun}...",
            "Every {noun} {verbs}...",
            "All {noun} {verbs} toward {noun}...",
            "Where there is {noun}, there is {noun}...",
            "{Adjective} {noun} always {verbs}...",
        ),
    )

    EPISODIC = DescribedEnum.create(
        name="EPISODIC",
        description="Express a specific individual event anchored to a particular past time. In English, episodic aspect requires an explicit time-anchor expression tying the event to a specific occasion: 'yesterday', 'last week', 'that day', 'on that day', 'at that moment', 'earlier today', or a similar definite past-time reference.",
        examples=(
            "I {verb-past} {noun} yesterday...",
            "Last week, I {verb-past} {noun}...",
            "That day, I {verb-past} my {noun}...",
            "On that day, I {verb-past} with {noun}...",
            "Earlier today, I {verb-past} {adjective}...",
            "At that moment, I {verb-past} {noun}...",
        ),
    )

    INCEPTIVE = DescribedEnum.create(
        name="INCEPTIVE",
        description="Express the very start or beginning of an action. In English realized by phase-marking constructions: 'beginning to [verb]', 'starting to [verb]', 'am just starting to [verb]', 'the first signs of [noun] are [verb]ing', or 'something is [verb]ing within me'.",
        examples=(
            "I am beginning to {verb}...",
            "I am starting to {verb} {adjective}...",
            "Something is {verbing} within me...",
            "A {adjective} {noun} is {verbing} in me...",
            "I am just starting to {verb} my {noun}...",
            "The first signs of {noun} are {verbing}...",
        ),
    )

    TERMINATIVE = DescribedEnum.create(
        name="TERMINATIVE",
        description="Express the completion or endpoint of an action. In English realized by endpoint-marking constructions: 'have stopped [verb]ing', 'am done [verb]ing', 'have finished [verb]ing', 'have ceased to [verb]', 'no longer [verb]', or 'have completed [noun]'.",
        examples=(
            "I have stopped {verbing} myself...",
            "I am done {verbing} that {noun}...",
            "I have finished {verbing} myself...",
            "I have ceased to {verb} in {noun}...",
            "I no longer {verb} my {noun}...",
            "I have completed my {noun}...",
        ),
    )

    EXPERIENTIAL = DescribedEnum.create(
        name="EXPERIENTIAL",
        description="Form using the present perfect ('have + past participle') to assert that the speaker has accumulated lived experience of the action — the focus is on the experiential result in the present, not the specific time of occurrence.",
        examples=(
            "I have {verb-past} this before...",
            "I have {verb-past} {noun} many times...",
            "I have {verb-past} from every {noun}...",
            "I have {verb-past} through {noun}...",
            "I have {verb-past} {noun} and {verb-past}...",
            "I have {verb-past} this {noun} before...",
        ),
    )

    PERFECT_PROGRESSIVE = DescribedEnum.create(
        name="PERFECT_PROGRESSIVE",
        description=(
            "Use the perfect progressive: 'I have been [verb]ing...'. "
            "The sentence must open with 'I have been'. "
            "Coordinated verbs must also use the -ing form, e.g., 'I have been growing and becoming...'. "
            "Do NOT end the affirmation with 'now' — the perfect progressive already implies ongoing action up to the present."
        ),
        examples=(
            "I have been {verbing}...",
            "I have been {verbing} my {noun}...",
            "I have been {verbing} {noun} every {time-unit}...",
            "I have been steadily {verbing}...",
            "I have been {verbing} and {verbing}...",
            "I have been {verbing} toward {adjective} {noun}...",
        ),
    )


class Person(DescribedEnum):
    """Grammatical person — the relationship between speaker and subject."""

    FIRST = DescribedEnum.create(
        name="FIRST",
        description=(
            "Subject is first-person. In English realized by the first-person pronouns 'I' (singular) or 'we' (plural) "
            "as the grammatical subject. The verb must agree with this subject ('I am/trust/carry', 'we are/trust/carry'). "
            "IMPORTANT: First-person singular present tense uses the bare (uninflected) verb form — "
            "'I understand', 'I perceive', 'I embody', 'I express', 'I command' are ALL correctly conjugated."
        ),
        examples=(
            "I am {adjective}...",
            "We are {adjective}...",
            "I {verb} in {noun}...",
            "We {verb} our {noun}...",
            "I have {noun} within me...",
            "We carry {noun} together...",
        ),
    )
    SECOND = DescribedEnum.create(
        name="SECOND",
        description="Subject is second-person. In English realized by the pronoun 'you' as the overt grammatical subject, or as the implied addressee in imperative constructions where no subject is stated.",
        examples=(
            "You are {adjective}...",
            "You {verb} {noun}...",
            "You have {noun}...",
            "You carry {noun} within you...",
            "You deserve {noun}...",
            "You stand {adjective} in your {noun}...",
        ),
    )
    THIRD = DescribedEnum.create(
        name="THIRD",
        description=(
            "CRITICAL: Do NOT use 'I'. "
            "The subject must be third-person — any entity the speaker refers to rather than addressing directly. "
            "Third-person subjects include third-person pronouns (he, she, it, they) and any noun phrase: "
            "a person, animal, place, concrete object, or abstract concept treated as the grammatical subject. "
            "Abstract and inanimate noun subjects — such as 'wisdom', 'energy', 'intuition', 'growth', "
            "'the soul', 'the mind', 'the light' — are fully VALID third-person singular subjects. "
            "Never start the sentence with 'I'. "
            "IMPORTANT subject-verb agreement: a grammatically singular subject (any pronoun 'he/she/it' or any single noun phrase, "
            "whether concrete or abstract) takes the third-person singular verb form, inflected with -s/-es. "
            "A grammatically plural subject takes the base (uninflected) verb form."
        ),
        examples=(
            "She is {adjective}...",
            "Wisdom {verbs} through {noun}...",
            "They {verb} their {noun}...",
            "The light {verbs} within...",
            "The soul {verbs} with {adjective} {noun}...",
            "Energy {verbs} {noun} into {noun}...",
        ),
    )


class Number(DescribedEnum):
    """Grammatical number — how many subjects are involved."""

    SINGULAR = DescribedEnum.create(
        name="SINGULAR",
        description="Subject is grammatically singular. Morphologically realized through subject-verb agreement: first-person singular 'I' takes 'am/was' (be-verb) or bare stem ('I trust'); third-person singular takes -s inflection on the verb ('he flows', 'she carries', 'it knows'). Singular pronouns: I, he, she, it; or any single noun phrase.",
        examples=(
            "I am {adjective}...",
            "He is {adjective}...",
            "She {verbs} in {noun}...",
            "I {verb} my own {noun}...",
            "She carries {noun} within her...",
            "He stands {adjective} and {adjective}...",
        ),
    )

    PLURAL = DescribedEnum.create(
        name="PLURAL",
        description="Subject is grammatically plural. Morphologically realized through subject-verb agreement: plural subjects take the bare uninflected stem ('we trust', 'they carry', 'we are'). Plural pronouns: we, they; or any plural noun phrase (the roots, the branches).",
        examples=(
            "We are {adjective}...",
            "They are {adjective}...",
            "We all {verb}...",
            "They {verb} with {noun}...",
            "We {verb} as one...",
            "They carry {noun} together...",
        ),
    )

    DUAL = DescribedEnum.create(
        name="DUAL",
        description="Subject refers to exactly two people or entities. English has no grammatical dual, so it must be lexically expressed. In English realized by 'we two', 'both of us', 'the two of us', 'the pair of us', or 'you and I'.",
        examples=(
            "We two are {adjective} together...",
            "The two of us are {adjective}...",
            "Both of us are {adjective}...",
            "We two {verb} in {noun}...",
            "The pair of us {verb} together...",
            "Both of us {verb} our {noun}...",
        ),
    )

    TRIPLE = DescribedEnum.create(
        name="TRIPLE",
        description="Subject refers to exactly three people or entities. English has no grammatical trial number, so it must be lexically expressed. In English realized by 'we three', 'the three of us', 'all three of us', or 'the trio of us'.",
        examples=(
            "We three are {noun}...",
            "The three of us are {adjective}...",
            "All three of us have {verb-past}...",
            "We three {verb} with {noun}...",
            "The three of us {verb} together...",
            "All three of us carry {noun}...",
        ),
    )

    EXISTENTIAL = DescribedEnum.create(
        name="EXISTENTIAL",
        description="Subject carries an existential quantifier — the predicate is asserted to apply to some unspecified subset of the group, not necessarily all members. In English realized by 'some', 'certain', 'a number of', 'a few of us', or 'there are those who'.",
        examples=(
            "Some of us are {adjective}...",
            "Some among us are {adjective}...",
            "Some people {verb} their {noun}...",
            "A number of us {verb} {noun}...",
            "Some of us have {verb-past}...",
            "Certain ones among us {verb}...",
        ),
    )

    UNIVERSAL = DescribedEnum.create(
        name="UNIVERSAL",
        description="Subject carries a universal quantifier — the predicate is asserted to apply to every member of the set without exception. In English realized by 'all', 'every', 'each', 'everyone', or 'no one is excluded'.",
        examples=(
            "All of us are {adjective}...",
            "Everyone is {adjective}...",
            "Each of us has {noun}...",
            "Every {noun} {verbs} with {noun}...",
            "All of us {verb} {noun}...",
            "Each one of us {verbs} {noun}...",
        ),
    )

    PAUCAL = DescribedEnum.create(
        name="PAUCAL",
        description="Subject refers to a small, limited number of people or entities. English has no grammatical paucal, so it must be lexically expressed. In English realized by small-quantity quantifiers: 'few', 'a few of', 'only a handful', 'a small number of', 'a select few', or 'several'.",
        examples=(
            "Few of us are {adjective}...",
            "A few of us {verb}...",
            "Only a handful of us {verb}...",
            "A small number of us {verb} {noun}...",
            "Few among us have {verb-past}...",
            "A select few of us {verb} with {noun}...",
        ),
    )

    SUPERPLURAL = DescribedEnum.create(
        name="SUPERPLURAL",
        description="Subject refers to a large, abundant number of people or entities. English has no grammatical superplural, so it must be lexically expressed. In English realized by large-quantity quantifiers: 'many', 'so many', 'countless', 'multitudes', 'innumerable', or 'a great many'.",
        examples=(
            "Many of us are {adjective}...",
            "So many of us {verb}...",
            "Countless people have {verb-past}...",
            "Multitudes among us {verb} {noun}...",
            "Innumerable souls are {adjective}...",
            "A great many of us {verb} with {noun}...",
        ),
    )


class Polarity(DescribedEnum):
    """Grammatical polarity — whether the proposition is affirmed or negated."""

    POSITIVE = DescribedEnum.create(
        name="POSITIVE",
        description="Do not include any negation words ('not', 'never', 'no').",
        examples=(
            "I am {adjective}...",
            "I {verb} myself...",
            "I {verb} {noun}...",
            "I {verb} {noun} within...",
            "I {verb} with {noun}...",
            "I {verb} {noun} into my {noun}...",
        ),
    )

    NEGATIVE = DescribedEnum.create(
        name="NEGATIVE",
        description=(
            "Include negation using 'not', 'never', 'no longer', or 'without'. "
            "Compound predicates that combine a negation with a positive clause are VALID "
            "(e.g., 'I am not stagnant but flow with abundance', 'I am not fearful but trust fully'). "
            "The presence of a positive second clause does NOT make the affirmation fail the NEGATIVE requirement "
            "as long as the negation word is present."
        ),
        examples=(
            "I am not {adjective}...",
            "I never {verb}...",
            "I am no longer {verb-past}...",
            "I do not {verb} in {noun}...",
            "I refuse to be {adjective}...",
            "Without {noun}, I am still {adjective}...",
        ),
    )


class Deixis(DescribedEnum):
    """Deictic values — words anchored to a specific time, place, or person.

    The deictic center (origo) is the speaker's "here and now".

    Spatial (proximal → far-distal): proximal · medial · distal · far-distal
    Temporal (relative to origo):    immediate · proximate temporal · remote temporal
    Personal:                        inclusive · exclusive
    """

    # -- Spatial ---------------------------------------------------------------
    PROXIMAL = DescribedEnum.create(
        name="PROXIMAL",
        description="Include a proximal spatial deictic expression that locates the referent at the speaker's immediate position. In English realized by 'this', 'here', 'right here', or 'in this place'.",
        examples=(
            "I am here, in this {noun}...",
            "This {noun} is mine...",
            "I hold this {noun} right now...",
            "In this place, I am {adjective}...",
            "Here and now, I {verb}...",
            "This very {noun} belongs to me...",
        ),
    )

    MEDIAL = DescribedEnum.create(
        name="MEDIAL",
        description="Include a medial spatial deictic expression that locates the referent at a perceptible but non-immediate distance — farther than 'here' but still within active awareness. In English realized by 'near', 'nearby', 'that approaching', or 'drawing closer'.",
        examples=(
            "That {noun} is near...",
            "I am becoming that {noun}...",
            "That {noun} is drawing closer...",
            "I can {verb} that {noun} approaching...",
            "That {adjective} {noun} is within reach...",
            "Nearby, that {noun} {verbs}...",
        ),
    )

    DISTAL = DescribedEnum.create(
        name="DISTAL",
        description="Include a distal spatial deictic expression that locates the referent at a clear remove from the speaker's position, beyond immediate reach. In English realized by 'that', 'there', 'beyond', 'over there', or 'out there'.",
        examples=(
            "I reach toward that {noun}...",
            "I am moving toward that {noun}...",
            "That {noun} of me awaits...",
            "Over there, my {noun} {verbs}...",
            "Beyond this place, {noun} awaits...",
            "I look toward that distant {noun}...",
        ),
    )

    FAR_DISTAL = DescribedEnum.create(
        name="FAR_DISTAL",
        description="Include a far-distal spatial deictic expression that places the referent at a remotely distant location, far beyond ordinary reach or sight. In English realized by 'yonder', 'yon', 'far beyond', 'in the far reaches', or 'out beyond the horizon'.",
        examples=(
            "I am drawn toward yonder {noun}...",
            "Out beyond, a greater {noun} awaits...",
            "I look to yonder {noun} of {noun}...",
            "Far beyond this horizon, {noun} {verbs}...",
            "In the far reaches, my {noun} {verbs}...",
            "Yon {noun} {verbs} across the {noun}...",
        ),
    )

    # -- Temporal --------------------------------------------------------------
    IMMEDIATE = DescribedEnum.create(
        name="IMMEDIATE",
        description="Include a temporal deictic expression that anchors the event precisely to the speaker's moment of utterance, not merely the general present. In English realized by 'now', 'right now', 'this very instant', 'this very breath', 'at this moment', or 'in this instant'.",
        examples=(
            "Right now, I am {adjective}...",
            "In this very breath, I am {adjective}...",
            "This instant, I {verb} {noun}...",
            "At this very moment, I {verb}...",
            "Here, in this instant, I am {adjective}...",
            "Now, I {verb} with {noun}...",
        ),
    )

    PROXIMATE_TEMPORAL = DescribedEnum.create(
        name="PROXIMATE_TEMPORAL",
        description="Include a near-temporal deictic expression that places the event close to but not at the present moment, either in the just-past or the imminent future. In English realized by 'soon', 'shortly', 'before long', 'recently', 'just', or 'in the near term'.",
        examples=(
            "I am soon to be {adjective}...",
            "I have recently {verb-past} my {noun}...",
            "Before long, I will {verb}...",
            "Shortly, I will {verb} {noun}...",
            "Just recently, I {verb-past} with {noun}...",
            "In the near term, I will {verb}...",
        ),
    )

    REMOTE_TEMPORAL = DescribedEnum.create(
        name="REMOTE_TEMPORAL",
        description="Include a remote-temporal deictic expression that places the event far from the present moment, in the distant past or distant future. In English realized by 'long ago', 'ages ago', 'someday', 'eventually', 'one day far from now', or 'in the distant future'.",
        examples=(
            "I will later {verb} {noun}...",
            "Long ago, I {verb-past} {noun}...",
            "Eventually, {noun} all {verbs}...",
            "Someday, I will {verb} beyond all {noun}...",
            "In the distant past, I {verb-past}...",
            "Ages from now, I will have {verb-past}...",
        ),
    )

    # -- Personal --------------------------------------------------------------
    INCLUSIVE = DescribedEnum.create(
        name="INCLUSIVE",
        description="Use the inclusive first-person plural — a 'we' that encompasses both the speaker and the addressee together, expressing shared identity or joint action. In English signaled by 'we' with explicit markers of joint membership: 'you and I', 'together we', 'all of us', or 'we share'.",
        examples=(
            "Together we are {adjective}...",
            "All of us can {verb} {noun}...",
            "We share this {noun}...",
            "We all {verb} in this {noun}...",
            "Together, each of us {verbs}...",
            "We, you and I, {verb} with {noun}...",
        ),
    )

    EXCLUSIVE = DescribedEnum.create(
        name="EXCLUSIVE",
        description="Use the exclusive first-person plural or a third-person outgroup reference that explicitly marks the speaker's group as distinct from the addressee. In English signaled by 'we alone', 'we ourselves', 'they (apart from you)', or a third-person subject referring to a separate group.",
        examples=(
            "We {verb} this forward on our own...",
            "We {verb-past} this happen ourselves...",
            "They {verb-past} this without {noun}...",
            "We alone {verb} this {noun}...",
            "On our own, we {verb} with {noun}...",
            "They among themselves {verb} {noun}...",
        ),
    )


class Form(DescribedEnum):
    """Grammatical form — the finite or non-finite character of the verb phrase.

    Non-finite forms lack agreement with a subject for person/number/tense and
    are typically used in subordinate or infinitival constructions.

    Finite:     finite
    Non-finite: infinitive · gerund · participle · supine
    """

    FINITE = DescribedEnum.create(
        name="FINITE",
        description="Use a fully conjugated (finite) verb that agrees with its subject.",
        examples=(
            "I am {adjective}...",
            "She {verbs} every {time-unit}...",
            "We {verb} in {noun}...",
            "He {verbs} with {noun}...",
            "They {verb} their {noun}...",
            "I {verb} my {noun} daily...",
        ),
    )

    INFINITIVE = DescribedEnum.create(
        name="INFINITIVE",
        description=(
            "Start with the base infinitive: 'To [verb]...' — no subject or conjugation. "
            "Objects, complements, and prepositional phrases after 'To [verb]' are all allowed — "
            "'To acknowledge support without doubt' and 'To create a nurturing space with care' are both VALID. "
            "The only requirement is that the sentence begins with 'To [infinitive verb]'."
        ),
        examples=(
            "To be {adjective}...",
            "To {verb} {adverb}...",
            "To {verb} without {noun}...",
            "To {verb} with {adjective} {noun}...",
            "To {verb} each {noun} fully...",
            "To be {adjective} is to {verb}...",
        ),
    )

    GERUND = DescribedEnum.create(
        name="GERUND",
        description=(
            "Begin with a gerund: an -ing verb form that acts as the grammatical SUBJECT of the main clause. "
            "Required sentence structure: '[Gerund phrase] [finite main verb] [complement]'. "
            "The gerund phrase IS the noun-subject; the sentence MUST have a separate finite verb after it. "
            "VALID examples: 'Being present opens doors', 'Trusting yourself builds strength', "
            "'Navigating challenges requires courage', 'Releasing fear allows peace', 'Recognizing truth frees the mind'. "
            "The finite verb is the word directly AFTER the gerund phrase (e.g., 'opens', 'builds', 'requires', 'allows', 'frees'). "
            "Do NOT write a participial phrase where the -ing word modifies a separate subject "
            "(e.g., do NOT write 'Stepping forward, I trust...' or 'Trusting the path, I grow...'). "
            "Do NOT write an incomplete phrase without a finite main verb. "
            "CRITICAL: ANY affirmation matching '[Gerund -ing phrase] [finite main verb] [complement or object]' is VALID "
            "regardless of vocabulary — e.g., 'Giving support creates abundant connection', "
            "'Receiving kindness fosters inner balance', 'Observing growth reveals true value'. "
            "Do NOT reject because the vocabulary differs from the provided examples — structure is all that matters."
        ),
        examples=(
            "Being {adjective} is {noun}...",
            "{Verbing} {noun} {verbs} {noun}...",
            "{Verbing} with {noun} {verbs} {adjective}...",
            "{Verbing} deeply {verbs} {noun}...",
            "{Verbing} {adjective} {noun} {verbs} {noun}...",
            "{Verbing} each {time-unit} {verbs} my {noun}...",
        ),
    )

    PARTICIPLE = DescribedEnum.create(
        name="PARTICIPLE",
        description="Begin with a participial phrase (-ing or past-participle as a modifier).",
        examples=(
            "{Verbing} {adjective}, I {verb-past}...",
            "{Verb-past} in {noun}, I {verb-past}...",
            "Having {verb-past} {noun}, I {verb-past}...",
            "{Verbing} with {noun}, I {verb-past}...",
            "{Verb-past} by {noun}, I {verb-past}...",
            "Having been {adjective}, I {verb-past}...",
        ),
    )

    SUPINE = DescribedEnum.create(
        name="SUPINE",
        description="Use a purposive infinitive structure.",
        examples=(
            "I {verb} forward to {verb} my {noun}...",
            "I {verb-past} here to {verb} {noun}...",
            "I {verb} in order to {verb}...",
            "I {verb} so as to {verb} my {noun}...",
            "I {verb} for the purpose of {verbing}...",
            "I {verb-past} to {verb} {noun}...",
        ),
    )


class Grammar(BaseModel):
    """A grammatical form for an affirmation sentence.

    All fields are optional — omitted fields are left to the LLM's discretion.
    Any combination of specifiers can be provided to constrain generation.

    Example (minimal): Grammar(mood=Mood.INDICATIVE)  → "indicative"
    Example (full):    Grammar(...)                   → "indicative-active-present-simple-first-singular-proximal"
    """

    emoji: str
    description: str
    examples: list[str]

    form: Form | None = None
    mood: Mood | None = None
    tense: Tense | None = None
    person: Person | None = None
    voice: Voice | None = None
    aspect: Aspect | None = None
    number: Number | None = None
    deixis: Deixis | None = None
    polarity: Polarity | None = None

    @computed_field
    @property
    def specifiers(self) -> list[str]:
        """Ordered list of active specifier values, omitting unspecified fields.

        Example: ["INDICATIVE", "ACTIVE", "PRESENT", "SIMPLE", "FIRST", "SINGULAR", "PROXIMAL"]
        """
        return [
            str(specifier)
            for specifier in (
                self.form,
                self.mood,
                self.voice,
                self.tense,
                self.aspect,
                self.person,
                self.number,
                self.deixis,
                self.polarity,
            )
            if specifier is not None
        ]

    @computed_field
    @property
    def name(self) -> str:
        """Emoji-prefixed Capital Start Case name, omitting unspecified fields.

        Example: "⭐ Indicative Active Present Simple First Singular Proximal"
        """
        return f"{self.emoji} {' '.join(specifier.replace('_', ' ').title() for specifier in self.specifiers)}"

    @computed_field
    @property
    def slug(self) -> str:
        """Kebab-case slug, omitting unspecified fields (emoji excluded).

        Example: "indicative-active-present-simple-first-singular-proximal"
        """
        return "-".join(specifier.replace("_", "-").lower() for specifier in self.specifiers)

    @computed_field
    @property
    def specifier_descriptions(self) -> str:
        """Clear, imperative generation instructions assembled from active grammatical specifiers."""
        lines: list[str] = []

        for specifier in (self.form, self.mood, self.voice, self.polarity, self.aspect, self.tense):
            if specifier is not None and specifier.description:
                lines.append(specifier.description)

        if self.person == Person.FIRST and self.number == Number.SINGULAR:
            lines.append(
                "Subject is 'I' (first-person singular). "
                "IMPORTANT: In English, the first-person singular present tense uses the bare stem — "
                "'I accept', 'I trust', 'I allow', 'I guard', 'I choose', 'I connect', 'I possess' are all correctly "
                "conjugated finite verbs in present simple. Do NOT reject them for being 'base form' or 'unconjugated' — "
                "they ARE correctly conjugated."
            )
        elif self.person == Person.FIRST and self.number == Number.PLURAL:
            lines.append("Subject is 'we' (first person plural).")
        elif self.person is not None and self.person.description:
            lines.append(self.person.description)

        return "\n".join(f"- {line}" for line in lines)

    def __str__(self) -> str:
        return self.slug


# 📚 Affirmation Grammars

PAST = Grammar(
    emoji="✅",
    description="Grounds the affirmation in a completed past action or state — celebrating past strength and achievement.",
    examples=[
        "I was {adjective}...",
        "I {verb-past}...",
        "I {verb-past} {noun}...",
        "I {verb-past} my {noun} with {noun}...",
        "I {verb-past} through {noun}...",
        "I {verb-past} {adjective} {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PAST,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

PRESENT = Grammar(
    emoji="⭐",
    description="Asserts a present-moment truth directly and simply — the most fundamental form of affirmation.",
    examples=[
        "I am {adjective}...",
        "I {verb}...",
        "I am {adjective} of {noun}...",
        "I {verb} my {noun}...",
        "I {verb} with {adjective} {noun}...",
        "I {verb} {noun} in my {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

FUTURE = Grammar(
    emoji="⏭️",
    description="Projects confident intention toward the future — affirming what one will be or achieve.",
    examples=[
        "I will {verb}...",
        "I will {verb} my {noun}...",
        "I will {verb} {noun}...",
        "I will be {adjective}...",
        "I will {verb} with {adjective} {noun}...",
        "I will {verb} every {noun} I {verb}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.FUTURE,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

PERFECT_PROGRESSIVE = Grammar(
    emoji="🔄",
    description="Affirms continuous progress that began in the past and is still unfolding — capturing momentum and sustained effort.",
    examples=[
        "I have been {verbing}...",
        "I have been {verbing} my {noun}...",
        "I have been {verbing} every {time-unit}...",
        "I have been {verbing} with {adjective} {noun}...",
        "I have been {verbing} {noun} into {noun}...",
        "I have been {adverb} {verbing} my {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.PERFECT_PROGRESSIVE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

FUTURE_PERFECT = Grammar(
    emoji="🎯",
    description="Visualizes a future moment where something is already accomplished — affirming from the vantage point of completion.",
    examples=[
        "I will have {verb-past} {noun}...",
        "I will have become {description}...",
        "I will have {verb-past} a {noun}...",
        "I will have {verb-past} my {noun}...",
        "I will have {verb-past} through {noun}...",
        "I will have {verb-past} every {noun} I {verb}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.FUTURE_PERFECT,
    aspect=Aspect.PERFECTIVE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

FIRST_PLURAL = Grammar(
    emoji="🤝",
    description="Affirms shared strength and collective identity — embracing connection and belonging with others.",
    examples=[
        "We are {adjective} together...",
        "We {verb} each other...",
        "We {verb} {noun}...",
        "We {verb} our {noun} with {noun}...",
        "We are {adjective} in our {noun}...",
        "We {verb} as one in {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.PLURAL,
)

THIRD_PRESENT = Grammar(
    emoji="👤",
    description="Speaks a present truth about another entity — a person, force, or abstract concept — broadening perspective beyond the self.",
    examples=[
        "They {verb} in their own {noun}...",
        "She {verbs} her {noun}...",
        "Wisdom {verbs} through {noun}...",
        "The soul {verbs} with {adjective} {noun}...",
        "Growth {verbs} {noun} into {noun}...",
        "Energy {verbs} {adjective} {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.THIRD,
)

POTENTIAL = Grammar(
    emoji="💪",
    description="Affirms capability and possibility — what the speaker can do or is able to accomplish.",
    examples=[
        "I can {verb}...",
        "I could {verb} {noun}...",
        "I am able to {verb}...",
        "I can {verb} my {noun} with {noun}...",
        "I can {verb} through any {noun}...",
        "I am capable of {verbing} {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.POTENTIAL,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

OPTATIVE = Grammar(
    emoji="🙏",
    description="Expresses a sincere wish or deep longing — voicing the heart's desire with openness and hope.",
    examples=[
        "May I {verb} {noun}...",
        "If only I could {verb}...",
        "Would that I might {verb}...",
        "May I {verb} with {adjective} {noun}...",
        "If only I could {verb} my {noun}...",
        "May I be {adjective} in {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.OPTATIVE,
    voice=Voice.ACTIVE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

IMPERATIVE = Grammar(
    emoji="❗",
    description="Commands the self or another to act — activating, direct, and rousing. Any base-form verb is valid.",
    examples=[
        "Be {adjective}",
        "{Verb} your {noun}",
        "Embrace your {adjective} {noun}",
        "Know the {noun} within",
        "Trust the {noun} of {noun}",
        "{Verb} with {adjective} {noun}",
    ],
    form=Form.FINITE,
    mood=Mood.IMPERATIVE,
    voice=Voice.ACTIVE,
    person=Person.SECOND,
    number=Number.SINGULAR,
)

INTERROGATIVE = Grammar(
    emoji="❓",
    description="Challenges limiting beliefs through a rhetorical question — confronting self-doubt head-on.",
    examples=[
        "Am I not {adjective}?",
        "Have I not {verb-past} {noun}?",
        "Can I not {verb}?",
        "Do I not {verb} {noun}?",
        "Am I not {adjective} enough to {verb}?",
        "Have I not already {verb-past}?",
    ],
    form=Form.FINITE,
    mood=Mood.INTERROGATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    person=Person.FIRST,
    number=Number.SINGULAR,
    polarity=Polarity.NEGATIVE,
)

INFINITIVE = Grammar(
    emoji="♾️",
    description="Names a purpose or aspiration in its purest infinitive form — to be, to do, to become.",
    examples=[
        "To {verb}...",
        "To {verb} {adverb}...",
        "To {verb} without {noun}...",
        "To {verb} with {adjective} {noun}...",
        "To {verb} each {noun} fully...",
        "To be {adjective} is to {verb}...",
    ],
    form=Form.INFINITIVE,
    voice=Voice.ACTIVE,
    aspect=Aspect.SIMPLE,
)

GERUND = Grammar(
    emoji="💡",
    description="Affirms through process and action — celebrating the doing and becoming, not merely the state of being.",
    examples=[
        "Being {adjective} {verbs} {noun}...",
        "{Verbing} {noun} {verbs} {adjective} {noun}...",
        "{Verbing} {noun} {verbs} {noun}...",
        "{Verbing} with {noun} {verbs} {adjective} {noun}...",
        "{Verbing} {adjective} {noun} {verbs} {noun}...",
        "{Verbing} deeply {verbs} {noun}...",
    ],
    form=Form.GERUND,
    voice=Voice.ACTIVE,
)

PASSIVE = Grammar(
    emoji="🌊",
    description="Affirms being received, held, or supported — openness to grace, love, and forces beyond the self. The word after 'am' must be a past participle (verb form), not a noun or adjective.",
    examples=[
        "I am {past-participle}...",
        "I am {past-participle} by {noun}...",
        "I am {past-participle} by {description}...",
        "I am {past-participle} into {adjective} {noun}...",
        "I am deeply {past-participle} by {noun}...",
        "I am {past-participle} with {adjective} {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.PASSIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

HABITUAL = Grammar(
    emoji="🔁",
    description="Reinforces a repeated practice or pattern — affirming what the speaker consistently does or believes.",
    examples=[
        "I always {verb} {noun}...",
        "I regularly {verb} {noun}...",
        "I consistently {verb} {noun}...",
        "I {verb} {noun} every {time-unit}...",
        "I always {verb} with {adjective} {noun}...",
        "I unfailingly {verb} my {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.HABITUAL,
    person=Person.FIRST,
    number=Number.SINGULAR,
)

NEGATIVE = Grammar(
    emoji="🫷",
    description="Affirms by negating a false belief or limitation — releasing what is not true about the self.",
    examples=[
        "I am not {adjective}...",
        "I am not {adjective} of {noun}...",
        "I do not {verb} {noun}...",
        "I am not defined by {noun}...",
        "I do not {verb} in {noun}...",
        "I no longer {verb} {noun}...",
    ],
    form=Form.FINITE,
    mood=Mood.INDICATIVE,
    voice=Voice.ACTIVE,
    tense=Tense.PRESENT,
    aspect=Aspect.SIMPLE,
    person=Person.FIRST,
    number=Number.SINGULAR,
    polarity=Polarity.NEGATIVE,
)

GRAMMARS = [
    PAST,
    PRESENT,
    FUTURE,
    PERFECT_PROGRESSIVE,
    FUTURE_PERFECT,
    FIRST_PLURAL,
    THIRD_PRESENT,
    POTENTIAL,
    OPTATIVE,
    IMPERATIVE,
    INTERROGATIVE,
    INFINITIVE,
    GERUND,
    PASSIVE,
    HABITUAL,
    NEGATIVE,
]
