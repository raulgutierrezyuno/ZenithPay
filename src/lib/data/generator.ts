import {
  Transaction,
  Currency,
  Country,
  PaymentMethod,
  Processor,
  DeclineReason,
  DeclineCategory,
  DECLINE_CATEGORY_MAP,
  RECOVERABLE_REASONS,
} from './schema';

// Seeded PRNG for deterministic data
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return this.seed / 2147483647;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weightedPick<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

interface CountryConfig {
  currency: Currency;
  paymentMethods: PaymentMethod[];
  methodWeights: number[];
  processors: Processor[];
  processorWeights: number[];
  baseApprovalRate: number;
}

const COUNTRY_CONFIGS: Record<Country, CountryConfig> = {
  Brazil: {
    currency: 'BRL',
    paymentMethods: ['credit_card', 'pix'],
    methodWeights: [40, 60],
    processors: ['PayUBrasil', 'StripeConnect', 'AdyenLatam'],
    processorWeights: [50, 30, 20],
    baseApprovalRate: 0.72,
  },
  Mexico: {
    currency: 'MXN',
    paymentMethods: ['credit_card', 'oxxo'],
    methodWeights: [45, 55],
    processors: ['ConektaMX', 'StripeConnect', 'AdyenLatam'],
    processorWeights: [55, 25, 20],
    baseApprovalRate: 0.52,
  },
  Indonesia: {
    currency: 'IDR',
    paymentMethods: ['credit_card', 'gopay'],
    methodWeights: [35, 65],
    processors: ['AdyenLatam', 'StripeConnect'],
    processorWeights: [60, 40],
    baseApprovalRate: 0.58,
  },
  US: {
    currency: 'USD',
    paymentMethods: ['credit_card'],
    methodWeights: [100],
    processors: ['StripeConnect', 'AdyenLatam'],
    processorWeights: [70, 30],
    baseApprovalRate: 0.75,
  },
};

const COUNTRY_WEIGHTS: Record<Country, number> = {
  Brazil: 35,
  Mexico: 30,
  Indonesia: 25,
  US: 10,
};

// Method-specific approval rate modifiers (stacks with country)
const METHOD_APPROVAL_MODIFIER: Record<PaymentMethod, number> = {
  credit_card: 0.0,
  pix: 0.20,       // PIX is very reliable
  oxxo: -0.15,     // OXXO has more issues
  gopay: -0.05,    // GoPay slightly worse
};

// Processor-specific approval modifiers
const PROCESSOR_APPROVAL_MODIFIER: Record<Processor, number> = {
  StripeConnect: 0.05,
  AdyenLatam: -0.02,
  PayUBrasil: 0.03,
  ConektaMX: -0.12, // Significantly underperforming
};

// Decline reason distribution (weighted)
const DECLINE_REASONS: DeclineReason[] = [
  'insufficient_funds', 'do_not_honor', 'expired_card', 'fraud_suspected',
  '3ds_failed', 'gateway_timeout', 'stolen_card', 'issuer_unavailable',
  'invalid_card', 'velocity_limit',
];

const DECLINE_WEIGHTS: Record<PaymentMethod, number[]> = {
  credit_card: [25, 18, 12, 10, 8, 7, 5, 5, 5, 5],
  pix: [10, 5, 0, 5, 0, 40, 0, 30, 0, 10],
  oxxo: [30, 20, 5, 8, 15, 10, 2, 5, 2, 3],
  gopay: [20, 15, 0, 10, 5, 20, 0, 15, 5, 10],
};

// Amount ranges by currency (in local currency)
const AMOUNT_RANGES: Record<Currency, [number, number]> = {
  BRL: [15, 2500],
  MXN: [50, 8000],
  IDR: [15000, 5000000],
  USD: [5, 500],
};

// USD conversion rates for revenue calculations
export const USD_RATES: Record<Currency, number> = {
  BRL: 0.18,
  MXN: 0.055,
  IDR: 0.000062,
  USD: 1.0,
};

function generateTransactionId(rng: SeededRandom): string {
  const chars = 'abcdef0123456789';
  let id = 'txn_';
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(rng.next() * chars.length)];
  }
  return id;
}

