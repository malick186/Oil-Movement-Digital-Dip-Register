import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import { useAuthStore } from '../store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('should start with no authenticated user', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should login successfully', async () => {
    const mockUser = {
      user_id: 1,
      username: 'admin',
      full_name: 'Administrator',
      role: 'Administrator',
    };
    mockInvoke.mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().login('admin', 'admin123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBeNull();
  });

  it('should handle login failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().login('bad', 'wrong')
    ).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('should logout and clear state', async () => {
    useAuthStore.setState({
      user: { user_id: 1, username: 'admin', full_name: 'Admin', role: 'Administrator' },
      isAuthenticated: true,
    });
    mockInvoke.mockResolvedValueOnce(undefined);

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should clear error', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
