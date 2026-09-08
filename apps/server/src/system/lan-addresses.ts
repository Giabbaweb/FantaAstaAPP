import type {
  NetworkInterfaceInfo
} from "node:os";

export type LanAddressCandidate = {
  interfaceName: string;
  address: string;
};

type NetworkInterfaces = NodeJS.Dict<
  NetworkInterfaceInfo[]
>;

const isPrivateIpv4Address = (
  address: string
): boolean => {
  const octets = address
    .split(".")
    .map(Number);

  if (
    octets.length !== 4 ||
    octets.some(
      (octet) =>
        !Number.isInteger(octet) ||
        octet < 0 ||
        octet > 255
    )
  ) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    (
      first === 172 &&
      second !== undefined &&
      second >= 16 &&
      second <= 31
    ) ||
    (
      first === 192 &&
      second === 168
    )
  );
};

export const findLanAddressCandidates = (
  interfaces: NetworkInterfaces
): LanAddressCandidate[] =>
  Object.entries(interfaces)
    .flatMap(
      ([interfaceName, addresses]) =>
        (addresses ?? [])
          .filter(
            (address) =>
              address.family === "IPv4" &&
              !address.internal &&
              isPrivateIpv4Address(
                address.address
              )
          )
          .map((address) => ({
            interfaceName,
            address: address.address
          }))
    )
    .sort((left, right) => {
      const interfaceComparison =
        left.interfaceName.localeCompare(
          right.interfaceName
        );

      if (interfaceComparison !== 0) {
        return interfaceComparison;
      }

      return left.address.localeCompare(
        right.address
      );
    });
