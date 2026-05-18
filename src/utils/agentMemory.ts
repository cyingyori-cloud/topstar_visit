import type { Customer } from '../data/mockData';

export type FeedbackValue = 'up' | 'down';

export interface AnswerFeedback {
  messageId: string;
  value: FeedbackValue;
  createdAt: string;
}

export interface SavedAnswer {
  id: string;
  content: string;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
}

export interface CustomerMemoryNote {
  id: string;
  customerId: string;
  customerName: string;
  content: string;
  sourceMessageId?: string;
  createdAt: string;
}

const FEEDBACK_KEY = 'topstar-agent-answer-feedback-v1';
const SAVED_ANSWERS_KEY = 'topstar-agent-saved-answers-v1';
const CUSTOMER_MEMORY_KEY = 'topstar-agent-customer-memory-v1';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadAnswerFeedback(): Record<string, AnswerFeedback> {
  return readJson<Record<string, AnswerFeedback>>(FEEDBACK_KEY, {});
}

export function saveAnswerFeedback(feedback: Record<string, AnswerFeedback>) {
  writeJson(FEEDBACK_KEY, feedback);
}

export function loadSavedAnswers(): SavedAnswer[] {
  return readJson<SavedAnswer[]>(SAVED_ANSWERS_KEY, []);
}

export function saveSavedAnswers(items: SavedAnswer[]) {
  writeJson(SAVED_ANSWERS_KEY, items.slice(0, 80));
}

export function loadCustomerMemory(): CustomerMemoryNote[] {
  return readJson<CustomerMemoryNote[]>(CUSTOMER_MEMORY_KEY, []);
}

export function saveCustomerMemory(items: CustomerMemoryNote[]) {
  writeJson(CUSTOMER_MEMORY_KEY, items.slice(0, 120));
}

export function inferCustomerMemoryContent(answer: string, customer: Customer) {
  const lines = answer
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*#>\s]+/, '').trim())
    .filter(Boolean);
  const useful = lines.filter(line =>
    line.includes(customer.name) ||
    line.includes('关注') ||
    line.includes('痛点') ||
    line.includes('顾虑') ||
    line.includes('风险') ||
    line.includes('下一步') ||
    line.includes('承诺') ||
    line.includes('ROI') ||
    line.includes('投资回报') ||
    line.includes('节拍') ||
    line.includes('良率')
  );

  return (useful.length ? useful : lines)
    .slice(0, 5)
    .join('\n')
    .slice(0, 700);
}
