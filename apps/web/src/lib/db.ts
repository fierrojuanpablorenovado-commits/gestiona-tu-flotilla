import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurado en las variables de entorno.');
}

export const sql = neon(connectionString);
export default sql;
