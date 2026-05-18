import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-3 leading-snug" style={{ color: '#111827' }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mb-2 mt-4 border-l-3 pl-2 leading-snug" style={{ color: '#111827', borderColor: '#1B6EF3' }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1.5 mt-3 leading-snug" style={{ color: '#24364A' }}>{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm mb-2.5 leading-7" style={{ color: '#1F2329' }}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold" style={{ color: '#1F2329' }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic" style={{ color: '#5A5A5A' }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul className="list-disc pl-5 mb-3 space-y-1 text-sm">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-7 pl-1" style={{ color: '#1F2329' }}>{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote
            className="pl-3 my-2 text-sm italic"
            style={{
              borderLeft: '3px solid #1B6EF3',
              color: '#5A5A5A',
              backgroundColor: 'rgba(27,110,243,0.04)',
              padding: '8px 12px',
              borderRadius: '0 8px 8px 0',
            }}
          >
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] text-xs border-collapse overflow-hidden" style={{ boxShadow: '0 8px 20px rgba(15,23,42,0.05)' }}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead style={{ backgroundColor: '#EDF3F8' }}>{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2.5 text-left font-semibold border-b whitespace-nowrap" style={{ borderColor: '#D7DEE8', color: '#24364A' }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b align-top leading-6" style={{ borderColor: '#E8EDF4', color: '#465568' }}>
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
