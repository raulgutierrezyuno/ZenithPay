import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, filterTransactions } from '@/lib/data/store';
import { Filters } from '@/lib/data/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const filters: Filters = {
    country: (searchParams.get('country') as Filters['country']) || 'all',
    paymentMethod: (searchParams.get('paymentMethod') as Filters['paymentMethod']) || 'all',
    processor: (searchParams.get('processor') as Filters['processor']) || 'all',
    status: (searchParams.get('status') as Filters['status']) || 'all',
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  };

  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const allTransactions = getTransactions();
  const filtered = filterTransactions(allTransactions, filters);

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    data: paginated,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  });
}
