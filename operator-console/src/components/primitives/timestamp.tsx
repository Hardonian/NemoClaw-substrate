export interface TimestampProps {
  value: string;
  label?: string;
}

export function Timestamp({ value, label }: TimestampProps) {
  const display = formatTimestamp(value);
  return (
    <time dateTime={value} title={value} aria-label={label ?? `Timestamp: ${value}`}>
      {display}
    </time>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
  } catch {
    return iso;
  }
}
