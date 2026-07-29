import {
  describe,
  expect,
  it
} from "vitest";

import {
  FmsRevoArchiveParser
} from "./fms-revo-archive.parser.js";

const auctionSessionId = "session-2026-2027";

describe("FmsRevoArchiveParser", () => {
  const parser = new FmsRevoArchiveParser();

  it("parses available and unavailable players", () => {
    const content = [
      "Archivio giocatori FMS ReVo",
      "",
      "\tCod\tFMld\tRuolo\tSquadra\tNome",
      "\t1001\t10\tPortiere\tInter\tSOMMER Yann",
      "\t1002\t20\tDifensore\tMilan\tGABBIA Matteo",
      "\t1003\t30\tCentrocampista\t{SERIE ESTERA}\tTONALI Sandro",
      "\t1004\t40\tAttaccante\t{SERIE MINORE}\tROSSI Mario",
      ""
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ARCHIVE_TAB",
      content,
      auctionSessionId
    });

    expect(result.issues).toEqual([]);

    expect(result.players).toEqual([
      {
        auctionSessionId,
        fmsCode: "1001",
        name: "SOMMER Yann",
        role: "P",
        availabilityStatus: "AVAILABLE"
      },
      {
        auctionSessionId,
        fmsCode: "1002",
        name: "GABBIA Matteo",
        role: "D",
        availabilityStatus: "AVAILABLE"
      },
      {
        auctionSessionId,
        fmsCode: "1003",
        name: "TONALI Sandro",
        role: "C",
        availabilityStatus: "UNAVAILABLE"
      },
      {
        auctionSessionId,
        fmsCode: "1004",
        name: "ROSSI Mario",
        role: "A",
        availabilityStatus: "UNAVAILABLE"
      }
    ]);
  });

  it("returns an issue when the archive header is missing", () => {
    const result = parser.parse({
      format: "FMS_REVO_ARCHIVE_TAB",
      content: [
        "Codice\tRuolo\tNome",
        "1001\tPortiere\tSOMMER Yann"
      ].join("\n"),
      auctionSessionId
    });

    expect(result.players).toEqual([]);

    expect(result.issues).toEqual([
      {
        rowNumber: 0,
        code: "HEADER_NOT_FOUND",
        message:
          "FMS ReVo archive header was not found"
      }
    ]);
  });

  it("reports an invalid role without rejecting valid rows", () => {
    const content = [
      "\tCod\tFMld\tRuolo\tSquadra\tNome",
      "\t1001\t10\tPortiere\tInter\tSOMMER Yann",
      "\t1002\t20\tTrequartista\tRoma\tPELLEGRINI Lorenzo",
      "\t1003\t30\tAttaccante\tJuventus\tVLAHOVIC Dusan"
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ARCHIVE_TAB",
      content,
      auctionSessionId
    });

    expect(result.players).toHaveLength(2);

    expect(result.players.map((player) => player.fmsCode))
      .toEqual([
        "1001",
        "1003"
      ]);

    expect(result.issues).toEqual([
      {
        rowNumber: 3,
        code: "INVALID_ROLE",
        message:
          "Unsupported player role: Trequartista",
        rawValue: "Trequartista"
      }
    ]);
  });

  it("ignores empty rows", () => {
    const content = [
      "\tCod\tFMld\tRuolo\tSquadra\tNome",
      "",
      "   ",
      "\t1001\t10\tDifensore\tNapoli\tDI LORENZO Giovanni",
      ""
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ARCHIVE_TAB",
      content,
      auctionSessionId
    });

    expect(result.players).toHaveLength(1);
    expect(result.issues).toEqual([]);
  });

  it("requires an auction session id", () => {
    expect(() =>
      parser.parse({
        format: "FMS_REVO_ARCHIVE_TAB",
        content:
          "\tCod\tFMld\tRuolo\tSquadra\tNome",
        auctionSessionId: " "
      })
    ).toThrow("Auction session id is required");
  });
});
