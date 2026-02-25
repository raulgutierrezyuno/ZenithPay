import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, filterTransactions } from '@/lib/data/store';
import { computeAllMetrics } from '@/lib/analysis/metrics';
import { Filters } from '@/lib/data/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const filters: Filters = {
    country: (searchParams.get('country') as Filters['country']) || 'all',
    paymentMethod: (searchParams.get('paymentMethod') as Filters['paymentMethod']) || 'all',
    processor: (searchParams.get('processor') as Filters['processor']) || 'all',
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  };

  const allTransactions = getTransactions();
  const filtered = filterTransactions(allTransactions, filters);
  const metrics = computeAllMetrics(filtered);

  return NextResponse.json(metrics);
}
