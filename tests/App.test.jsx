// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from '../src/App.jsx';
import { SAMPLE_DOCS } from '../src/lib/sampleDocs.js';

afterEach(() => cleanup());

describe('App (demo mode)', () => {
  it('renders the Kagaz header, demo banner, and Nano status', async () => {
    render(<App />);
    expect(screen.getByText('Kagaz')).toBeInTheDocument();
    expect(screen.getByText(/No Firebase config is present/)).toBeInTheDocument();
    expect(screen.getByText(/Demo mode · no Firebase config/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Nano: unsupported/)).toBeInTheDocument();
    });
  });

  it('loads a sample document and runs the full pipeline in demo mode', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Sample: Job offer letter'));
    const textarea = screen.getByPlaceholderText(/Paste your document here/);
    expect(textarea.value).toContain('OFFER OF EMPLOYMENT');

    fireEvent.click(screen.getByText('Redact & analyse'));

    await waitFor(() => {
      expect(screen.getByText(/9 items redacted/)).toBeInTheDocument();
    });
    // Engine chips show the demo engine.
    expect(screen.getAllByText(/Demo · local stub/).length).toBeGreaterThanOrEqual(2);
    // No original secret is visible in the redacted view (the input box
    // still holds the original — that is local state, not a model payload).
    const pre = document.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre.textContent).not.toContain('aarav.sharma@example.com');
    expect(pre.textContent).toContain('[EMAIL_1]');
    // Findings counts are shown.
    expect(screen.getByText(/EMAIL: 2/)).toBeInTheDocument();
    // Dossier section rendered.
    expect(screen.getByText('4 · Dossier')).toBeInTheDocument();
    expect(screen.getByText(/Checklist/)).toBeInTheDocument();
  });

  it('shows the original/restore toggle only after a run', async () => {
    render(<App />);
    expect(screen.queryByText(/Show original/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Sample: Visa invitation letter'));
    fireEvent.click(screen.getByText('Redact & analyse'));
    await waitFor(() => {
      expect(screen.getByText(/Show original/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Show original/));
    expect(screen.getByText(/Show redacted/)).toBeInTheDocument();
  });
});
