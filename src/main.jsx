import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'

// ── Fallback helpers ──────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('app-fallback-msg');
  const fb = document.getElementById('app-fallback');
  if (el) el.textContent = msg;
  if (fb) fb.style.display = 'flex';
}

// Capture console.error / console.warn so they surface in the fallback
// when the app is stuck loading (before React mounts).
const _origError = console.error.bind(console);
const _origWarn  = console.warn.bind(console);
let _appMounted = false;
console.error = (...args) => {
  _origError(...args);
  if (!_appMounted) showError('console.error: ' + args.map(String).join(' '));
};
console.warn = (...args) => {
  _origWarn(...args);
  // Only surface warns that look like real errors (not routine API fallbacks)
  if (!_appMounted && String(args[0]).toLowerCase().includes('error')) {
    showError('console.warn: ' + args.map(String).join(' '));
  }
};

// ── Service worker ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'SW_RELOAD') {
      // New SW activated and claimed this client — reload to get fresh HTML.
      window.location.reload();
    }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ── Timeout: show error if app hasn't mounted within 8s ──────
const _loadTimeout = setTimeout(() => {
  if (!_appMounted) showError('Timed out loading app. Check network or try a hard refresh.');
}, 8000);

// ── Error boundary ────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui', background: '#111620', minHeight: '100vh' }}>
          <div style={{ color: '#C45A4A', fontWeight: 700, marginBottom: 12 }}>Something went wrong</div>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: '#E4DED2', marginBottom: 16 }}>
            {this.state.error.message}{'\n'}{this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Boot ──────────────────────────────────────────────────────
// Dynamic import so module-level errors in App.jsx are catchable.
import('./App.jsx')
  .then(({ default: PrecisApp }) => {
    const root = document.getElementById('root');
    createRoot(root).render(
      <StrictMode>
        <ErrorBoundary>
          <PrecisApp />
        </ErrorBoundary>
      </StrictMode>,
    );
    _appMounted = true;
    clearTimeout(_loadTimeout);
    // Restore console after mount
    console.error = _origError;
    console.warn  = _origWarn;
  })
  .catch(err => {
    clearTimeout(_loadTimeout);
    showError('Failed to load app: ' + err.message + '\n' + (err.stack || ''));
  });
