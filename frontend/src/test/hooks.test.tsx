import { act, renderHook, waitFor } from '@testing-library/react';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('only updates after the value settles', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: 'a' } });
    rerender({ value: 'ab' });
    rerender({ value: 'abc' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('abc');
  });
});

describe('useAsync', () => {
  it('exposes data and loading state', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve(42), []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('ignores responses from outdated requests', async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const { result, rerender } = renderHook(
      ({ key }) => useAsync(() => new Promise<string>((resolve) => (resolvers[key] = resolve)), [key]),
      { initialProps: { key: 'first' } },
    );
    rerender({ key: 'second' });
    await act(async () => resolvers.second('second result'));
    await act(async () => resolvers.first('stale result'));
    expect(result.current.data).toBe('second result');
  });

  it('reports errors and reloads', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('Nope')).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useAsync(fn, []));
    await waitFor(() => expect(result.current.error).toBe('Nope'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
