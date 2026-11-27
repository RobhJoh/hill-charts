// Showing calendar dates ("YYYY-MM-DD") in Swedish, e.g. "2 nov. 2026".
const format = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const visaDatum = (datum: string): string => format.format(new Date(`${datum}T00:00:00Z`));
