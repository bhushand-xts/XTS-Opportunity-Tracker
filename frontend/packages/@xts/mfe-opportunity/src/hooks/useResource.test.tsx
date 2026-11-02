import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useResource } from './useResource';

afterEach(cleanup);
type Read = (signal: AbortSignal) => Promise<string>;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

it('retains search results while fetching within a queue and ignores an older search response', async () => {
  const first = deferred<string>(), second = deferred<string>(), latest = deferred<string>();
  const load = vi.fn(() => first.promise);
  const hook = renderHook(({ read }: { read: Read }) => useResource(read, true, 0, 'user-7:PIPELINE'), { initialProps: { read: load } });
  await act(async () => first.resolve('Initial results'));
  expect(hook.result.current.data).toBe('Initial results');
  hook.rerender({ read: vi.fn(() => second.promise) });
  expect(hook.result.current.data).toBe('Initial results');
  expect(hook.result.current.loading).toBe(false);
  expect(hook.result.current.refreshing).toBe(true);
  hook.rerender({ read: vi.fn(() => latest.promise) });
  await act(async () => latest.resolve('Latest results'));
  await act(async () => second.resolve('Outdated results'));
  expect(hook.result.current.data).toBe('Latest results');
  expect(hook.result.current.refreshing).toBe(false);
});

it('clears retained results when the permitted queue changes or access is revoked', async () => {
  const first = deferred<string>(), second = deferred<string>();
  const hook = renderHook(({ read, key, enabled }: { read: Read; key: string; enabled: boolean }) => useResource(read, enabled, 0, key), {
    initialProps: { read: vi.fn(() => first.promise), key: 'user-7:PIPELINE', enabled: true },
  });
  await act(async () => first.resolve('Pipeline results'));
  hook.rerender({ read: vi.fn(() => second.promise), key: 'user-7:MY_APPROVALS', enabled: true });
  expect(hook.result.current.data).toBeUndefined();
  expect(hook.result.current.loading).toBe(true);
  await act(async () => second.resolve('Approval results'));
  expect(hook.result.current.data).toBe('Approval results');
  hook.rerender({ read: vi.fn(() => second.promise), key: 'user-7:MY_APPROVALS', enabled: false });
  expect(hook.result.current.data).toBeUndefined();
  expect(hook.result.current.loading).toBe(false);
  expect(hook.result.current.refreshing).toBe(false);
});

it('keeps the original clear-on-load behavior for resources without an explicit retention key', async () => {
  const first = deferred<string>(), second = deferred<string>();
  const hook = renderHook(({ read }: { read: Read }) => useResource(read), { initialProps: { read: vi.fn(() => first.promise) } });
  await act(async () => first.resolve('First opportunity'));
  hook.rerender({ read: vi.fn(() => second.promise) });
  expect(hook.result.current.data).toBeUndefined();
  expect(hook.result.current.loading).toBe(true);
  await act(async () => second.resolve('Second opportunity'));
});
