import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class RenderGuard extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || '未知渲染错误',
    };
  }

  componentDidCatch(error: Error) {
    console.error(`[RenderGuard:${this.props.title}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="bg-white rounded-lg border border-red-200 px-4 py-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
        >
          <div className="text-sm font-semibold mb-1" style={{ color: '#DC2626' }}>
            {this.props.title} 渲染失败
          </div>
          <div className="text-xs leading-relaxed" style={{ color: '#8F1D1D' }}>
            {this.state.errorMessage}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
