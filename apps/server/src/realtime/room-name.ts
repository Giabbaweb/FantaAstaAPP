function assertRoomIdentifier(
  value: string,
  fieldName: string
): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(
      `${fieldName} must not be empty`
    );
  }

  return normalizedValue;
}

export function auctionSessionRoom(
  auctionSessionId: string
): string {
  const normalizedAuctionSessionId =
    assertRoomIdentifier(
      auctionSessionId,
      "auctionSessionId"
    );

  return `auction-session:${normalizedAuctionSessionId}`;
}

export function auctionSessionTeamRoom(
  auctionSessionTeamId: string
): string {
  const normalizedAuctionSessionTeamId =
    assertRoomIdentifier(
      auctionSessionTeamId,
      "auctionSessionTeamId"
    );

  return `auction-session-team:${normalizedAuctionSessionTeamId}`;
}

export function auctionSessionOperatorsRoom(
  auctionSessionId: string
): string {
  const normalizedAuctionSessionId =
    assertRoomIdentifier(
      auctionSessionId,
      "auctionSessionId"
    );

  return `auction-session-operators:${normalizedAuctionSessionId}`;
}

export function auctionSessionObserversRoom(
  auctionSessionId: string
): string {
  const normalizedAuctionSessionId =
    assertRoomIdentifier(
      auctionSessionId,
      "auctionSessionId"
    );

  return `auction-session-observers:${normalizedAuctionSessionId}`;
}
