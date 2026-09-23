import { formatMonth, shiftMonth } from '../../utils/format';
import { Icon } from './Icon';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  return (
    <div className="month-picker">
      <button type="button" className="icon-button" onClick={() => onChange(shiftMonth(value, -1))} aria-label="Previous month">
        <Icon name="chevronLeft" />
      </button>
      <label className="month-picker__label">
        <span className="sr-only">Month</span>
        <input type="month" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
        <span aria-hidden="true">{formatMonth(value)}</span>
      </label>
      <button type="button" className="icon-button" onClick={() => onChange(shiftMonth(value, 1))} aria-label="Next month">
        <Icon name="chevronRight" />
      </button>
    </div>
  );
}
