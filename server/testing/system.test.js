const request = require('supertest');
const app = require('../server');

describe('System Test: Full Swap-Shop Workflow', () => {
    let aliceItemId;
    let carlosItemId;

    // AUTHENTICATION
    describe('User Authentication', () => {
        it('should login with correct .edu credentials', async () => {
            const res = await request(app)
                .post('/login')
                .set('Accept', 'application/json')
                .send({ email: 'alice@lsu.edu', password: 'alice123' });
            expect(res.statusCode).toBe(302);
        });

        it('should reject login with incorrect password', async () => {
            const res = await request(app)
                .post('/login')
                .set('Accept', 'application/json')
                .send({ email: 'alice@lsu.edu', password: 'wrongpassword' });
            expect(res.statusCode).toBe(401);
        });

        it('should reject non-.edu email login', async () => {
            const res = await request(app)
                .post('/login')
                .set('Accept', 'application/json')
                .send({ email: 'hacker@gmail.com', password: 'password123' });
            expect(res.statusCode).toBe(401);
        });
    });

    // DONATION
    describe('Item Donation', () => {
        it('alice should donate an item', async () => {
            const res = await request(app)
                .post('/api/donate')
                .set('Accept', 'application/json')
                .field('title', 'Calculus Textbook')
                .field('description', 'Advanced Calculus - hardcover')
                .field('category', 'Books')
                .field('condition', 'Excellent')
                .field('donor', 'alice@lsu.edu');

            expect(res.statusCode).toBe(200);
            expect(res.body.item).toHaveProperty('Status', 'Pending Aproval');
            aliceItemId = res.body.item.ID;
        });

        it('should reject donation with missing fields', async () => {
            const res = await request(app)
                .post('/api/donate')
                .set('Accept', 'application/json')
                .field('title', 'Incomplete Item')
                .field('donor', 'alice@lsu.edu');

            expect(res.statusCode).toBe(400);
        });
    });

    // ADMIN APPROVAL
    describe('Admin Approval', () => {
        it('admin should approve item', async () => {
            const res = await request(app)
                .post(`/admin/approve/${aliceItemId}?user=admin.mike@lsu.edu`)
                .set('Accept', 'application/json');
            expect([200, 302]).toContain(res.statusCode);
        });

        it('non-admin cannot approve items', async () => {
            const res = await request(app)
                .post(`/admin/approve/1?user=alice@lsu.edu`)
                .set('Accept', 'application/json');
            expect(res.statusCode).toBe(302);
        });
    });

    // RESERVATION 
    describe('Item Reservation', () => {
        it('user can reserve approved item', async () => {
            const res = await request(app)
                .post('/api/reserve')
                .set('Accept', 'application/json')
                .send({ id: aliceItemId, user: 'carlos@lsu.edu' });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('success', true);
        });

        it('cannot reserve already reserved item', async () => {
            const res = await request(app)
                .post('/api/reserve')
                .set('Accept', 'application/json')
                .send({ id: aliceItemId, user: 'sarah@lsu.edu' });

            expect(res.body.success).toBe(false);
        });
    });

    // STATUS UPDATES 
    describe('Item Status Management', () => {
        it('donor can mark item as taken', async () => {
            const res = await request(app)
                .post('/api/update-status')
                .set('Accept', 'application/json')
                .send({ id: aliceItemId, status: 'Taken', user: 'alice@lsu.edu' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('non-donor cannot update item status', async () => {
            const res = await request(app)
                .post('/api/update-status')
                .set('Accept', 'application/json')
                .send({ id: aliceItemId, status: 'Available', user: 'carlos@lsu.edu' });

            expect(res.body.success).toBe(false);
        });
    });

    // ACCESS CONTROL 
    describe('Access Control', () => {
        it('admin can access admin page', async () => {
            const res = await request(app)
                .get('/admin?user=admin.mike@lsu.edu')
                .set('Accept', 'application/json');
            expect(res.statusCode).toBe(200);
        });

        it('student cannot access admin page', async () => {
            const res = await request(app)
                .get('/admin?user=alice@lsu.edu')
                .set('Accept', 'application/json');
            expect(res.statusCode).not.toBe(200);
        });
    });
});