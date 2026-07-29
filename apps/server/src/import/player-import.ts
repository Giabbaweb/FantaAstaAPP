import type {
  PlayerImportParseResult,
  PlayerImportParser,
  PlayerImportSource
} from "./player-import.types.js";

export class DefaultPlayerImportParser
  implements PlayerImportParser
{
  parse(
    source: PlayerImportSource
  ): PlayerImportParseResult {
    if (!source.auctionSessionId.trim()) {
      throw new Error(
        "Auction session id is required"
      );
    }

    if (!source.content.trim()) {
      return {
        players: [],
        issues: []
      };
    }

    return {
      players: [],
      issues: []
    };
  }
}
