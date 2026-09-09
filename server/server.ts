import { createApp, server, serving } from '@databricks/appkit';
import { z } from 'zod';
import { cosineSimilarity, embedTexts, type EmbeddingRequest } from './embeddings';

const similarityRequest = z.object({
  textA: z.string().trim().min(1, 'textA is required'),
  textB: z.string().trim().min(1, 'textB is required'),
});

createApp({
  plugins: [server(), serving()],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      /**
       * Custom computation route: embed two texts with the reusable helper
       * and return their cosine similarity. Plain embedding generation goes
       * through the serving plugin's built-in `/api/serving/invoke` (the
       * frontend uses the `useServingInvoke` hook) — we only add a custom
       * route here because the similarity math is server-side logic the
       * serving plugin doesn't provide.
       */
      app.post('/api/embeddings/similarity', async (req, res) => {
        const parsed = similarityRequest.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
          return;
        }
        const { textA, textB } = parsed.data;

        try {
          // Run the embedding endpoint as the requesting user (OBO) so the
          // per-user CAN_QUERY grant on the endpoint is enforced.
          const invoke = (body: EmbeddingRequest) => appkit.serving().asUser(req).invoke(body);
          const [vectorA, vectorB] = await embedTexts(invoke, [textA, textB]);

          res.json({
            similarity: cosineSimilarity(vectorA, vectorB),
            dimensions: vectorA.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to generate embeddings';
          res.status(502).json({ error: message });
        }
      });
    });
  },
}).catch(console.error);
