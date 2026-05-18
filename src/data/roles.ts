export interface SalesRep {
  id: string;
  name: string;
  role: string;      // 如 "销售总监", "华南区域总监", "华南一区销售"
  level: number;     // 1最高, 4最低
  customerIds: string[];
}

const ALL_CUSTOMER_IDS = [
  'c1','c2','c3','c4','c5','c6','c7','c8','c9','c10',
  'c11','c12','c13','c14','c15','c16','c17','c18','c19','c20',
  'c20b',
  'c21','c22','c23','c24','c25','c26','c27','c28','c29','c30',
];

export const salesReps: SalesRep[] = [
  {
    id: 'rep0',
    name: '王总',
    role: '销售总监',
    level: 1,
    customerIds: ALL_CUSTOMER_IDS,
  },
  {
    id: 'rep1',
    name: '李经理',
    role: '华南区域总监',
    level: 2,
    customerIds: ALL_CUSTOMER_IDS,
  },
  {
    id: 'rep2',
    name: '张三',
    role: '华南一区销售',
    level: 3,
    customerIds: ['c1','c3','c5','c7','c8','c11','c14','c16','c19','c20b','c21','c23','c25','c27','c29'],
  },
  {
    id: 'rep3',
    name: '李四',
    role: '华南二区销售',
    level: 3,
    customerIds: ['c2','c4','c6','c9','c10','c12','c13','c15','c17','c18','c20','c22','c24','c26','c28','c30'],
  },
];
