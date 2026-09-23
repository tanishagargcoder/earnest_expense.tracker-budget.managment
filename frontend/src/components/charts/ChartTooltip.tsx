import { formatCurrency } from '../../utils/format';

interface TooltipEntry {
  name?: string | number;
  value?: number | string | readonly (number | string)[];
  payload?: { fill?: string; color?: string };
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipEntry[];
  currency?: string;
}

/** Shared tooltip: text stays in ink colours, the swatch carries identity. */
export function ChartTooltip({ active, payload, label, currency }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && <p className="chart-tooltip__label">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="chart-tooltip__row">
          {(entry.payload?.fill || entry.payload?.color) && (
            <span className="dot" style={{ background: entry.payload.fill ?? entry.payload.color }} />
          )}
          <span>{entry.name}</span>
          <strong>{formatCurrency(Number(entry.value), currency)}</strong>
        </p>
      ))}
    </div>
  );
}
