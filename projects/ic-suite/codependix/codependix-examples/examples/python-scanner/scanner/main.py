import shared.constants, shared.helpers

from . import sibling
from .catalog import Catalog
from third_party_package import Missing

CATALOG = Catalog(shared.constants.FIRST, shared.helpers.name(), sibling.LABEL, Missing)
