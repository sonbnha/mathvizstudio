import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }
  return neon(url);
}

export const sql = (strings: TemplateStringsArray, ...values: any[]) => {
  const client = getDb();
  return client(strings, ...values);
};

export default getDb;
