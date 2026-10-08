import { Author, Line, Text, Token } from "@codebase/lexico-entities";

import { Paginated } from "../../lexico-api.utilities";

/** Relay connection type for literature authors. */
export const AuthorConnectionType = Paginated(Author);
/** Relay connection type for literature lines. */
export const LineConnectionType = Paginated(Line);
/** Relay connection type for literature texts. */
export const TextConnectionType = Paginated(Text);
/** Relay connection type for literature tokens. */
export const TokenConnectionType = Paginated(Token);
