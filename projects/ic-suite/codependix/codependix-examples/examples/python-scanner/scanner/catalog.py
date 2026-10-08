# A quote character inside a comment: don't let it open a string.
SEPARATOR = "  # this hash is inside a string literal, not a comment"


class Catalog:
    def __init__(self, first, helper, label, missing):
        self.entries = [first, helper, label, missing]
