import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'sans-serif' }}>
          <h2>Ein Fehler ist aufgetreten! (Crash)</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <button onClick={() => {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                registration.unregister();
              }
              window.location.reload();
            });
          }} style={{ padding: 10, marginTop: 10 }}>Cache leeren und Neustarten</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
