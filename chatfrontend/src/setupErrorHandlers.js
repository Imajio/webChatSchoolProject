// Basic dev-time error logging without fullscreen overlays
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Avoid noisy logs from extension scripts
    const src = (event && event.filename) || '';
    if (src && /chrome-extension:|moz-extension:/.test(src)) return;
    // eslint-disable-next-line no-console
    console.error('[App Error]', event.error || event.message || event);
  });

  window.addEventListener('unhandledrejection', (event) => {
    // eslint-disable-next-line no-console
    console.error('[Unhandled Promise Rejection]', event && event.reason);
  });
}

