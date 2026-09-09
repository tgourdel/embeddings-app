import { useState } from 'react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Spinner,
  Textarea,
} from '@databricks/appkit-ui/react';
import { useServingInvoke } from '@databricks/appkit-ui/react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { VectorFingerprint } from '@/components/VectorFingerprint';

const EXAMPLES = [
  'The lakehouse unifies data warehousing and AI on one platform.',
  'A golden retriever bounding across a sunny beach.',
  'Quarterly revenue grew 24% year over year.',
];

function l2Norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

export function EmbedPage() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const { invoke, data, loading, error } = useServingInvoke({ input: [] as string[] });

  const vector = data?.data?.[0]?.embedding ?? null;

  function handleGenerate() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setCopied(false);
    void invoke({ input: [trimmed] });
  }

  async function handleCopy() {
    if (!vector) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(vector));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Embed text</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn any text into a dense vector with{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">databricks-gte-large-en</code>, a Databricks
          Foundation Model.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
          <CardDescription>Type or paste text, then generate its embedding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. The lakehouse unifies data warehousing and AI on one platform."
            rows={4}
            className="resize-none"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleGenerate();
            }}
          />

          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {example.length > 42 ? `${example.slice(0, 42)}…` : example}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={loading || !text.trim()}>
              {loading ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Generate embedding'}
            </Button>
            <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter</span>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {vector && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Embedding vector</CardTitle>
              <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy vector'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Dimensions" value={vector.length.toLocaleString()} />
              <Stat label="Model" value={data?.model ?? '—'} mono />
              <Stat label="L2 norm" value={l2Norm(vector).toFixed(3)} />
              <Stat label="Tokens" value={String(data?.usage?.total_tokens ?? '—')} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Vector fingerprint — every dimension, colored by value
              </p>
              <div className="overflow-hidden rounded-md border border-border">
                <VectorFingerprint vector={vector} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>negative</span>
                <span>0</span>
                <span>positive</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">First 8 values</p>
              <div className="flex flex-wrap gap-1.5">
                {vector
                  .slice(0, 8)
                  .map((value, i) => ({ value, key: `dim-${i}` }))
                  .map((item) => (
                    <Badge key={item.key} variant="secondary" className="font-mono text-xs">
                      {item.value.toFixed(4)}
                    </Badge>
                  ))}
                <Badge variant="outline" className="text-xs">
                  +{vector.length - 8} more
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`truncate text-lg font-semibold text-foreground ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}
