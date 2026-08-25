import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '../services/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API client', () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it('listProjects calls GET /api/projects', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    const result = await api.listProjects();
    expect(mockFetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(result).toEqual([]);
  });

  it('createProject calls POST /api/projects', async () => {
    const mockProject = { id: 'p1', title: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProject),
    });
    const result = await api.createProject({ title: 'Test' });
    expect(mockFetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Test' }),
    }));
    expect(result).toEqual(mockProject);
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: () => Promise.resolve({ detail: 'Project not found' }),
    });
    await expect(api.getProject('bad-id')).rejects.toThrow('Project not found');
  });
});
