export function buildFmsRosterFilename(
  teamName: string
): string {
  const sanitizedName =
    teamName
      .trim()
      .replace(/[\\/:*?"<>|]+/gu, "_");

  return `${sanitizedName}.txt`;
}
