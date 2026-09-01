import request from 'supertest';
import app from '../app.js';

describe('API Endpoints Suite', () => {
    let authToken;

    beforeAll(async () => {
        const guestRes = await request(app).post('/api/auth/guest');
        authToken = guestRes.body.token;
    });

    test('GET /health should return status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    test('POST /api/auth/guest should return a valid guest token and user', async () => {
        const res = await request(app).post('/api/auth/guest');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('email', 'guest@demo.local');
        expect(res.body.user).toHaveProperty('username');
    });

    test('POST /api/auth/signup & POST /api/auth/login flow', async () => {
        const testEmail = `user_${Date.now()}@test.com`;
        const testPassword = 'Password123!';

        // Signup
        const signupRes = await request(app)
            .post('/api/auth/signup')
            .send({ email: testEmail, password: testPassword });

        expect(signupRes.status).toBe(201);
        expect(signupRes.body).toHaveProperty('user');
        expect(signupRes.body.user.email).toBe(testEmail);

        // Login
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testEmail, password: testPassword });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
        expect(loginRes.body.user.email).toBe(testEmail);
    });

    test('POST /api/query requires authentication', async () => {
        const res = await request(app)
            .post('/api/query')
            .send({ sql: 'SELECT * FROM sales LIMIT 5' });

        expect(res.status).toBe(401);
    });

    test('POST /api/query executes valid SELECT query with auth token', async () => {
        const res = await request(app)
            .post('/api/query')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sql: 'SELECT * FROM sales LIMIT 5' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('rows');
        expect(res.body.rows.length).toBeLessThanOrEqual(5);
        expect(res.body.rowCount).toBe(res.body.rows.length);
    });

    test('POST /api/query rejects non-SELECT queries for safety', async () => {
        const res = await request(app)
            .post('/api/query')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ sql: 'DROP TABLE sales' });

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});