function generateCustomerId(rng: SeededRandom, isReturning: boolean, pool: string[]): string {
  if (isReturning && pool.length > 0) {
    return rng.pick(pool);
  }
  const chars = 'abcdef0123456789';
  let id = 'cust_';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(rng.next() * chars.length)];
  }
  return id;
}

function generateBin(rng: SeededRandom, method: PaymentMethod): string {
  if (method !== 'credit_card') return '';
  const prefixes = ['411111', '424242', '555555', '378282', '601111', '350000', '400000', '510000'];
  return rng.pick(prefixes);
}

export function generateTransactions(count: number = 5500, seed: number = 42): Transaction[] {
  const rng = new SeededRandom(seed);
  const transactions: Transaction[] = [];
  const customerPool: string[] = [];

  // Generate dates over 90 days (Dec 1 2025 to Feb 28 2026)
  const startDate = new Date('2025-12-01T00:00:00Z');
  const endDate = new Date('2026-02-28T23:59:59Z');
  const dateRange = endDate.getTime() - startDate.getTime();

  const countries: Country[] = ['Brazil', 'Mexico', 'Indonesia', 'US'];
  const countryWeightsArr = countries.map(c => COUNTRY_WEIGHTS[c]);

  for (let i = 0; i < count; i++) {
    // Random timestamp within the 90-day window
    const ts = new Date(startDate.getTime() + rng.next() * dateRange);
    const hour = ts.getUTCHours();
    const dayOfWeek = ts.getUTCDay();

    // Pick country
    const country = rng.weightedPick(countries, countryWeightsArr);
    const config = COUNTRY_CONFIGS[country];

    // Pick payment method (country-specific)
    const paymentMethod = rng.weightedPick(config.paymentMethods, config.methodWeights);

    // Pick processor (country-specific)
    const processor = rng.weightedPick(config.processors, config.processorWeights);

    // Determine if returning customer (~40% returning)
    const isReturning = rng.next() < 0.4;
    const customerId = generateCustomerId(rng, isReturning, customerPool);
    if (!isReturning) customerPool.push(customerId);
    // Keep pool manageable
    if (customerPool.length > 2000) customerPool.splice(0, 500);

    // Generate amount
    const [minAmt, maxAmt] = AMOUNT_RANGES[config.currency];
    const amount = Math.round((minAmt + rng.next() * (maxAmt - minAmt)) * 100) / 100;

    // Calculate approval probability
    let approvalProb = config.baseApprovalRate;
    approvalProb += METHOD_APPROVAL_MODIFIER[paymentMethod];
    approvalProb += PROCESSOR_APPROVAL_MODIFIER[processor];

    // Temporal modifier: lower approval during peak hours (18-22)
    if (hour >= 18 && hour <= 22) {
      approvalProb -= 0.06;
    }

    // Weekend modifier: slightly worse
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      approvalProb -= 0.03;
    }

    // Returning customer bonus
    if (isReturning) {
      approvalProb += 0.08;
    }

    // High amount penalty (large transactions more likely to be declined)
    const amountRatio = (amount - minAmt) / (maxAmt - minAmt);
    if (amountRatio > 0.8) {
      approvalProb -= 0.05;
    }

    // Clamp probability
    approvalProb = Math.max(0.15, Math.min(0.98, approvalProb));

    const status = rng.next() < approvalProb ? 'approved' : 'declined';

    let declineReason: DeclineReason | null = null;
    let declineCategory: DeclineCategory | null = null;
    let isRecoverable = false;

    if (status === 'declined') {
      const weights = DECLINE_WEIGHTS[paymentMethod];
      declineReason = rng.weightedPick(DECLINE_REASONS, weights);
      declineCategory = DECLINE_CATEGORY_MAP[declineReason];
      isRecoverable = RECOVERABLE_REASONS.has(declineReason);
    }

    transactions.push({
      id: generateTransactionId(rng),
      timestamp: ts.toISOString(),
      merchantId: 'merchant_vitahealth',
      customerId,
      amount,
      currency: config.currency,
      country,
      paymentMethod,
      processor,
      status,
      declineReason,
      declineCategory,
      isRecoverable,
      isReturningCustomer: isReturning,
      bin: generateBin(rng, paymentMethod),
    });
  }

  // Sort by timestamp
  transactions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return transactions;
}
