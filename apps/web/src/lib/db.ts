import { neon } from '@neondatabase/serverless';

// Placeholder prevents module-level throw during Next.js build ("Collecting page data").
// neon() does NOT open a TCP connection at init time — only when a query is executed.
// If DATABASE_URL is missing at runtime, queries will throw then (not at build time).
export const sql = neon(
  process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@placeholder.example.com/placeholder'
);
export default sql;
