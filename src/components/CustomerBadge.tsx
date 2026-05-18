interface Props {
  level: 'S' | 'A' | 'B' | 'C';
  size?: 'sm' | 'md';
}

const levelConfig = {
  S: { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' },
  A: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  B: { bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0' },
  C: { bg: '#F3F4F6', color: '#7B8794', border: '#E5E7EB' },
};

export default function CustomerBadge({ level, size = 'sm' }: Props) {
  const config = levelConfig[level];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded ${sizeClass}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {level}级
    </span>
  );
}
