import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'

function showError(msg) {
  const el = document.getElementById('app-fallback-msg');
  const fb = document.getElementById('app-fallback');
  if (el) el.textContent = msg;
  if (fb) fb.style.display = 'flex';
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

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
        <div style={{ padding: 32, fontFamily: 'system-ui', color: '#c00', background: '#111620', minHeight: '100vh' }}>
          <strong>Something went wrong.</strong>
          <pre style={{ marginTop: 12, fontSize: 12, whiteSpace: 'pre-wrap', color: '#E4DED2' }}>
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Use dynamic import so module-level errors in App.jsx are catchable
import('./App.jsx').then(({ default: PrecisApp }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary>
        <PrecisApp />
      </ErrorBoundary>
    </StrictMode>,
  );
}).catch(err => {
  showError('Load error: ' + err.message + '\n' + (err.stack || ''));
});
