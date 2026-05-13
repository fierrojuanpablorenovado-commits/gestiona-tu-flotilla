import { neon } from '@neondatabase/serverless';
const DATABASE_URL = 'postgresql://neondb_owner:npg_WMvjA7k5qDQb@ep-cool-hall-anhmg3pd-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);
const TID = '5f3faf9d-cc84-4112-9128-ef0d6d555e1b';

// Todos los choferes tienen 5.00/100 que son valores de semilla perfecta.
// JP pidió que el rating por defecto sea ~4 (realista Didi).
// Actualizamos: rating = 4.8 (buen chofer Didi), score = 85 (bueno, no perfecto)
const result = await sql`
  UPDATE drivers
  SET
    rating = 4.8,
    score  = 85
  WHERE tenant_id = ${TID}
    AND rating = 5.00
    AND score  = 100
  RETURNING first_name, last_name, rating, score
`;
console.log('Actualizados:', result.length, 'choferes');
result.forEach(d => console.log(' -', d.first_name, d.last_name, '→ rating:', d.rating, 'score:', d.score));
