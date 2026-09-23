import { useState } from 'react';
import type { Category, ExpenseFilters as Filters } from '../../types';
import { Icon } from '../ui/Icon';

interface ExpenseFiltersProps {
  categories: Category[];
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

export function ExpenseFilters({ categories, value, onChange, onReset }: ExpenseFiltersProps) {
  // On mobile the advanced filters are collapsed behind a toggle.
  const [expanded, setExpanded] = useState(false);
  const activeCount = [value.from, value.to, value.categoryId, value.minAmount, value.maxAmount].filter(Boolean).length;

  return (
    <section className="card filters" aria-label="Filter expenses">
      <div className="filters__top">
        <input
          type="search"
          className="filters__search"
          placeholder="Search description…"
          aria-label="Search description"
          value={value.search ?? ''}
          onChange={(e) => onChange({ search: e.target.value })}
        />
        <button type="button" className="btn btn--ghost filters__toggle" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          <Icon name="filter" size={18} /> Filters{activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>

      <div className={`filters__grid${expanded ? ' filters__grid--open' : ''}`}>
        <label>
          From
          <input type="date" value={value.from ?? ''} max={value.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
        </label>
        <label>
          To
          <input type="date" value={value.to ?? ''} min={value.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
        </label>
        <label>
          Category
          <select value={value.categoryId ?? ''} onChange={(e) => onChange({ categoryId: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min amount
          <input type="number" min="0" step="0.01" inputMode="decimal" value={value.minAmount ?? ''} onChange={(e) => onChange({ minAmount: e.target.value })} />
        </label>
        <label>
          Max amount
          <input type="number" min="0" step="0.01" inputMode="decimal" value={value.maxAmount ?? ''} onChange={(e) => onChange({ maxAmount: e.target.value })} />
        </label>
        <label>
          Sort by
          <select
            value={`${value.sortBy}:${value.order}`}
            onChange={(e) => {
              const [sortBy, order] = e.target.value.split(':') as [Filters['sortBy'], Filters['order']];
              onChange({ sortBy, order });
            }}
          >
            <option value="date:desc">Newest first</option>
            <option value="date:asc">Oldest first</option>
            <option value="amount:desc">Highest amount</option>
            <option value="amount:asc">Lowest amount</option>
          </select>
        </label>
        <button type="button" className="btn btn--ghost filters__reset" onClick={onReset}>
          Clear filters
        </button>
      </div>
    </section>
  );
}
