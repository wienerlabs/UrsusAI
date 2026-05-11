import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
// Vite's `?raw` import loads the file as a string at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Vite handles this import at build time; types may not be picked up locally.
import changelogRaw from '../../../../UI_CHANGELOG.md?raw';

interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  status: string;
  body: string;
}

// Parse the markdown into structured entries. Each entry header matches the
// pattern: `## [YYYY-MM-DD] #N Title (Status)`.
function parseChangelog(raw: string): ChangelogEntry[] {
  const lines = raw.split(/\r?\n/);
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+\[([^\]]+)\]\s+(.+?)\s*$/);
    if (headerMatch) {
      if (current) entries.push(current);
      const date = headerMatch[1];
      let titleRest = headerMatch[2];
      let status = '';
      const statusMatch = titleRest.match(/\(([^)]+)\)\s*$/);
      if (statusMatch) {
        status = statusMatch[1];
        titleRest = titleRest.slice(0, statusMatch.index).trim();
      }
      current = {
        id: `${date}-${titleRest}`,
        date,
        title: titleRest,
        status,
        body: '',
      };
      continue;
    }

    if (current) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        // Next top-level heading — flush and stop collecting for current.
        entries.push(current);
        current = null;
        continue;
      }
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) entries.push(current);

  // Newest first.
  return entries.reverse();
}

function statusBadgeClasses(status: string): string {
  const lower = status.toLowerCase();
  if (lower.includes('onay') || lower.includes('approved')) {
    return 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30';
  }
  if (lower.includes('bekli') || lower.includes('pending')) {
    return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30';
  }
  if (lower.includes('geri') || lower.includes('revert')) {
    return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30';
  }
  return 'bg-[#2a2a2a] text-[#a0a0a0] border-[#3a3a3a]';
}

// Strip markdown formatting for a short preview.
function plainPreview(body: string, maxLen = 200): string {
  const stripped = body
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen) + '…';
}

export function ChangelogSection() {
  const entries = useMemo(() => parseChangelog(String(changelogRaw || '')), []);
  const [modalOpen, setModalOpen] = useState(false);

  // Lock background scroll while modal is open + ESC to close.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  const preview = entries.slice(0, 3);

  return (
    <>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#d8e9ea] to-[#b8d4d6] rounded-lg">
              <Sparkles size={16} className="text-black" />
            </div>
            <h3 className="text-white font-semibold">What's New</h3>
          </div>
          {entries.length > preview.length && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[#d8e9ea] hover:text-white text-sm transition-colors"
            >
              View all ({entries.length})
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {preview.length === 0 ? (
          <p className="text-[#a0a0a0] text-sm">No changelog entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {preview.map((entry) => (
              <li
                key={entry.id}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-[#a0a0a0] text-xs mb-1">{entry.date}</div>
                    <h4 className="text-white font-medium text-sm">{entry.title}</h4>
                  </div>
                  {entry.status && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border whitespace-nowrap ${statusBadgeClasses(entry.status)}`}
                    >
                      {entry.status}
                    </span>
                  )}
                </div>
                <p className="text-[#a0a0a0] text-xs leading-relaxed line-clamp-2">
                  {plainPreview(entry.body)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Full changelog"
        >
          <div
            className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h3 className="text-white text-lg font-semibold">Changelog</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="Close changelog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {entries.map((entry) => (
                <article
                  key={entry.id}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[#a0a0a0] text-xs mb-1">{entry.date}</div>
                      <h4 className="text-white font-semibold">{entry.title}</h4>
                    </div>
                    {entry.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border whitespace-nowrap ${statusBadgeClasses(entry.status)}`}
                      >
                        {entry.status}
                      </span>
                    )}
                  </div>
                  <pre className="text-[#a0a0a0] text-xs leading-relaxed whitespace-pre-wrap font-sans">
                    {entry.body.trim()}
                  </pre>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChangelogSection;
