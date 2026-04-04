function escapeCsvValue(value: string): string {
  if (value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  if (value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value}"`;
  }

  return value;
}

export function buildCsvContent(
  header: string[],
  rows: Array<Array<string | number | null | undefined>>,
): string {
  const lines: string[] = [];
  lines.push(header.map(escapeCsvValue).join(","));

  for (const row of rows) {
    lines.push(
      row
        .map((value) => {
          if (value === null || value === undefined) {
            return "";
          }

          return escapeCsvValue(String(value));
        })
        .join(","),
    );
  }

  return `\uFEFF${lines.join("\n")}`;
}

export function csvDownloadHeaders(fileName: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${fileName}"`,
    "Cache-Control": "no-store",
  };
}
