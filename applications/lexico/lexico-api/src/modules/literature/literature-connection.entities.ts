import { Paginated } from "../../lexico-api.utilities";

import { AuthorType } from "./author.entities";
import { LineType } from "./line.entities";
import { TextType } from "./text.entities";
import { TokenType } from "./token.entities";

/** Relay connection type for literature authors. */
export const AuthorConnectionType = Paginated(AuthorType, "Author");
/** Relay connection type for literature lines. */
export const LineConnectionType = Paginated(LineType, "Line");
/** Relay connection type for literature texts. */
export const TextConnectionType = Paginated(TextType, "Text");
/** Relay connection type for literature tokens. */
export const TokenConnectionType = Paginated(TokenType, "Token");
