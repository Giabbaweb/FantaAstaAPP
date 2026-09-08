import {
  describe,
  expect,
  it
} from "vitest";

import {
  serializeFmsRevoRoster
} from "./fms-revo-roster.serializer.js";

describe("serializeFmsRevoRoster", () => {
  it("serializes a roster using the FMS ReVo tab-separated format", () => {
    const result = serializeFmsRevoRoster([
      {
        role: "A",
        name: "YILDIZ Kenan",
        acquisitionCost: 2,
        contractYear: 3
      },
      {
        role: "D",
        name: "SOLET Oumar",
        acquisitionCost: 3,
        contractYear: 2
      },
      {
        role: "P",
        name: "SVILAR Mile",
        acquisitionCost: 14,
        contractYear: 2
      },
      {
        role: "C",
        name: "DIMARCO Federico",
        acquisitionCost: 37,
        contractYear: 1
      },
      {
        role: "D",
        name: "COMUZZO Pietro",
        acquisitionCost: 1,
        contractYear: 2
      }
    ]);

    expect(result).toBe(
      [
        "Portiere\tSVILAR Mile\t14\t2",
        "Difensore\tCOMUZZO Pietro\t1\t2",
        "Difensore\tSOLET Oumar\t3\t2",
        "Centrocampista\tDIMARCO Federico\t37\t1",
        "Attaccante\tYILDIZ Kenan\t2\t3"
      ].join("\r\n") +
      "\r\n"
    );

    expect(result).not.toMatch(
      /(?<!\r)\n/
    );
  });

  it("uses CRLF and adds a final line terminator", () => {
    const result = serializeFmsRevoRoster([
      {
        role: "P",
        name: "MAIGNAN Mike Peterson",
        acquisitionCost: 35,
        contractYear: 1
      }
    ]);

    expect(result).toBe(
      "Portiere\tMAIGNAN Mike Peterson\t35\t1\r\n"
    );

    expect(
      result.endsWith("\r\n")
    ).toBe(true);
  });

  it("returns an empty string for an empty roster", () => {
    expect(
      serializeFmsRevoRoster([])
    ).toBe("");
  });
});
