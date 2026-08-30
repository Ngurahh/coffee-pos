/* eslint-disable */
const { Pool } = require('pg');
require('dotenv').config();

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await p.query('DELETE FROM "user"');
  await p.query('DELETE FROM account');
  console.log('Deleted users and accounts');
  process.exit(0);
}

main();
