import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Spinner,
  Textarea,
} from '@databricks/appkit-ui/react';
import { ArrowLeftRight } from 'lucide-react';

interface SimilarityResponse {
  similarity: number;
  dimensions: number;
}

const PRESETS: { label: string; a: string; b: string }[] = [
  {
    label: 'Near-synonyms',
    a: 'How do I reset my password?',
    b: 'What are the steps to change my login credentials?',
  },
  {
    label: 'Related topics',
    a: 'The lakehouse combines data warehouses and data lakes.',
    b: 'Delta Lake brings ACID transactions to object storage.',
  },
  {
    label: 'Unrelated',
    a: 'Photosynthesis converts sunlight into chemical energy.',
    b: 'The quarterly budget review is scheduled for Friday.',
  },
];

// Calibrated to databricks-gte-large-en, whose cosine scores sit on a high,
// compressed baseline: ~0.42 for unrelated text up to 1.0 for identical text.
function interpret(score: number): { label: string; tone: string } {
  if (score >= 0.9) return { label: 'Nearly identical meaning', tone: 'text-[#FF3621]' };
  if (score >= 0.72) return { label: 'Strongly related', tone: 'text-[#FF3621]' };
  if (score >= 0.6) return { label: 'Related', tone: 'text-amber-600' };
  if (score >= 0.48) return { label: 'Loosely related', tone: 'text-muted-foreground' };
  return { label: 'Unrelated', tone: 'text-muted-foreground' };
}

export function ComparePage() {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [result, setResult] = useState<SimilarityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCompare() {
    if (!textA.trim() || !textB.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/embeddings/similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textA, textB }),
      });
      const body = (await res.json()) as SimilarityResponse & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      setResult({ similarity: body.similarity, dimensions: body.dimensions });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const pct = result ? Math.max(0, Math.min(100, result.similarity * 100)) : 0;
  const reading = result ? interpret(result.similarity) : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Compare two texts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed both texts and measure their <strong>cosine similarity</strong> — this is what powers semantic search
          and RAG retrieval.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="text-a">Text A</Label>
              <Textarea
                id="text-a"
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="First piece of text…"
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-b">Text B</Label>
              <Textarea
                id="text-b"
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Second piece of text…"
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setTextA(preset.a);
                  setTextB(preset.b);
                  setResult(null);
                }}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Button onClick={() => void handleCompare()} disabled={loading || !textA.trim() || !textB.trim()}>
            {loading ? <Spinner className="h-4 w-4" /> : <ArrowLeftRight className="h-4 w-4" />}
            {loading ? 'Comparing…' : 'Compare'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && reading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cosine similarity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between">
              <span className="font-mono text-5xl font-bold tabular-nums text-foreground">
                {result.similarity.toFixed(3)}
              </span>
              <span className={`text-sm font-medium ${reading.tone}`}>{reading.label}</span>
            </div>

            {/* Similarity meter (0–1 range shown) */}
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: '#FF3621' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.0 · unrelated</span>
              <span>1.0 · identical</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Computed from two {result.dimensions}-dimensional vectors, generated on the server with the reusable{' '}
              <code className="rounded bg-muted px-1 py-0.5">embedTexts()</code> helper. This model has a high
              similarity baseline — unrelated text still scores around 0.4, so read scores relative to each other rather
              than as an absolute 0–1 scale.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
