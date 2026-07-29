import {
  FmsRevoArchiveParser
} from "./fms-revo-archive.parser.js";
import type {
  PlayerImportParseResult,
  PlayerImportParser,
  PlayerImportSource
} from "./player-import.types.js";

const fmsRevoArchiveParser =
  new FmsRevoArchiveParser();

export class DefaultPlayerImportParser
  implements PlayerImportParser
{
  parse(
    source: PlayerImportSource
  ): PlayerImportParseResult {
    switch (source.format) {
      case "FMS_REVO_ARCHIVE_TAB":
        return fmsRevoArchiveParser.parse(source);

      case "FMS_REVO_ROSTERS_TAB":
        return {
          players: [],
          issues: [
            {
              rowNumber: 0,
              code: "UNSUPPORTED_FORMAT",
              message:
                "FMS ReVo roster parsing is not implemented yet"
            }
          ]
        };
    }
  }
}
