import bcrypt from 'bcrypt';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';
import { neon } from '@neondatabase/serverless';

// Initialize Neon client
console.log('sql', process.env.DATABASE_URL);
const sql = neon(process.env.DATABASE_URL!);

async function seedUsers() {
  return [
    sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `,
    ...users.map((user) => {
      const hashedPassword = bcrypt.hashSync(user.password, 10); // Hash password synchronously
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  ];
}

async function seedCustomers() {
  return [
    sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `,
    ...customers.map((customer) =>
      sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `
    ),
  ];
}

async function seedInvoices() {
  return [
    sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `,
    ...invoices.map((invoice) =>
      sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `
    ),
  ];
}

async function seedRevenue() {
  return [
    sql`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `,
    ...revenue.map((rev) =>
      sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `
    ),
  ];
}
export async function GET() {
  try {
    // Collect all queries from the seed functions
    const userQueries = await seedUsers();
    const customerQueries = await seedCustomers();
    const invoiceQueries = await seedInvoices();
    const revenueQueries = await seedRevenue();

    // Execute all queries in a transaction
    await sql.transaction(() => [
      ...userQueries,
      ...customerQueries,
      ...invoiceQueries,
      ...revenueQueries,
    ]);

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Database seeding error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}