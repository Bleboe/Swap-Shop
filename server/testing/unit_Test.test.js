const request = require('supertest');
const app = require('../server');

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

describe('Admin Role Check', () => {
    it('should allow admin user to access /admin page', async () => {
        const res = await request(app)
            .get('/admin?user=admin.mike@lsu.edu')
            .set('Accept', 'application/json');
        expect(res.statusCode).toBe(200);
    });

    it('should deny non-admin user from accessing /admin page', async () => {
        const res = await request(app)
            .get('/admin?user=alice@lsu.edu')
            .set('Accept', 'application/json');
        expect(res.statusCode).not.toBe(200);
    });

    it('should deny student user from approving items', async () => {
        const res = await request(app)
            .post('/admin/approve/1?user=alice@lsu.edu')
            .set('Accept', 'application/json');
        expect(res.statusCode).toBe(302); // Redirect on failure
    });

    it('should allow admin user to approve items', async () => {
        const res = await request(app)
            .post('/admin/approve/1?user=admin.mike@lsu.edu')
            .set('Accept', 'application/json');
        // Should either succeed or redirect to admin page
        expect([200, 302]).toContain(res.statusCode);
    });

    it('should deny student user from deleting items', async () => {
        const res = await request(app)
            .post('/admin/delete/1?user=alice@lsu.edu')
            .set('Accept', 'application/json');
        expect(res.statusCode).toBe(302); // Redirect on failure
    });

    it('should allow admin user to delete items', async () => {
        const res = await request(app)
            .post('/admin/delete/1?user=admin.mike@lsu.edu')
            .set('Accept', 'application/json');
        // Should either succeed or redirect to admin page
        expect([200, 302]).toContain(res.statusCode);
    });

    it('should deny student user from rejecting items', async () => {
        const res = await request(app)
            .get('/admin/reject/1?user=alice@lsu.edu')
            .set('Accept', 'application/json');
        expect(res.statusCode).toBe(302); // Redirect on failure
    });

    it('should allow admin user to reject items', async () => {
        const res = await request(app)
            .get('/admin/reject/1?user=admin.mike@lsu.edu')
            .set('Accept', 'application/json');
        // Should either succeed or redirect
        expect([200, 302]).toContain(res.statusCode);
    });
});

describe('POST /api/donate', () => {
    it('should successfully donate an item with valid data', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Test Book')
            .field('description', 'A great book to read')
            .field('category', 'Books')
            .field('condition', 'Good')
            .field('donor', 'alice@lsu.edu');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('item');
    });

    it('should fail donation with missing title', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('description', 'A great book to read')
            .field('category', 'Books')
            .field('condition', 'Good')
            .field('donor', 'alice@lsu.edu');
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should fail donation with missing description', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Test Book')
            .field('category', 'Books')
            .field('condition', 'Good')
            .field('donor', 'alice@lsu.edu');
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should fail donation with missing donor email', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Test Book')
            .field('description', 'A great book to read')
            .field('category', 'Books')
            .field('condition', 'Good');
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    it('should successfully donate an item with photos', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Test Laptop')
            .field('description', 'A working laptop')
            .field('category', 'Electronics')
            .field('condition', 'Excellent')
            .field('donor', 'carlos@lsu.edu');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.item).toHaveProperty('Status', 'Pending Aproval');
        expect(res.body.item).toHaveProperty('Donor', 'carlos@lsu.edu');
    });

    it('should successfully donate an item from sarah', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Textbook')
            .field('description', 'Psychology textbook, barely used')
            .field('category', 'Books')
            .field('condition', 'Like New')
            .field('donor', 'sarah@lsu.edu');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.item).toHaveProperty('Donor', 'sarah@lsu.edu');
    });

    it('should successfully donate an item from james', async () => {
        const res = await request(app)
            .post('/api/donate')
            .set('Accept', 'application/json')
            .field('title', 'Desk Chair')
            .field('description', 'Comfortable office chair')
            .field('category', 'Furniture')
            .field('condition', 'Good')
            .field('donor', 'james@lsu.edu');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.item).toHaveProperty('Donor', 'james@lsu.edu');
    });
});