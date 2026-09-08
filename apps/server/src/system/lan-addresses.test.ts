import type {
  NetworkInterfaceInfo
} from "node:os";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  findLanAddressCandidates
} from "./lan-addresses.js";

const networkAddress = (
  address: string,
  options: {
    family?: "IPv4" | "IPv6";
    internal?: boolean;
  } = {}
): NetworkInterfaceInfo => ({
  address,
  netmask:
    options.family === "IPv6"
      ? "ffff:ffff:ffff:ffff::"
      : "255.255.255.0",
  family: options.family ?? "IPv4",
  mac: "00:00:00:00:00:00",
  internal: options.internal ?? false,
  cidr: null,
  scopeid: 0
});

describe("findLanAddressCandidates", () => {
  it(
    "returns private non-internal IPv4 addresses",
    () => {
      const result =
        findLanAddressCandidates({
          WiFi: [
            networkAddress(
              "192.168.0.197"
            )
          ],
          Ethernet: [
            networkAddress(
              "10.20.30.40"
            )
          ],
          VPN: [
            networkAddress(
              "172.20.1.5"
            )
          ]
        });

      expect(result).toEqual([
        {
          interfaceName: "Ethernet",
          address: "10.20.30.40"
        },
        {
          interfaceName: "VPN",
          address: "172.20.1.5"
        },
        {
          interfaceName: "WiFi",
          address: "192.168.0.197"
        }
      ]);
    }
  );

  it(
    "excludes public, loopback, internal and IPv6 addresses",
    () => {
      const result =
        findLanAddressCandidates({
          Mixed: [
            networkAddress(
              "8.8.8.8"
            ),
            networkAddress(
              "127.0.0.1",
              {
                internal: true
              }
            ),
            networkAddress(
              "169.254.10.20"
            ),
            networkAddress(
              "fe80::1",
              {
                family: "IPv6"
              }
            )
          ]
        });

      expect(result).toEqual([]);
    }
  );

  it(
    "accepts only the private 172.16/12 range",
    () => {
      const result =
        findLanAddressCandidates({
          Network: [
            networkAddress(
              "172.15.255.255"
            ),
            networkAddress(
              "172.16.0.1"
            ),
            networkAddress(
              "172.31.255.254"
            ),
            networkAddress(
              "172.32.0.1"
            )
          ]
        });

      expect(result).toEqual([
        {
          interfaceName: "Network",
          address: "172.16.0.1"
        },
        {
          interfaceName: "Network",
          address: "172.31.255.254"
        }
      ]);
    }
  );

  it(
    "handles interfaces without addresses",
    () => {
      expect(
        findLanAddressCandidates({
          Empty: undefined
        })
      ).toEqual([]);
    }
  );
});
