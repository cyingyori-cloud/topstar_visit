import { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import TopNav from './components/TopNav';
import VisitTasks from './components/VisitTasks';
import CompletedVisits from './components/CompletedVisits';
import CoverageRate from './components/CoverageRate';
import KnowledgePanel from './components/KnowledgePanel';
import ChatArea from './components/ChatArea';
import VisitOverviewDashboard from './components/VisitOverviewDashboard';
import AddVisitModal from './components/AddVisitModal';
import CustomerManagement from './components/CustomerManagement';
import KnowledgeBase from './components/KnowledgeBase';
import Statistics from './components/Statistics';
import RenderGuard from './components/RenderGuard';

export default function App() {
  const { activeNav } = useAppStore();
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const isCustomerOverview = activeNav === '客户盘点' || activeNav === '客户管理';
  const isVisitExecution = activeNav === '拜访推进' || activeNav === '拜访看板';
  const isVisitEnablement = activeNav === '拜访赋能' || activeNav === '知识库';
  const isBusinessReview = activeNav === '经营复盘' || activeNav === '统计';

  useEffect(() => {
    const hideDriverStatus = () => {
      const nodes = Array.from(document.body.querySelectorAll('div, span, button'));
      nodes.forEach((node) => {
        const text = node.textContent?.trim() || '';
        if (!text.includes('ljq_driver') || !text.includes('已连接')) return;
        const style = window.getComputedStyle(node);
        if (style.position === 'fixed' || style.position === 'sticky') {
          (node as HTMLElement).style.display = 'none';
        }
      });
    };

    hideDriverStatus();
    const observer = new MutationObserver(hideDriverStatus);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const focusVisitTask = (taskId: string) => {
    setHighlightedTaskId(taskId);
    requestAnimationFrame(() => {
      document.getElementById(`visit-task-${taskId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden app-shell">
      <TopNav />

      {isCustomerOverview && (
        <RenderGuard title="客户盘点">
          <CustomerManagement />
        </RenderGuard>
      )}

      {isVisitExecution && (
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4 min-w-[1180px]">
            <RenderGuard title="拜访总览">
              <VisitOverviewDashboard onViewTask={focusVisitTask} />
            </RenderGuard>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(360px, 1fr)' }}>
              <div className="space-y-3">
                <RenderGuard title="拜访任务">
                  <VisitTasks highlightedTaskId={highlightedTaskId} />
                </RenderGuard>
                <RenderGuard title="拜访覆盖率">
                  <CoverageRate />
                </RenderGuard>
                <RenderGuard title="已完成拜访">
                  <CompletedVisits />
                </RenderGuard>
                <RenderGuard title="知识推荐">
                  <KnowledgePanel />
                </RenderGuard>
              </div>
              <div className="min-w-0 sticky top-0 self-start h-[calc(100vh-88px)]">
                <RenderGuard title="智能拜访助手">
                  <ChatArea />
                </RenderGuard>
              </div>
            </div>
          </div>
        </div>
      )}

      {isVisitEnablement && (
        <RenderGuard title="拜访赋能">
          <KnowledgeBase />
        </RenderGuard>
      )}
      {isBusinessReview && (
        <RenderGuard title="经营复盘">
          <Statistics />
        </RenderGuard>
      )}

      {!isCustomerOverview && !isVisitExecution && !isVisitEnablement && !isBusinessReview && (
        <RenderGuard title="默认页面">
          <CustomerManagement />
        </RenderGuard>
      )}

      <AddVisitModal />
    </div>
  );
}
