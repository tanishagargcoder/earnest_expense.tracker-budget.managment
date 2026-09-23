interface ProgressBarProps {
  percent: number;
  color?: string;
  label: string;
}

/** Budget usage bar: turns amber from 80 % and red above 100 %. */
export function ProgressBar({ percent, color, label }: ProgressBarProps) {
  const state = percent > 100 ? 'over' : percent >= 80 ? 'warn' : 'ok';
  return (
    <div
      className={`progress progress--${state}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(percent))}
    >
      <span
        className="progress__fill"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%`, background: state === 'ok' ? color : undefined }}
      />
    </div>
  );
}
