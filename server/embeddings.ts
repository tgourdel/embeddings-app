/**
 * Reusable embedding helpers.
 *
 * These wrap a Databricks Foundation Model **embedding** endpoint
 * (e.g. `databricks-gte-large-en`) that is exposed through AppKit's
 * `serving()` plugin. The plugin proxies the call through the app's
 * authenticated Databricks workspace client, so nothing here needs to
 * know about tokens, hosts, or SDK wiring — it just needs an `invoke`
 * function shaped like the serving handle's `invoke`.
 *
 * Wire it up in `server/server.ts` like:
 *
 *   const invoke = (body: EmbeddingRequest) =>
 *     appkit.serving().asUser(req).invoke(body);
 *   const [vector] = await embedTexts(invoke, ["hello world"]);
 */
import { z } from 'zod';

/** Request body accepted by a Databricks embedding endpoint. */
export interface EmbeddingRequest {
  input: string[];
}

/**
 * Any function that takes an embedding request and resolves to the raw
 * endpoint response. `appkit.serving().invoke` (and its `.asUser(req)`
 * variant) satisfy this shape, which keeps these helpers decoupled from
 * AppKit internals and trivially unit-testable with a stub.
 */
export type EmbeddingInvoke = (body: EmbeddingRequest) => Promise<unknown>;

/**
 * Databricks embedding endpoints return the OpenAI-compatible embeddings
 * shape. We validate it with Zod rather than casting so a malformed or
 * unexpected response fails loudly instead of producing garbage vectors.
 */
const EmbeddingResponseSchema = z.object({
  model: z.string().optional(),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .nullish(),
  data: z.array(
    z.object({
      index: z.number().optional(),
      embedding: z.array(z.number()),
    })
  ),
});

export type EmbeddingUsage = z.infer<typeof EmbeddingResponseSchema>['usage'];

/**
 * AppKit's programmatic `serving().invoke()` resolves to an `ExecutionResult`
 * envelope (`{ ok: true, data }` on success, `{ ok: false, ... }` on failure)
 * rather than the raw endpoint body — unlike the built-in HTTP route, which
 * unwraps it for you. This schema lets the helper accept either shape so it
 * works whether it's handed a wrapped result or a plain response.
 */
const ExecutionResultSchema = z.union([
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({ ok: z.literal(false), status: z.number().optional(), message: z.string().optional() }),
]);

/** Unwrap an ExecutionResult envelope if present; otherwise return as-is. */
function unwrapExecutionResult(raw: unknown): unknown {
  const envelope = ExecutionResultSchema.safeParse(raw);
  if (!envelope.success) return raw; // already a plain response
  if (envelope.data.ok) return envelope.data.data;
  throw new Error(envelope.data.message ?? `Serving request failed (status ${envelope.data.status ?? 'unknown'})`);
}

/** Vectors plus the metadata the endpoint reports alongside them. */
export interface EmbeddingResult {
  /** One vector per input text, in the same order as the input. */
  vectors: number[][];
  /** Model name reported by the endpoint (e.g. `gte-large-en-v1.5`). */
  model?: string;
  /** Token accounting reported by the endpoint. */
  usage?: EmbeddingUsage;
}

/**
 * Generate an embedding vector for each input string.
 *
 * @param invoke  A serving-endpoint invoke function (see {@link EmbeddingInvoke}).
 * @param texts   Non-empty strings to embed.
 * @returns       Vectors ordered to match `texts`, plus model/usage metadata.
 */
export async function embedTextsDetailed(invoke: EmbeddingInvoke, texts: string[]): Promise<EmbeddingResult> {
  if (texts.length === 0) return { vectors: [] };

  const raw = await invoke({ input: texts });
  const parsed = EmbeddingResponseSchema.parse(unwrapExecutionResult(raw));

  // The endpoint tags each row with its `index`; sort by it so the
  // returned vectors always line up with the input order.
  const vectors = [...parsed.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map((row) => row.embedding);

  return { vectors, model: parsed.model, usage: parsed.usage };
}

/** Convenience wrapper returning just the vectors. */
export async function embedTexts(invoke: EmbeddingInvoke, texts: string[]): Promise<number[][]> {
  const { vectors } = await embedTextsDetailed(invoke, texts);
  return vectors;
}

/** Embed a single string and return its vector. */
export async function embedOne(invoke: EmbeddingInvoke, text: string): Promise<number[]> {
  const [vector] = await embedTexts(invoke, [text]);
  if (!vector) throw new Error('Embedding endpoint returned no vector');
  return vector;
}

/**
 * Cosine similarity between two equal-length vectors, in [-1, 1].
 * 1 = identical direction, 0 = orthogonal, -1 = opposite.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
