export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface UserProfile {
  name: string;
  email?: string;
  age: number | null;
  occupation: string;
  monthlyIncome: number | null;
  familySize: number;
  financialGoal: 'Save Money' | 'Buy a House' | 'Buy a Car' | 'Education' | 'Emergency Fund' | 'Investment' | 'Travel' | 'Other' | null;
  riskPreference: 'Low' | 'Medium' | 'High' | null;
}

export type IncomeType = 'Salary' | 'Freelance' | 'Business' | 'Investment' | 'Gift' | 'Other';

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string;
  incomeType: IncomeType;
  description?: string;
  recurring: boolean;
}

export type TransactionType = 'NEED' | 'WANT';
export type PaymentMethod = 'Cash' | 'Debit Card' | 'Credit Card' | 'Bank Transfer' | 'Mobile Wallet' | 'Other';
export type ExpenseCategory = 
  | 'Food' 
  | 'Transport' 
  | 'Rent' 
  | 'Bills' 
  | 'Education' 
  | 'Healthcare' 
  | 'Shopping' 
  | 'Entertainment' 
  | 'Travel' 
  | 'Utilities' 
  | 'Other';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory;
  subcategory?: string;
  date: string;
  paymentMethod: PaymentMethod;
  description: string;
  transactionType: TransactionType;
  recurring: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  category?: ExpenseCategory;
  amount: number;
  spent: number;
  remaining: number;
  utilization: number;
  month: string;
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'OVERDUE';

export type ContributionSource = 'SALARY' | 'SAVINGS';

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  source: ContributionSource;
  date: string;
  notes: string;
  type: 'SAVINGS_CONTRIBUTION';
  category: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress?: number;
  remaining: number;
  deadline: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: GoalStatus;
  monthsRemaining: number;
  requiredMonthly: number;
  contributions?: GoalContribution[];
}

export interface PredictionModel {
  name: 'Linear Regression' | 'Random Forest Regressor' | 'XGBoost Regressor';
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  predictedAmount?: number;
}

export interface Prediction {
  id: string;
  userId: string;
  predictedAmount: number;
  previousMonthExpense: number;
  changeAmount: number;
  changePercentage: number;
  predictionPeriod: string;
  category?: ExpenseCategory;
  modelUsed: PredictionModel['name'];
  modelMetrics: PredictionModel;
  comparedModels?: PredictionModel[];
  generatedDate: string;
  monthsUsed?: number;
  categoryPredictions: { category: ExpenseCategory; predictedAmount: number; previousAmount: number }[];
}

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Anomaly {
  id: string;
  userId: string;
  expenseId: string;
  expenseDescription: string;
  amount: number;
  normalAverage: number;
  category: ExpenseCategory;
  anomalyScore: number;
  severity: AnomalySeverity;
  reason: string;
  detectedAt: string;
  status: 'UNRESOLVED' | 'VERIFIED' | 'DISMISSED';
}

export interface FinancialHealthScore {
  overallScore: number; // 0 - 100
  status: 'At Risk' | 'Moderate' | 'Good' | 'Excellent';
  componentScores: {
    savingsRate: number;     // max 25
    budgetAdherence: number; // max 20
    expenseStability: number;// max 15
    emergencyFund: number;   // max 20
    goalProgress: number;    // max 20
  };
  explanations: string[];
  recommendations: string[];
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  category: 'spending' | 'budget' | 'savings' | 'prediction' | 'anomaly' | 'planning';
  type: 'warning' | 'tip' | 'positive';
  priority?: number;
  createdAt?: string;
}

export interface EmergencyFundPlan {
  currentBalance: number;
  targetMonths: number;
  avgMonthlyExpense: number;
  targetAmount: number;
  monthsCovered: number;
  amountNeeded: number;
  progressPercent: number;
  status: 'Not started' | 'Building' | 'Adequate' | 'Fully funded';
  goalId: string | null;
  goalName: string | null;
  recommendations: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'budget' | 'anomaly' | 'goal' | 'health' | 'prediction';
  read: boolean;
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  ipAddress: string;
  timestamp: string;
}
