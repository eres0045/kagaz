import { useCallback, useEffect, useRef, useState } from 'react'
import { runPipeline } from './lib/pipeline.js'
import { probeNano } from './lib/nano.js'
import { restoreRedacted } from './lib/redact.js'
import { MockProvider, FirebaseAIProvider } from './lib/providers.js'
import { SAMPLE_DOCS } from './lib/sampleDocs.js'
import { DOSSIER_PURPOSES, DOSSIER_TONES } from './lib/dossier.js'

const ENGINE_LABEL = {
  'on-device': 'On-device · Gemini Nano',
  cloud: 'Cloud · Gemini Flash',
  demo: 'Demo · local stub',
}

const ENGINE_STYLE = {
  'on-device': 'bg-emerald-100 text-emerald-900 border-emerald-300',
  cloud: 'bg-sky-100 text-sky-900 border-sky-300',
  demo: 'bg-amber-100 text-amber-900 border-amber-300',
}

function EngineChip({ engine, source }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ENGINE_STYLE[engine] ?? ENGINE_STYLE.demo}`}
      title={source ? `Inference source reported by the SDK: ${source}` : undefined}
    >
      {ENGINE_LABEL[engine] ?? engine}
    </span>
  )
}

export default function App() {
  const [docText, setDocText] = useState('')
  const [purpose, setPurpose] = useState('job-application')
  const [tone, setTone] = useState('formal')
  const [extractionMode, setExtractionMode] = useState('prefer-on-device')
  const [showOriginal, setShowOriginal] = useState(false)
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [nano, setNano] = useState({ status: 'checking', detail: 'Checking…' })
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [liveMode, setLiveMode] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    probeNano().then((r) => {
      if (!cancelled) setNano(r)
    })
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    // Live mode = Firebase config present. Imported lazily so demo mode
    // never pays the Firebase bundle cost when it is not configured.
    import('./lib/firebase.js')
      .then((m) => {
        if (!cancelled) setLiveMode(m.hasFirebaseConfig())
      })
      .catch(() => {
        if (!cancelled) setLiveMode(false)
      })
    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const getProvider = useCallback(async () => {
    if (!liveMode) return new MockProvider()
    const fb = await import('./lib/firebase.js')
    const { Schema } = await import('firebase/ai')
    return new FirebaseAIProvider({
      getHybridModel: fb.getHybridModel,
      getCloudModel: fb.getCloudModel,
      Schema,
    })
  }, [liveMode])

  const run = useCallback(
    async (modeOverride) => {
      setError('')
      setResult(null)
      setRunning(true)
      setStep('Starting…')
      try {
        const provider = await getProvider()
        const probe = await probeNano()
        setNano(probe)
        const out = await runPipeline({
          text: docText,
          provider,
          purpose,
          tone,
          extractionMode: modeOverride ?? extractionMode,
          nanoProbe: probe,
          online,
          onStep: (_s, detail) => setStep(detail),
        })
        setResult(out)
      } catch (err) {
        setError(err.message || String(err))
      } finally {
        setRunning(false)
        setStep('')
      }
    },
    [docText, purpose, tone, extractionMode, online, getProvider],
  )

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setDocText(String(reader.result ?? ''))
    reader.readAsText(file)
  }

  const displayedDoc = result
    ? showOriginal
      ? restoreRedacted(result.redactedText, result.findings)
      : result.redactedText
    : docText

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kagaz</h1>
            <p className="text-sm text-zinc-500">
              Offline-first document copilot · Team FORTEC · #BuildHybridAI 2026
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full border px-2.5 py-0.5 font-semibold ${online ? 'border-emerald-300 bg-emerald-100 text-emerald-900' : 'border-red-300 bg-red-100 text-red-900'}`}
            >
              {online ? 'Online' : 'Offline — Wi-Fi off'}
            </span>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 font-semibold" title={nano.detail}>
              Nano: {nano.status}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 font-semibold ${liveMode ? 'border-sky-300 bg-sky-100 text-sky-900' : 'border-amber-300 bg-amber-100 text-amber-900'}`}
            >
              {liveMode ? 'Live · Firebase AI Logic' : 'Demo mode · no Firebase config'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!liveMode && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Demo mode.</strong> No Firebase config is present, so extraction and
            tailoring run on deterministic local stubs — no model is called and no
            data leaves this page. To go live with Gemini Nano + Gemini Flash, follow{' '}
            <code className="rounded bg-amber-100 px-1">FIREBASE_SETUP.md</code> and add a{' '}
            <code className="rounded bg-amber-100 px-1">.env</code> file.
          </div>
        )}

        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-2 text-lg font-semibold">1 · Your document</h2>
          <p className="mb-3 text-sm text-zinc-500">
            Paste text or upload a .txt / .md file. Personal data is redacted
            on this device <em>before</em> any model sees the document — the
            cloud leg only ever receives redacted text.
          </p>
          <textarea
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={10}
            placeholder="Paste your document here — offer letter, invitation letter, contract…"
            className="w-full rounded-lg border border-zinc-300 p-3 font-mono text-sm focus:border-zinc-500 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-100"
            >
              Upload .txt / .md
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={onFile} />
            {SAMPLE_DOCS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDocText(d.text)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-100"
              >
                {d.title}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Dossier purpose</span>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5"
              >
                {Object.entries(DOSSIER_PURPOSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tone</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5"
              >
                {Object.entries(DOSSIER_TONES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Extraction engine</span>
              <select
                value={extractionMode}
                onChange={(e) => setExtractionMode(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5"
              >
                <option value="prefer-on-device">Prefer on-device (Nano, cloud fallback)</option>
                <option value="on-device-only">On-device only (no cloud fallback)</option>
                <option value="cloud-only">Cloud only</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={running || !docText.trim()}
              onClick={() => run()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {running ? 'Working…' : 'Redact & analyse'}
            </button>
            <button
              type="button"
              disabled={running || !docText.trim()}
              onClick={() => run('on-device-only')}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40"
              title="Runs extraction with Gemini Nano only. Fails honestly if Nano is not ready — this is the Wi-Fi-off demo path."
            >
              Test on-device extraction
            </button>
          </div>
          {running && step && <p className="mt-3 text-sm text-zinc-500">{step}</p>}
          {error && (
            <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {error}
            </div>
          )}
        </section>

        {result && (
          <>
            <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">2 · Redaction</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold">
                  {result.findings.length} item{result.findings.length === 1 ? '' : 's'} redacted
                </span>
                {Object.entries(result.counts).map(([t, n]) => (
                  <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">
                    {t}: {n}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setShowOriginal((v) => !v)}
                  className="ml-auto rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100"
                >
                  {showOriginal ? 'Show redacted' : 'Show original (local only)'}
                </button>
              </div>
              <p className="mb-2 text-xs text-zinc-500">
                {showOriginal
                  ? 'Original values are restored from the in-memory map on this device only. They are never sent to any model.'
                  : 'This is what any model sees. Placeholders stay on this device; the originals never leave it.'}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 font-mono text-sm">
                {displayedDoc}
              </pre>
            </section>

            <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">3 · Extraction</h2>
                <EngineChip engine={result.extractionEngine} source={result.extractionInferenceSource} />
                <span className="text-xs text-zinc-500">Nano status at run time: {result.nanoStatus}</span>
              </div>
              <p className="mb-2 text-sm">
                <strong>Summary:</strong> {result.extraction.summary}
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Key points', result.extraction.keyPoints],
                  ['Dates', result.extraction.dates],
                  ['Action items', result.extraction.actionItems],
                ].map(([label, items]) => (
                  <div key={label}>
                    <h3 className="text-sm font-semibold">{label}</h3>
                    {items.length ? (
                      <ul className="list-disc pl-5 text-sm">
                        {items.map((it, i) => (
                          <li key={i}>{it}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-500">None found.</p>
                    )}
                  </div>
                ))}
              </div>
              {result.extraction.topics?.length > 0 && (
                <p className="mt-2 text-sm">
                  <strong>Topics:</strong> {result.extraction.topics.join(', ')}
                </p>
              )}
            </section>

            <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">4 · Dossier</h2>
                <EngineChip engine={result.dossierEngine} source="cloud" />
                <span className="text-xs text-zinc-500">
                  Tailored by Gemini Flash from redacted text only.
                </span>
              </div>
              <h3 className="text-base font-semibold">{result.dossier.title}</h3>
              <p className="mb-3 text-sm">{result.dossier.purposeSummary}</p>
              {result.dossier.sections.map((s, i) => (
                <div key={i} className="mb-3">
                  <h4 className="text-sm font-semibold">{s.heading}</h4>
                  <p className="whitespace-pre-line text-sm">{s.body}</p>
                </div>
              ))}
              {result.dossier.checklist.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold">Checklist</h4>
                  <ul className="list-disc pl-5 text-sm">
                    {result.dossier.checklist.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
        )}

        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          <h2 className="mb-1 text-base font-semibold text-zinc-900">How the Wi-Fi-off demo works</h2>
          <ol className="list-decimal pl-5">
            <li>On a machine with Chrome Desktop 139+, enable <code className="rounded bg-zinc-100 px-1">chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code> and restart Chrome.</li>
            <li>Open this app once while online and press “Test on-device extraction” — the first run downloads Gemini Nano.</li>
            <li>Turn Wi-Fi off and press it again: extraction still runs on-device; dossier tailoring (cloud) reports honestly that it needs network.</li>
          </ol>
          <p className="mt-2">
            Honest limits: free-text person names are not redacted unless labelled
            (“Name: …”); the on-device leg is unverified on the dev VM and must be
            confirmed on a real laptop Chrome before the demo video is recorded.
          </p>
        </section>
      </main>
    </div>
  )
}
