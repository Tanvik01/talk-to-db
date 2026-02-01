import pg from 'pg'
const { Pool } = pg

console.log("Connecting to:", process.env.DATABASE_URL ? "NEON CLOUD" : "LOCAL DB (Check .env!)");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the connection immediately on start
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error acquiring client', err.stack);
    }
    console.log('✅ Successfully connected to Neon Cloud!');
    release();
});

// Test the connection on startup
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database')
})

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err)
})

/**
 * Execute a SQL query safely using parameterized values
 * @param {string} text - The SQL query template (use $1, $2, etc.)
 * @param {any[]} params - The values to be safely injected
 */
export async function executeQuery(text, params) {
    const client = await pool.connect();
    try {
        // Log the query template, not the raw values (good for security)
        console.log('Executing SQL Template:', text);

        // Pass params as the second argument to prevent SQL Injection
        const result = await client.query(text, params);

        return {
            rows: result.rows,
            rowCount: result.rowCount
        };
    } catch (err) {
        console.error('❌ Query execution error:', err.stack);
        throw err; // Re-throw so the calling function can handle it
    } finally {
        client.release(); // Crucial: Always return the client to the pool
    }
}

export default pool
