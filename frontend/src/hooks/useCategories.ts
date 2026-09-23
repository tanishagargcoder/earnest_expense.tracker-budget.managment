import { categoriesApi } from '../api/endpoints';
import { useAsync } from './useAsync';

export function useCategories() {
  const { data, loading, error, reload } = useAsync(() => categoriesApi.list(), []);
  return { categories: data ?? [], loading, error, reload };
}
