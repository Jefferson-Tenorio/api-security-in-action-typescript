import postgres from 'postgres';
import 'dotenv/config';

export function createConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  return postgres(connectionString);
}
