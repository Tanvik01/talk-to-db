import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path (on Vercel serverless, only /tmp is writable)
const dbPath = process.env.SQLITE_DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'sales.db') : path.join(__dirname, '..', 'sales.db'));
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

/**
 * Initialize Tables & Seed Initial Data
 */
export function initDatabase() {
    try {
        // 1. Create 'sales' table
        db.exec(`
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY,
                product_name TEXT NOT NULL,
                amount REAL NOT NULL,
                country TEXT NOT NULL,
                date TEXT NOT NULL
            );
        `);

        // 2. Create 'users' table for Auth (Local + GitHub)
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT,
                github_id TEXT,
                github_username TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Seed sales data if table is empty
        const countResult = db.prepare('SELECT count(*) as count FROM sales').get();
        if (countResult.count === 0) {
            console.log('🌱 Seeding initial sales data into SQLite...');
            const seedSales = [
                [1, 'Laptop', 1200.00, 'USA', '2023-01-15'],
                [2, 'Mouse', 25.50, 'India', '2023-01-16'],
                [3, 'Keyboard', 45.00, 'USA', '2023-01-17'],
                [4, 'Monitor', 300.00, 'Germany', '2023-01-18'],
                [5, 'Laptop', 1150.00, 'India', '2023-01-19'],
                [6, 'Headphones', 80.00, 'France', '2023-01-20'],
                [7, 'Mouse', 22.00, 'Germany', '2023-01-21'],
                [8, 'Webcam', 60.00, 'India', '2023-01-22'],
                [9, 'Laptop', 1300.00, 'USA', '2023-01-23'],
                [10, 'Monitor', 320.00, 'France', '2023-01-24'],
                [11, 'Keyboard', 40.00, 'India', '2023-01-25'],
                [12, 'Headphones', 85.00, 'USA', '2023-01-26'],
                [13, 'Laptop', 1250.00, 'Germany', '2023-01-27'],
                [14, 'Mouse', 30.00, 'France', '2023-01-28'],
                [15, 'Webcam', 55.00, 'USA', '2023-01-29'],
                [16, 'MacBook Air', 999.99, 'India', '2026-01-29']
            ];

            const insertStmt = db.prepare(`
                INSERT INTO sales (id, product_name, amount, country, date)
                VALUES (?, ?, ?, ?, ?)
            `);

            const insertMany = db.transaction((rows) => {
                for (const row of rows) {
                    insertStmt.run(...row);
                }
            });

            insertMany(seedSales);
            console.log(`✅ Seeded ${seedSales.length} records into 'sales' table.`);
        }

        console.log('✅ SQLite Database ready at:', dbPath);
    } catch (err) {
        console.error('❌ Error initializing SQLite database:', err);
    }
}

// Auto-run initialization
initDatabase();

/**
 * Execute a SQL query safely with parameter binding and Postgres-compatibility
 * @param {string} text - SQL Query (can contain $1, $2 or ? or raw SELECT)
 * @param {any[]} [params] - Parameter values
 * @returns {Promise<{ rows: any[], rowCount: number }>}
 */
export async function executeQuery(text, params = []) {
    try {
        if (!text || typeof text !== 'string') {
            throw new Error('Query string is required');
        }

        // Normalize Postgres specific schema references e.g. "public.sales" -> "sales"
        let cleanText = text.replace(/public\.sales/gi, 'sales').trim();

        // Convert Postgres parameter markers ($1, $2...) to SQLite (?)
        cleanText = cleanText.replace(/\$(\d+)/g, '?');

        // Remove trailing semicolon if present
        if (cleanText.endsWith(';')) {
            cleanText = cleanText.slice(0, -1).trim();
        }

        console.log('Executing SQLite query:', cleanText);

        const stmt = db.prepare(cleanText);

        // Determine if statement returns rows (SELECT or RETURNING clause)
        const isReader = stmt.reader || /RETURNING/i.test(cleanText);

        if (isReader) {
            const rows = stmt.all(...params);
            return {
                rows,
                rowCount: rows.length
            };
        } else {
            const info = stmt.run(...params);
            return {
                rows: [],
                rowCount: info.changes
            };
        }
    } catch (err) {
        console.error('❌ SQLite Query execution error:', err.message);
        throw err;
    }
}

export default db;
