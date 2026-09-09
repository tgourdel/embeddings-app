import { createBrowserRouter, RouterProvider, NavLink, Outlet, Link } from 'react-router';
import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  useIsMobile,
} from '@databricks/appkit-ui/react';
import { Menu, Sparkles, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { EmbedPage } from './pages/embed/EmbedPage';
import { ComparePage } from './pages/compare/ComparePage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

type NavLinkClassFn = (props: { isActive: boolean }) => string;

function NavLinks({
  className,
  linkClass,
  onClick,
}: {
  className?: string;
  linkClass: NavLinkClassFn;
  onClick?: () => void;
}) {
  return (
    <nav className={className}>
      <NavLink to="/" end className={linkClass} onClick={onClick}>
        Home
      </NavLink>
      <NavLink to="/embed" className={linkClass} onClick={onClick}>
        Embed
      </NavLink>
      <NavLink to="/compare" className={linkClass} onClick={onClick}>
        Compare
      </NavLink>
    </nav>
  );
}

function Layout() {
  const isMobile = useIsMobile();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-4 border-b px-4 py-3 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: '#FF3621' }}>
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-lg font-semibold text-foreground">Embeddings Playground</span>
        </Link>
        <NavLinks className="hidden gap-1 md:flex" linkClass={navLinkClass} />
        {isMobile && (
          <div className="ml-auto">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <NavLinks
                  className="flex flex-col gap-1"
                  linkClass={mobileNavLinkClass}
                  onClick={() => setMobileNavOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/embed', element: <EmbedPage /> },
      { path: '/compare', element: <ComparePage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

function HomePage() {
  return (
    <div className="mx-auto mt-6 w-full max-w-3xl space-y-8">
      <div className="space-y-3 text-center">
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: '#0B2026' }}
        >
          Databricks Foundation Models
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Turn text into vectors</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          This app calls the <code className="rounded bg-muted px-1.5 py-0.5 text-sm">databricks-gte-large-en</code>{' '}
          embedding endpoint through the AppKit authenticated serving proxy — no keys, no SDK wiring.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FeatureCard
          to="/embed"
          icon={<Sparkles className="h-5 w-5" style={{ color: '#FF3621' }} />}
          title="Embed text"
          body="Generate a 1024-dimensional vector for any text and inspect it — dimensions, norm, and a color fingerprint."
        />
        <FeatureCard
          to="/compare"
          icon={<ArrowLeftRight className="h-5 w-5" style={{ color: '#FF3621' }} />}
          title="Compare two texts"
          body="Measure cosine similarity between two texts — the core operation behind semantic search and RAG."
        />
      </div>

      <Card>
        <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How it works</p>
          <p>
            The reusable <code className="rounded bg-muted px-1 py-0.5">embedTexts()</code> helper in{' '}
            <code className="rounded bg-muted px-1 py-0.5">server/embeddings.ts</code> wraps the serving plugin{' '}
            <code className="rounded bg-muted px-1 py-0.5">invoke()</code> call, so credentials and workspace wiring are
            handled for you. Drop it into any AppKit app to generate embeddings for search, clustering, or RAG.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({ to, icon, title, body }: { to: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link to={to} className="group">
      <Card className="h-full transition-colors group-hover:border-foreground/20">
        <CardContent className="space-y-2 pt-6">
          <div className="flex items-center justify-between">
            {icon}
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
