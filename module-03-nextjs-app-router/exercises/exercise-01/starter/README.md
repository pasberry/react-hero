# Analytics Dashboard - Starter Code

This is the starter code for Module 3 Exercise 1: Build an Analytics Dashboard with Progressive Streaming.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Your Task

Build a production-ready analytics dashboard using Next.js 14+ App Router features:

### Files to Complete

1. **`app/dashboard/page.tsx`** - Main dashboard with Suspense boundaries
2. **`app/dashboard/components/MetricsCards.tsx`** - Server Component for metrics
3. **`app/dashboard/components/RevenueChart.tsx`** - Server Component for chart
4. **`app/dashboard/components/RecentOrders.tsx`** - Server Component for orders table
5. **`lib/data.ts`** - Data fetching functions with delays
6. **`lib/actions.ts`** - Server Actions for mutations

### Requirements

- Progressive streaming with granular Suspense boundaries
- Server Components for data fetching (no client-side fetch)
- Server Actions for order management
- Optimistic updates with useOptimistic
- Proper skeleton components
- TypeScript types

### Performance Goals

- Metrics cards stream in: ~500ms
- Revenue chart streams in: ~1000ms
- Orders table streams in: ~1500ms
- Header renders immediately

See the main [README.md](../README.md) for detailed acceptance criteria.

Good luck! 🚀
