import { type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

function flattenText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return flattenText((children as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

function getHeadingTone(text: string) {
  if (/作战总览|重点速览|先抓|核心判断/.test(text)) {
    return { bg: '#EFF6FF', border: '#1B6EF3', color: '#0F3A7A', label: '重点' };
  }
  if (/马上做什么|行动|下一步/.test(text)) {
    return { bg: '#F0FDF4', border: '#16A34A', color: '#14532D', label: '行动' };
  }
  if (/话术|表达|开场|收官/.test(text)) {
    return { bg: '#FFFBEB', border: '#F59E0B', color: '#78350F', label: '话术' };
  }
  if (/依据|知识|方法论|来源/.test(text)) {
    return { bg: '#F8FAFC', border: '#94A3B8', color: '#334155', label: '依据' };
  }
  return { bg: '#F8FAFC', border: '#1B6EF3', color: '#111827', label: null };
}

function tableText(children: ReactNode) {
  return flattenText(children).replace(/\s+/g, '');
}

function getTableTone(children: ReactNode) {
  const text = tableText(children);
  if (/客户|当前商机|核心目标|关键联系人|风险|阶段/.test(text)) {
    return {
      bg: '#F8FBFF',
      border: '#93C5FD',
      header: '#DBEAFE',
      headerText: '#1E3A8A',
      firstCol: '#EFF6FF',
      accent: '#1B6EF3',
    };
  }
  if (/优先级|重点|你要盯什么|顺序|动作|交付物|判断标准/.test(text)) {
    return {
      bg: '#F7FDF9',
      border: '#86EFAC',
      header: '#DCFCE7',
      headerText: '#14532D',
      firstCol: '#F0FDF4',
      accent: '#16A34A',
    };
  }
  if (/场景|话术|目的|收官|开场/.test(text)) {
    return {
      bg: '#FFFCF2',
      border: '#FCD34D',
      header: '#FEF3C7',
      headerText: '#78350F',
      firstCol: '#FFFBEB',
      accent: '#F59E0B',
    };
  }
  return {
    bg: '#FFFFFF',
    border: '#CBD5E1',
    header: '#EAF2FF',
    headerText: '#1E3A8A',
    firstCol: '#F8FAFC',
    accent: '#1B6EF3',
  };
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-3 leading-snug" style={{ color: '#0F172A' }}>{children}</h1>
        ),
        h2: ({ children }) => {
          const text = flattenText(children);
          const tone = getHeadingTone(text);
          return (
            <h2
              className="mb-2 mt-4 flex items-center gap-2 rounded-lg border-l-4 px-3 py-2 text-base font-semibold leading-snug"
              style={{ backgroundColor: tone.bg, borderColor: tone.border, color: tone.color }}
            >
              {tone.label && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: '#FFFFFF', color: tone.border }}
                >
                  {tone.label}
                </span>
              )}
              <span>{children}</span>
            </h2>
          );
        },
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1.5 mt-3 leading-snug" style={{ color: '#1E3A8A' }}>{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm mb-2 leading-6" style={{ color: '#1F2329' }}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold rounded px-0.5" style={{ color: '#0F172A', backgroundColor: 'rgba(27,110,243,0.08)' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic" style={{ color: '#5A5A5A' }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 space-y-1.5 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 space-y-1.5 text-sm [counter-reset:item]">{children}</ol>
        ),
        li: ({ children, ordered }) => ordered ? (
          <li
            className="list-decimal ml-5 rounded-lg px-2 py-1.5 leading-6"
            style={{ color: '#1F2329', backgroundColor: '#F8FAFC' }}
          >
            {children}
          </li>
        ) : (
          <li className="flex gap-2 rounded-lg px-2 py-1.5 leading-6" style={{ color: '#1F2329', backgroundColor: '#F8FAFC' }}>
            <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: '#1B6EF3' }} />
            <span>{children}</span>
          </li>
        ),
        blockquote: ({ children }) => (
          <blockquote
            className="pl-3 my-2 text-sm"
            style={{
              borderLeft: '4px solid #F59E0B',
              color: '#78350F',
              backgroundColor: '#FFFBEB',
              padding: '10px 12px',
              borderRadius: '8px',
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => {
          const tone = getTableTone(children);
          return (
          <div
            className="overflow-x-auto my-3 rounded-xl border"
            style={{
              borderColor: tone.border,
              backgroundColor: tone.bg,
              boxShadow: '0 12px 28px rgba(15,23,42,0.08)',
            }}
          >
            <table
              className="w-full min-w-[420px] text-xs border-collapse overflow-hidden"
              style={{
                ['--table-header-bg' as string]: tone.header,
                ['--table-header-text' as string]: tone.headerText,
                ['--table-first-col-bg' as string]: tone.firstCol,
                ['--table-accent' as string]: tone.accent,
              }}
            >
              {children}
            </table>
          </div>
          );
        },
        thead: ({ children }) => (
          <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-left font-semibold border-b whitespace-nowrap" style={{ borderColor: '#D7DEE8', color: 'var(--table-header-text)' }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2.5 border-b align-top leading-6 first:font-semibold first:whitespace-nowrap" style={{ borderColor: '#E8EDF4', color: '#334155' }}>
            {children}
          </td>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-gray-50">{children}</tr>
        ),
        hr: () => <hr className="my-3 border-gray-200" />,
        a: ({ children, href }) => (
          <a href={href} className="underline" style={{ color: '#1B6EF3' }} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code
                className="px-1 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'rgba(27,110,243,0.08)', color: '#1B6EF3' }}
              >
                {children}
              </code>
            );
          }
          return (
            <code className="block p-3 rounded-lg text-xs font-mono my-2 overflow-x-auto" style={{ backgroundColor: '#1F2329', color: '#E5E7EB' }}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
