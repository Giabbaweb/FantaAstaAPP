import {
  describe,
  expect,
  it
} from "vitest";

import {
  FmsRevoRostersParser
} from "./fms-revo-rosters.parser.js";

const auctionSessionId = "session-2026-2027";

describe("FmsRevoRostersParser", () => {
  const parser = new FmsRevoRostersParser();

  it("parses multiple fantasy-team rosters", () => {
    const content = [
      "\t\tAbbaweb\t\t\t\t",
      "\tPresidente Gianfranco Abbate",
      "",
      "\tE-mail:",
      "\tRosa Giocatori",
      "\tRuolo\tNome\tSquadra\tCon\t$Acq",
      "\tPortiere\tSVILAR Mile\tRoma\t2\t14",
      "\tDifensore\tCOMUZZO Pietro\tFiorentina\t2\t1",
      "",
      "\tBilancio",
      "",
      "\t\tDouble Beagles\t\t\t\t",
      "\tPresidente Roberto Rossi",
      "",
      "\tE-mail:",
      "\tRosa Giocatori",
      "\tRuolo\tNome\tSquadra\tCon\t$Acq",
      "\tCentrocampista\tBARELLA Nicolo'\tInter\t3\t25",
      "\tAttaccante\tLAUTARO Martinez\tInter\t2\t80",
      "",
      "\tBilancio"
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ROSTERS_TAB",
      content,
      auctionSessionId
    });

    expect(result.issues).toEqual([]);

    expect(result.rows).toEqual([
      {
        rowNumber: 7,
        teamName: "Abbaweb",
        playerName: "SVILAR Mile",
        role: "P",
        realTeamName: "Roma",
        contractYear: 2,
        acquisitionCost: 14
      },
      {
        rowNumber: 8,
        teamName: "Abbaweb",
        playerName: "COMUZZO Pietro",
        role: "D",
        realTeamName: "Fiorentina",
        contractYear: 2,
        acquisitionCost: 1
      },
      {
        rowNumber: 18,
        teamName: "Double Beagles",
        playerName: "BARELLA Nicolo'",
        role: "C",
        realTeamName: "Inter",
        contractYear: 3,
        acquisitionCost: 25
      },
      {
        rowNumber: 19,
        teamName: "Double Beagles",
        playerName: "LAUTARO Martinez",
        role: "A",
        realTeamName: "Inter",
        contractYear: 2,
        acquisitionCost: 80
      }
    ]);
  });

  it("reports contract year greater than three and preserves the row", () => {
    const content = [
      "\t\tAll Stars 2005",
      "\tPresidente Alberto Verdi",
      "",
      "\tE-mail:",
      "\tRosa Giocatori",
      "\tRuolo\tNome\tSquadra\tCon\t$Acq",
      "\tAttaccante\tLOOKMAN Ademola Olajade\tAtalanta\t4\t7",
      "",
      "\tBilancio"
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ROSTERS_TAB",
      content,
      auctionSessionId
    });

    expect(result.rows).toEqual([
      {
        rowNumber: 7,
        teamName: "All Stars 2005",
        playerName: "LOOKMAN Ademola Olajade",
        role: "A",
        realTeamName: "Atalanta",
        contractYear: 4,
        acquisitionCost: 7
      }
    ]);

    expect(result.issues).toEqual([
      {
        rowNumber: 7,
        code: "INVALID_CONTRACT_YEAR",
        message:
          "Contract year must be 1, 2 or 3",
        field: "contractYear",
        rawValue: "4"
      }
    ]);
  });

  it("reports invalid fields while preserving the source row", () => {
    const content = [
      "\t\tPanchester City",
      "\tPresidente Mario Bianchi",
      "",
      "\tE-mail:",
      "\tRosa Giocatori",
      "\tRuolo\tNome\tSquadra\tCon\t$Acq",
      "\tTrequartista\t\tRoma\tdue\tzero"
    ].join("\n");

    const result = parser.parse({
      format: "FMS_REVO_ROSTERS_TAB",
      content,
      auctionSessionId
    });

    expect(result.rows).toEqual([
      {
        rowNumber: 7,
        teamName: "Panchester City",
        playerName: "",
        role: null,
        realTeamName: "Roma",
        contractYear: null,
        acquisitionCost: null
      }
    ]);

    expect(result.issues).toEqual([
      {
        rowNumber: 7,
        code: "INVALID_PLAYER_NAME",
        message: "Player name is required",
        field: "playerName",
        rawValue: ""
      },
      {
        rowNumber: 7,
        code: "INVALID_ROLE",
        message:
          "Unsupported player role: Trequartista",
        field: "role",
        rawValue: "Trequartista"
      },
      {
        rowNumber: 7,
        code: "INVALID_CONTRACT_YEAR",
        message:
          "Contract year must be 1, 2 or 3",
        field: "contractYear",
        rawValue: "due"
      },
      {
        rowNumber: 7,
        code: "INVALID_ACQUISITION_COST",
        message:
          "Acquisition cost must be a positive integer",
        field: "acquisitionCost",
        rawValue: "zero"
      }
    ]);
  });

  it("returns an issue when no roster header exists", () => {
    const result = parser.parse({
      format: "FMS_REVO_ROSTERS_TAB",
      content: [
        "Abbaweb",
        "SVILAR Mile",
        "COMUZZO Pietro"
      ].join("\n"),
      auctionSessionId
    });

    expect(result.rows).toEqual([]);

    expect(result.issues).toEqual([
      {
        rowNumber: 0,
        code: "ROSTER_HEADER_NOT_FOUND",
        message:
          "FMS ReVo roster header was not found"
      }
    ]);
  });

  it("requires an auction session id", () => {
    expect(() =>
      parser.parse({
        format: "FMS_REVO_ROSTERS_TAB",
        content:
          "\tRuolo\tNome\tSquadra\tCon\t$Acq",
        auctionSessionId: " "
      })
    ).toThrow("Auction session id is required");
  });
});
