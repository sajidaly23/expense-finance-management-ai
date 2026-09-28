import { 
  User, 
  UserProfile, 
  Income, 
  Expense, 
  Budget, 
  SavingsGoal, 
  Prediction, 
  Anomaly, 
  FinancialHealthScore, 
  AIInsight, 
  NotificationItem,
  AuditLog
} from '../types';

export const mockUser: User = {
  id: 'usr_101',
  name: 'Alex Mercer',
  email: 'alex.mercer@university.edu',
  role: 'USER',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

export const mockUserProfile: UserProfile = {
  name: 'Alex Mercer',
  email: 'alex.mercer@university.edu',
  age: 24,
  occupation: 'Software Engineer',
  monthlyIncome: 95000,
  familySize: 2,
  financialGoal: 'Buy a House',
  riskPreference: 'Medium',
};

export const mockIncomes: Income[] = [
  { id: 'inc_1', userId: 'usr_101', amount: 85000, source: 'Primary Salary', date: '2026-09-01', incomeType: 'Salary', description: 'Monthly Tech Salary', recurring: true },
  { id: 'inc_2', userId: 'usr_101', amount: 10000, source: 'UI/UX Consulting', date: '2026-09-03', incomeType: 'Freelance', description: 'Freelance Design Work', recurring: false },
  { id: 'inc_3', userId: 'usr_101', amount: 3500, source: 'Stock Dividends', date: '2026-08-28', incomeType: 'Investment', description: 'Quarterly Payout', recurring: true },
  { id: 'inc_4', userId: 'usr_101', amount: 85000, source: 'Primary Salary', date: '2026-08-01', incomeType: 'Salary', description: 'Monthly Tech Salary', recurring: true },
  { id: 'inc_5', userId: 'usr_101', amount: 12000, source: 'Mobile App Project', date: '2026-08-15', incomeType: 'Freelance', description: 'Contract completion', recurring: false },
];

export const mockExpenses: Expense[] = [
  { id: 'exp_1', userId: 'usr_101', amount: 22000, category: 'Rent', subcategory: 'Apartment Rent', date: '2026-09-01', paymentMethod: 'Bank Transfer', description: 'Monthly Apartment Rent', transactionType: 'NEED', recurring: true },
  { id: 'exp_2', userId: 'usr_101', amount: 4500, category: 'Utilities', subcategory: 'Electricity & Gas', date: '2026-09-02', paymentMethod: 'Credit Card', description: 'Utility Bill', transactionType: 'NEED', recurring: true },
  { id: 'exp_3', userId: 'usr_101', amount: 14500, category: 'Food', subcategory: 'Groceries', date: '2026-09-03', paymentMethod: 'Debit Card', description: 'Supermarket Groceries', transactionType: 'NEED', recurring: false },
  { id: 'exp_4', userId: 'usr_101', amount: 18500, category: 'Shopping', subcategory: 'Electronics', date: '2026-09-04', paymentMethod: 'Credit Card', description: 'New 4K Monitor Purchase', transactionType: 'WANT', recurring: false },
  { id: 'exp_5', userId: 'usr_101', amount: 6200, category: 'Transport', subcategory: 'Fuel & Tolls', date: '2026-09-05', paymentMethod: 'Mobile Wallet', description: 'Car Gas Refill', transactionType: 'NEED', recurring: true },
  { id: 'exp_6', userId: 'usr_101', amount: 8000, category: 'Entertainment', subcategory: 'Concert Ticket', date: '2026-09-05', paymentMethod: 'Credit Card', description: 'Weekend Music Festival', transactionType: 'WANT', recurring: false },
  { id: 'exp_7', userId: 'usr_101', amount: 3200, category: 'Healthcare', subcategory: 'Pharmacy', date: '2026-09-04', paymentMethod: 'Cash', description: 'Vitamins & Supplies', transactionType: 'NEED', recurring: false },
  { id: 'exp_8', userId: 'usr_101', amount: 2500, category: 'Bills', subcategory: 'Internet', date: '2026-09-01', paymentMethod: 'Bank Transfer', description: 'Fiber Broadband', transactionType: 'NEED', recurring: true },
];

export const mockBudgets: Budget[] = [
  { id: 'bgt_overall', userId: 'usr_101', amount: 75000, spent: 78900, remaining: 0, utilization: 105, month: '2026-09' },
  { id: 'bgt_food', userId: 'usr_101', category: 'Food', amount: 18000, spent: 14500, remaining: 3500, utilization: 81, month: '2026-09' },
  { id: 'bgt_rent', userId: 'usr_101', category: 'Rent', amount: 22000, spent: 22000, remaining: 0, utilization: 100, month: '2026-09' },
  { id: 'bgt_shopping', userId: 'usr_101', category: 'Shopping', amount: 12000, spent: 18500, remaining: 0, utilization: 154, month: '2026-09' },
  { id: 'bgt_transport', userId: 'usr_101', category: 'Transport', amount: 8000, spent: 6200, remaining: 1800, utilization: 78, month: '2026-09' },
  { id: 'bgt_entertainment', userId: 'usr_101', category: 'Entertainment', amount: 7000, spent: 8000, remaining: 0, utilization: 114, month: '2026-09' },
];

export const mockSavingsGoals: SavingsGoal[] = [
  { id: 'goal_1', userId: 'usr_101', name: 'House Down Payment', targetAmount: 1500000, currentAmount: 620000, remaining: 880000, deadline: '2027-12-31', priority: 'HIGH', status: 'ACTIVE', monthsRemaining: 15, requiredMonthly: 58667 },
  { id: 'goal_2', userId: 'usr_101', name: 'Emergency Fund (6 Mos)', targetAmount: 400000, currentAmount: 310000, remaining: 90000, deadline: '2026-11-30', priority: 'HIGH', status: 'ACTIVE', monthsRemaining: 2, requiredMonthly: 45000 },
  { id: 'goal_3', userId: 'usr_101', name: 'New Vehicle Purchase', targetAmount: 800000, currentAmount: 250000, remaining: 550000, deadline: '2027-06-30', priority: 'MEDIUM', status: 'ACTIVE', monthsRemaining: 9, requiredMonthly: 61112 },
  { id: 'goal_4', userId: 'usr_101', name: 'Japan Travel Fund', targetAmount: 200000, currentAmount: 200000, remaining: 0, deadline: '2026-08-01', priority: 'LOW', status: 'COMPLETED', monthsRemaining: 0, requiredMonthly: 0 },
];

export const mockPrediction: Prediction = {
  id: 'pred_next_month',
  userId: 'usr_101',
  predictedAmount: 82450,
  previousMonthExpense: 78900,
  changeAmount: 3550,
  changePercentage: 4.5,
  predictionPeriod: 'October 2026',
  modelUsed: 'XGBoost Regressor',
  modelMetrics: {
    name: 'XGBoost Regressor',
    mae: 1420.5,
    rmse: 1890.2,
    mape: 2.1,
    r2: 0.94
  },
  generatedDate: '2026-09-06',
  categoryPredictions: [
    { category: 'Food', predictedAmount: 16200, previousAmount: 14500 },
    { category: 'Rent', predictedAmount: 22000, previousAmount: 22000 },
    { category: 'Shopping', predictedAmount: 14000, previousAmount: 18500 },
    { category: 'Transport', predictedAmount: 7100, previousAmount: 6200 },
    { category: 'Utilities', predictedAmount: 4800, previousAmount: 4500 },
    { category: 'Entertainment', predictedAmount: 8500, previousAmount: 8000 },
    { category: 'Healthcare', predictedAmount: 3500, previousAmount: 3200 },
    { category: 'Bills', predictedAmount: 6350, previousAmount: 2500 }
  ]
};

export const mockAnomalies: Anomaly[] = [
  {
    id: 'anom_1',
    userId: 'usr_101',
    expenseId: 'exp_4',
    expenseDescription: 'New 4K Monitor Purchase',
    amount: 18500,
    normalAverage: 6500,
    category: 'Shopping',
    anomalyScore: -0.74,
    severity: 'HIGH',
    reason: 'Shopping transaction amount (Rs. 18,500) exceeds historical 3-month category baseline (Rs. 6,500) by 184%. Detected via Isolation Forest ML algorithm.',
    detectedAt: '2026-09-04 14:22:00',
    status: 'UNRESOLVED'
  },
  {
    id: 'anom_2',
    userId: 'usr_101',
    expenseId: 'exp_6',
    expenseDescription: 'Weekend Music Festival',
    amount: 8000,
    normalAverage: 3200,
    category: 'Entertainment',
    anomalyScore: -0.48,
    severity: 'MEDIUM',
    reason: 'Entertainment spending reached 114% of monthly budget in a single transaction.',
    detectedAt: '2026-09-05 20:10:00',
    status: 'UNRESOLVED'
  }
];

export const mockFinancialHealthScore: FinancialHealthScore = {
  overallScore: 78,
  status: 'Good',
  componentScores: {
    savingsRate: 21.5,      // out of 25
    budgetAdherence: 14.0,  // out of 20
    expenseStability: 12.5, // out of 15
    emergencyFund: 15.5,    // out of 20
    goalProgress: 14.5      // out of 20
  },
  explanations: [
    'Savings rate is healthy at 21.5% of total income (Target: >= 20%).',
    'Shopping & Entertainment expenses exceeded monthly budgets by 54% and 14%.',
    'Emergency fund currently covers ~4.2 months of living expenses (Target: 6 months).',
    'High progress on House Down Payment goal (41.3% reached).'
  ],
  recommendations: [
    'Cap discretionary Shopping expenditure to Rs. 12,000 next month to recover overall budget stability.',
    'Allocate an additional Rs. 15,000 from freelance earnings directly to Emergency Fund.',
    'Set up automated recurring savings triggers right after monthly salary credit.'
  ]
};

export const mockAIInsights: AIInsight[] = [
  {
    id: 'ins_1',
    title: 'Shopping Expense Surge',
    description: 'Your Shopping expenses have increased by 42% compared to last month due to recent tech hardware purchases.',
    category: 'spending',
    type: 'warning',
    createdAt: '2026-09-05'
  },
  {
    id: 'ins_2',
    title: 'Strong Savings Momentum',
    description: 'You saved Rs. 20,600 this month, keeping your overall savings rate above 21%.',
    category: 'savings',
    type: 'positive',
    createdAt: '2026-09-04'
  },
  {
    id: 'ins_3',
    title: 'Budget Threshold Trigger',
    description: 'Shopping category budget is currently at 154% utilization. Re-allocating unspent Transport funds is recommended.',
    category: 'budget',
    type: 'warning',
    createdAt: '2026-09-04'
  }
];

export const mockNotifications: NotificationItem[] = [
  { id: 'notif_1', title: 'Budget Exceeded Warning', message: 'Shopping category spent Rs. 18,500 against Rs. 12,000 budget (154%).', type: 'budget', read: false, date: '10 mins ago' },
  { id: 'notif_2', title: 'Unusual Spending Spike', message: 'Isolation Forest detected an anomalous Rs. 18,500 expense in Shopping.', type: 'anomaly', read: false, date: '1 hour ago' },
  { id: 'notif_3', title: 'Upcoming Payment Reminder', message: 'Apartment Rent (Rs. 22,000) recurring trigger due in 25 days.', type: 'prediction', read: true, date: '1 day ago' },
  { id: 'notif_4', title: 'Goal Milestone Achieved', message: 'Japan Travel Fund reached 100% completion status!', type: 'goal', read: true, date: '3 days ago' },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'log_1', userId: 'usr_101', userName: 'Alex Mercer', action: 'CREATE_EXPENSE', module: 'Expense Engine', ipAddress: '192.168.1.42', timestamp: '2026-09-05 14:22:10' },
  { id: 'log_2', userId: 'usr_101', userName: 'Alex Mercer', action: 'ML_PREDICTION_RUN', module: 'Python FastAPI', ipAddress: '192.168.1.42', timestamp: '2026-09-04 09:15:00' },
  { id: 'log_3', userId: 'usr_101', userName: 'Alex Mercer', action: 'UPDATE_BUDGET', module: 'Budget Manager', ipAddress: '192.168.1.42', timestamp: '2026-09-01 10:00:00' },
];

export const monthlyTrendsData = [
  { month: 'Apr', income: 82000, expense: 62000, savings: 20000 },
  { month: 'May', income: 85000, expense: 65000, savings: 20000 },
  { month: 'Jun', income: 88000, expense: 68000, savings: 20000 },
  { month: 'Jul', income: 90000, expense: 72000, savings: 18000 },
  { month: 'Aug', income: 97000, expense: 75000, savings: 22000 },
  { month: 'Sep (Current)', income: 98500, expense: 78900, savings: 19600 },
  { month: 'Oct (Predicted)', income: 98500, expense: 82450, savings: 16050 },
];
