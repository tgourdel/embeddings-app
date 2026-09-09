import { describe, it, expect } from 'vitest';
import { cosineSimilarity, embedOne, embedTexts, embedTextsDetailed, type EmbeddingInvoke } from './embeddings';

/** Build a stub invoke that echoes back a canned embeddings response. */
function stubInvoke(vectors: number[][], model = 'gte-large-en-v1.5'): EmbeddingInvoke {
  return () =>
    Promise.resolve({
      object: 'list',
      model,
      usage: { prompt_tokens: 3, total_tokens: 3 },
      data: vectors.map((embedding, index) => ({ index, object: 'embedding', embedding })),
    });
}

describe('embedTexts', () => {
  it('returns one vector per input, preserving order', async () => {
    const invoke = stubInvoke([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    const vectors = await embedTexts(invoke, ['a', 'b']);
    expect(vectors).toEqual([
      [1, 0, 0],
      [0, 1, 0],
    ]);
  });

  it('reorders rows by their reported index', async () => {
    const invoke: EmbeddingInvoke = () =>
      Promise.resolve({
        data: [
          { index: 1, embedding: [2, 2] },
          { index: 0, embedding: [1, 1] },
        ],
      });
    const vectors = await embedTexts(invoke, ['first', 'second']);
    expect(vectors).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('short-circuits on empty input without calling the endpoint', async () => {
    let called = false;
    const invoke: EmbeddingInvoke = () => {
      called = true;
      return Promise.resolve({ data: [] });
    };
    expect(await embedTexts(invoke, [])).toEqual([]);
    expect(called).toBe(false);
  });

  it('throws on a malformed endpoint response', async () => {
    const invoke: EmbeddingInvoke = () => Promise.resolve({ nonsense: true });
    await expect(embedTexts(invoke, ['x'])).rejects.toThrow();
  });

  it('unwraps an ExecutionResult envelope (ok: true)', async () => {
    const invoke: EmbeddingInvoke = () =>
      Promise.resolve({
        ok: true,
        data: { data: [{ index: 0, embedding: [9, 9, 9] }] },
      });
    expect(await embedTexts(invoke, ['x'])).toEqual([[9, 9, 9]]);
  });

  it('throws with the envelope message on ExecutionResult failure (ok: false)', async () => {
    const invoke: EmbeddingInvoke = () => Promise.resolve({ ok: false, status: 403, message: 'PERMISSION_DENIED' });
    await expect(embedTexts(invoke, ['x'])).rejects.toThrow(/PERMISSION_DENIED/);
  });
});

describe('embedTextsDetailed', () => {
  it('surfaces model and usage metadata', async () => {
    const result = await embedTextsDetailed(stubInvoke([[0.1, 0.2]]), ['hi']);
    expect(result.model).toBe('gte-large-en-v1.5');
    expect(result.usage?.total_tokens).toBe(3);
  });
});

describe('embedOne', () => {
  it('returns a single vector', async () => {
    expect(await embedOne(stubInvoke([[0.5, 0.5]]), 'hi')).toEqual([0.5, 0.5]);
  });
});

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1);
  });

  it('returns 0 when a vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('throws on length mismatch', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/length mismatch/i);
  });
});
