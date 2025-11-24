const request = require('supertest');
const app = require('../server'); // Adjust if your server exports differently

describe('POST /login', () => {
    it('should fail with incorrect email', async () => {
        const res = await request(app)
            .post('/login')
            .set('Accept', 'application/json')
            .send({ email: 'wrong@example.com', password: 'alice123' });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    it('should fail with incorrect password', async () => {
        const res = await request(app)
            .post('/login')
            .set('Accept', 'application/json')
            .send({ email: 'alice@lsu.edu', password: 'wrongpassword' });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('error');
    });
});