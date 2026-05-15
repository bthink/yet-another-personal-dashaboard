'use client';

import type { GraphNode } from '@/lib/graph';

interface NotePreviewProps {
  node: GraphNode;
  content: string | null;
  loading: boolean;
  onClose: () => void;
}

function renderLine(line: string): React.ReactNode {
  const parts = line.split(/(\[\[[^\]\n]+\]\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[\[([^\]\n]+)\]\]$/);
    if (match) {
      const name = match[1].includes('|') ? match[1].split('|')[0] : match[1];
      return (
        <span
          key={i}
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
            borderRadius: '3px',
            padding: '1px 5px',
          }}
        >
          {name}
        </span>
      );
    }
    return part;
  });
}

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div>
      {content.split('\n').map((line, i) => (
        <p key={i} style={{ margin: '2px 0', lineHeight: '1.5' }}>
          {renderLine(line)}
        </p>
      ))}
    </div>
  );
}

export default function NotePreview({ node, content, loading, onClose }: NotePreviewProps) {
  const obsidianHref = `obsidian://open?vault=Bf-vault&file=${encodeURIComponent(
    node.id.replace(/\.md$/, '')
  )}`;

  return (
    <aside
      style={{
        width: '360px',
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--panel)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      aria-label="Note preview"
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.label}
          </p>
          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-3)',
              margin: '2px 0 0',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.id}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close preview"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-3)',
            fontSize: '18px',
            lineHeight: 1,
            padding: '2px 4px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px',
          fontSize: '12px',
          color: 'var(--text-2)',
          fontFamily: 'monospace',
        }}
      >
        {loading && <p style={{ color: 'var(--text-3)', margin: 0 }}>Loading...</p>}
        {!loading && content && <MarkdownPreview content={content} />}
        {!loading && !content && (
          <p style={{ color: 'var(--text-3)', margin: 0 }}>No content</p>
        )}
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
        <a
          href={obsidianHref}
          style={{
            display: 'block',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--accent)',
            textDecoration: 'none',
            padding: '6px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}
        >
          ↗ Open in Obsidian
        </a>
      </div>
    </aside>
  );
}
