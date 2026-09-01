import { executeQuery, initDatabase } from '../config/database.js';

describe('SQLite Database Layer', () => {
    beforeAll(() => {
        initDatabase();
    });

    test('should fetch seeded sales records', async () => {
        const result = await executeQuery('SELECT * FROM sales');
        expect(result).toBeDefined();
        expect(Array.isArray(result.rows)).toBe(true);
        expect(result.rowCount).toBeGreaterThan(0);
        expect(result.rows[0]).toHaveProperty('product_name');
        expect(result.rows[0]).toHaveProperty('amount');
        expect(result.rows[0]).toHaveProperty('country');
    });

    test('should execute parameterized queries with Postgres $1 syntax', async () => {
        const result = await executeQuery('SELECT * FROM sales WHERE country = $1', ['India']);
        expect(result.rowCount).toBeGreaterThan(0);
        result.rows.forEach(row => {
            expect(row.country).toBe('India');
        });
    });

    test('should handle aggregation queries (GROUP BY, SUM)', async () => {
        const result = await executeQuery(
            'SELECT country, SUM(amount) AS total_amount FROM sales GROUP BY country ORDER BY total_amount DESC'
        );
        expect(result.rowCount).toBeGreaterThan(0);
        expect(result.rows[0]).toHaveProperty('total_amount');
    });

    test('should handle user creation with RETURNING clause', async () => {
        const testEmail = `test_${Date.now()}@example.com`;
        const insertResult = await executeQuery(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
            [testEmail, 'hashedPassword123']
        );
        expect(insertResult.rowCount).toBe(1);
        expect(insertResult.rows[0].email).toBe(testEmail);
        expect(insertResult.rows[0].id).toBeDefined();

        const findResult = await executeQuery(
            'SELECT * FROM users WHERE email = $1',
            [testEmail]
        );
        expect(findResult.rowCount).toBe(1);
        expect(findResult.rows[0].email).toBe(testEmail);
    });
});
