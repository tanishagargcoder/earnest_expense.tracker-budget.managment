import { useState, type FormEvent } from 'react';
import { categoriesApi } from '../api/endpoints';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorBanner, Spinner } from '../components/ui/Feedback';
import { FormField } from '../components/ui/FormField';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { useCategories } from '../hooks/useCategories';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import type { Category } from '../types';
import { getErrorMessage } from '../utils/errors';

/** Colour-blind-safe presets, in the same order as the default categories. */
export const COLOR_PRESETS = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#4A3AA7', '#E34948'];

type Editor = { mode: 'create' } | { mode: 'edit'; category: Category } | null;

function CategoryForm({ initial, onSubmit, onCancel }: { initial?: Category; onSubmit: (v: { name: string; color: string }) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? COLOR_PRESETS[0]);
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({ name: name.trim(), color: color.toUpperCase() });
    } catch (err) {
      setFormError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {formError && <ErrorBanner message={formError} />}
      <FormField label="Name" error={error}>
        <input type="text" maxLength={50} value={name} onChange={(e) => (setName(e.target.value), setError(undefined))} />
      </FormField>
      <fieldset className="swatches">
        <legend>Colour</legend>
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`swatch${preset.toLowerCase() === color.toLowerCase() ? ' swatch--active' : ''}`}
            style={{ background: preset }}
            onClick={() => setColor(preset)}
            aria-label={`Use colour ${preset}`}
            aria-pressed={preset.toLowerCase() === color.toLowerCase()}
          />
        ))}
        <label className="swatch swatch--custom" title="Custom colour">
          <span className="sr-only">Custom colour</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
      </fieldset>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save' : 'Add category'}
        </button>
      </div>
    </form>
  );
}

export function CategoriesPage() {
  useDocumentTitle('Categories');
  const { notify } = useToast();
  const { categories, loading, error, reload } = useCategories();
  const [editor, setEditor] = useState<Editor>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const handleSave = async (values: { name: string; color: string }) => {
    if (editor?.mode === 'edit') {
      await categoriesApi.update(editor.category.id, values);
      notify('Category updated');
    } else {
      await categoriesApi.create(values);
      notify('Category added');
    }
    setEditor(null);
    reload();
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await categoriesApi.remove(toDelete.id);
      notify('Category deleted');
      reload();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Categories</h1>
          <p className="page__subtitle">Organise your expenses and budgets.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditor({ mode: 'create' })}>
          <Icon name="plus" size={18} /> Add category
        </button>
      </header>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && !categories.length ? (
        <Spinner />
      ) : (
        <ul className="category-grid">
          {categories.map((c) => (
            <li key={c.id} className="card category-card">
              <span className="category-card__swatch" style={{ background: c.color }} aria-hidden="true" />
              <div className="category-card__text">
                <strong>{c.name}</strong>
                <span className="muted">
                  {c.expenseCount} expense{c.expenseCount === 1 ? '' : 's'}
                </span>
              </div>
              <button type="button" className="icon-button" onClick={() => setEditor({ mode: 'edit', category: c })} aria-label={`Edit ${c.name}`}>
                <Icon name="edit" size={18} />
              </button>
              <button
                type="button"
                className="icon-button icon-button--danger"
                onClick={() => setToDelete(c)}
                disabled={c.expenseCount > 0}
                title={c.expenseCount > 0 ? 'Categories with expenses cannot be deleted' : undefined}
                aria-label={`Delete ${c.name}`}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editor !== null} title={editor?.mode === 'edit' ? 'Edit category' : 'New category'} onClose={() => setEditor(null)}>
        {editor && (
          <CategoryForm initial={editor.mode === 'edit' ? editor.category : undefined} onSubmit={handleSave} onCancel={() => setEditor(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete category?"
        message={toDelete ? `"${toDelete.name}" and its budgets will be deleted.` : ''}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
