import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/format';
import { ChartTooltip } from './ChartTooltip';

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

interface CategoryDonutProps {
  data: CategorySlice[];
  currency?: string;
}

/**
 * Share of spending per category. The legend beside the chart lists every
 * value, so no information depends on colour or hovering alone.
 */
export function CategoryDonut({ data, currency }: CategoryDonutProps) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="donut">
      <div className="donut__chart">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="95%"
              paddingAngle={1}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut__center" aria-hidden="true">
          <span>Total</span>
          <strong>{formatCurrency(total, currency, true)}</strong>
        </div>
      </div>
      <ul className="legend-list">
        {slices.map((s) => (
          <li key={s.name}>
            <span className="dot" style={{ background: s.color }} />
            <span className="legend-list__name">{s.name}</span>
            <span className="legend-list__pct">{total ? Math.round((s.value / total) * 100) : 0}%</span>
            <span className="legend-list__value">{formatCurrency(s.value, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
