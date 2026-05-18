import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import TopNav from './components/TopNav';
import VisitTasks from './components/VisitTasks';
import CompletedVisits from './components/CompletedVisits';
import CoverageRate from './components/CoverageRate';
import KnowledgePanel from './components/KnowledgePanel';
import ChatArea from './components/ChatArea';
import AddVisitModal from './components/AddVisitModal';
import CustomerManagement from './components/CustomerManagement';
import KnowledgeBase from './components/KnowledgeBase';
import Statistics from './components/Statistics';
import RenderGuard from './components/RenderGuard';

export default function App() {
  const { activeNav } = useAppStore();
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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden app-shell">
      <TopNav />

      {isCustomerOverview && (
        <RenderGuard title="客户盘点">
          <CustomerManagement />
        </RenderGuard>
      )}

      {isVisitExecution && (
        <div className="flex-1 flex overflow-hidden p-4 gap-4">
          <div className="overflow-y-auto space-y-3 pr-1" style={{ width: '66.6%', scrollbarWidth: 'thin' }}>
            <RenderGuard title="拜访任务">
              <VisitTasks />
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
          <div style={{ width: '33.4%' }} className="min-w-0">
            <RenderGuard title="智能拜访助手">
              <ChatArea />
            </RenderGuard>
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
