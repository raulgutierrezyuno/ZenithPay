export interface Transaction {
  id: string;
  timestamp: string;
  merchantId: string;
  customerId: string;
  amount: number;
  currency: Currency;
  country: Country;
  paymentMethod: PaymentMethod;
  processor: Processor;
  status: TransactionStatus;
  declineReason: DeclineReason | null;
  declineCategory: DeclineCategory | null;
  isRecoverable: boolean;
  isReturningCustomer: boolean;
  bin: string;
}

export type Currency = 'BRL' | 'MXN' | 'IDR' | 'USD';
export type Country = 'Brazil' | 'Mexico' | 'Indonesia' | 'US';
export type PaymentMethod = 'credit_card' | 'pix' | 'oxxo' | 'gopay';
export type Processor = 'StripeConnect' | 'AdyenLatam' | 'PayUBrasil' | 'ConektaMX';
export type TransactionStatus = 'approved' | 'declined';
export type DeclineCategory = 'hard_decline' | 'soft_decline' | 'processing_error';

export type DeclineReason =
  | 'insufficient_funds'
  | 'do_not_honor'
  | 'expired_card'
  | 'fraud_suspected'
  | '3ds_failed'
  | 'gateway_timeout'
  | 'stolen_card'
  | 'issuer_unavailable'
  | 'invalid_card'
  | 'velocity_limit';

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  insufficient_funds: 'Insufficient Funds',
  do_not_honor: 'Do Not Honor',
  expired_card: 'Expired Card',
  fraud_suspected: 'Fraud Suspected',
  '3ds_failed': '3DS Authentication Failed',
  gateway_timeout: 'Gateway Timeout',
  stolen_card: 'Stolen Card',
  issuer_unavailable: 'Issuer Unavailable',
  invalid_card: 'Invalid Card',
  velocity_limit: 'Velocity Limit Exceeded',
};

export const DECLINE_CATEGORY_MAP: Record<DeclineReason, DeclineCategory> = {
  insufficient_funds: 'soft_decline',
  do_not_honor: 'soft_decline',
  expired_card: 'hard_decline',
  fraud_suspected: 'hard_decline',
  '3ds_failed': 'soft_decline',
  gateway_timeout: 'processing_error',
  stolen_card: 'hard_decline',
  issuer_unavailable: 'processing_error',
  invalid_card: 'hard_decline',
  velocity_limit: 'soft_decline',
};

export const RECOVERABLE_REASONS: Set<DeclineReason> = new Set([
  'insufficient_funds',
  'do_not_honor',
  '3ds_failed',
  'gateway_timeout',
  'issuer_unavailable',
  'velocity_limit',
]);

export interface KPIMetrics {
  totalTransactions: number;
  approved: number;
  declined: number;
  approvalRate: number;
  totalRevenue: number;
  lostRevenue: number;
  recoverableRevenue: number;
}

export interface DimensionMetric {
  dimension: string;
  value: string;
  total: number;
  approved: number;
  declined: number;
  approvalRate: number;
  revenue: number;
  lostRevenue: number;
}

export interface DeclineReasonMetric {
  reason: DeclineReason;
  label: string;
  count: number;
  percentage: number;
  revenueImpact: number;
  category: DeclineCategory;
  isRecoverable: boolean;
}

export interface TimeSeriesPoint {
  date: string;
  total: number;
  approved: number;
  declined: number;
  approvalRate: number;
  revenue: number;
}

export interface HourlyMetric {
  hour: number;
  total: number;
  approved: number;
  approvalRate: number;
}

export interface Insight {
  id: string;
  type: 'underperforming_method' | 'processor_anomaly' | 'high_impact_reason' | 'geographic_outlier' | 'recoverable_revenue' | 'temporal_anomaly';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: number;
  recommendation: string;
}

export interface Recommendation {
  id: string;
  rank: number;
  title: string;
  description: string;
  estimatedImpact: number;
  effort: 'low' | 'medium' | 'high';
  category: string;
}

export interface Filters {
  country?: Country | 'all';
  paymentMethod?: PaymentMethod | 'all';
  processor?: Processor | 'all';
  dateFrom?: string;
  dateTo?: string;
  status?: TransactionStatus | 'all';
}

export interface MetricsResponse {
  kpis: KPIMetrics;
  byPaymentMethod: DimensionMetric[];
  byCountry: DimensionMetric[];
  byProcessor: DimensionMetric[];
  byCurrency: DimensionMetric[];
  topDeclineReasons: DeclineReasonMetric[];
  timeSeries: TimeSeriesPoint[];
  hourlyPattern: HourlyMetric[];
  recoverableBreakdown: {
    softDeclines: number;
    hardDeclines: number;
    processingErrors: number;
    softDeclineRevenue: number;
    hardDeclineRevenue: number;
    processingErrorRevenue: number;
  };
  cohort: {
    newCustomers: { total: number; approved: number; approvalRate: number };
    returningCustomers: { total: number; approved: number; approvalRate: number };
  };
}
