import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../../utils/format';
import { ChartTooltip } from './ChartTooltip';

interface TotalsBarChartProps {
  data: { label: string; total: number }[];
  currency?: string;
  /** Label to highlight (e.g. the selected month); other bars are muted. */
  highlight?: string;
  seriesName?: string;
  height?: number;
}

/** Single-series spending totals over time (months or days). */
export function TotalsBarChart({ data, currency, highlight, seriesName = 'Spent', height = 240 }: TotalsBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          tickFormatter={(v: number) => formatCurrency(v, currency, true)}
        />
        <Tooltip cursor={{ fill: 'var(--hover)' }} content={<ChartTooltip currency={currency} />} />
        <Bar
          dataKey="total"
          name={seriesName}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={!highlight || d.label === highlight ? 'var(--series-primary)' : 'var(--series-muted)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
