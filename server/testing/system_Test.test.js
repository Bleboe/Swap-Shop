const request = require('supertest');
const app = require('../server');

describe('System Test: Full Swap-Shop Workflow', () => {
  let aliceItemId;
  let carlosItemId;
  let sarahItemId;

  // ===== REGISTRATION & LOGIN FLOW =====
  describe('User Authentication', () => {
    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/login')
        .set('Accept', 'application/json')
        .send({ email: 'alice@lsu.edu', password: 'alice123' });
      expect(res.statusCode).toBe(302); // Redirect on success
    });

    it('should fail login with incorrect password', async () => {
      const res = await request(app)
        .post('/login')
        .set('Accept', 'application/json')
        .send({ email: 'alice@lsu.edu', password: 'wrongpassword' });
      expect(res.statusCode).toBe(401);
    });

    it('should fail login with non-.edu email', async () => {
      const res = await request(app)
        .post('/login')
        .set('Accept', 'application/json')
        .send({ email: 'hacker@gmail.com', password: 'password123' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ===== ITEM DONATION FLOW =====
  describe('Item Donation Process', () => {
    it('alice should donate a textbook', async () => {
      const res = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'System Test Calculus Textbook')
        .field('description', 'Advanced Calculus - hardcover')
        .field('category', 'Books')
        .field('condition', 'Excellent')
        .field('donor', 'alice@lsu.edu');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.item).toHaveProperty('Status', 'Pending Aproval');
      aliceItemId = res.body.item.ID;
    });

    it('carlos should donate electronics', async () => {
      const res = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'System Test Monitor')
        .field('description', '27 inch LED monitor, works perfectly')
        .field('category', 'Electronics')
        .field('condition', 'Good')
        .field('donor', 'carlos@lsu.edu');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      carlosItemId = res.body.item.ID;
    });

    it('sarah should donate furniture', async () => {
      const res = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'System Test Bookshelf')
        .field('description', 'Wooden bookshelf, 5 shelves')
        .field('category', 'Furniture')
        .field('condition', 'Good')
        .field('donor', 'sarah@lsu.edu');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      sarahItemId = res.body.item.ID;
    });
  });

  // ===== ADMIN APPROVAL FLOW =====
  describe('Admin Approval Process', () => {
    it('admin should approve alice\'s item', async () => {
      const res = await request(app)
        .post(`/admin/approve/${aliceItemId}?user=admin.mike@lsu.edu`)
        .set('Accept', 'application/json');
      expect([200, 302]).toContain(res.statusCode);
    });

    it('admin should approve carlos\'s item', async () => {
      const res = await request(app)
        .post(`/admin/approve/${carlosItemId}?user=admin.mike@lsu.edu`)
        .set('Accept', 'application/json');
      expect([200, 302]).toContain(res.statusCode);
    });

    it('admin should reject sarah\'s item', async () => {
      const res = await request(app)
        .get(`/admin/reject/${sarahItemId}?user=admin.mike@lsu.edu`)
        .set('Accept', 'application/json');
      expect([200, 302]).toContain(res.statusCode);
    });

    it('only admin users can approve items', async () => {
      const res = await request(app)
        .post(`/admin/approve/999?user=alice@lsu.edu`)
        .set('Accept', 'application/json');
      expect(res.statusCode).toBe(302); // Non-admin gets redirected
    });
  });

  // ===== ITEM RESERVATION FLOW =====
  describe('Item Reservation and Swap', () => {
    it('james should reserve alice\'s approved textbook', async () => {
      const res = await request(app)
        .post('/api/reserve')
        .set('Accept', 'application/json')
        .send({
          id: aliceItemId,
          user: 'james@lsu.edu'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('sarah should reserve carlos\'s approved monitor', async () => {
      const res = await request(app)
        .post('/api/reserve')
        .set('Accept', 'application/json')
        .send({
          id: carlosItemId,
          user: 'sarah@lsu.edu'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('other users should not be able to reserve already reserved items', async () => {
      const res = await request(app)
        .post('/api/reserve')
        .set('Accept', 'application/json')
        .send({
          id: aliceItemId,
          user: 'carlos@lsu.edu'
        });

      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ===== ITEM STATUS UPDATE FLOW =====
  describe('Item Status Management', () => {
    it('alice should mark her item as taken after swap completion', async () => {
      const res = await request(app)
        .post('/api/update-status')
        .set('Accept', 'application/json')
        .send({
          id: aliceItemId,
          status: 'Taken',
          user: 'alice@lsu.edu'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('carlos should mark his item as available again', async () => {
      const res = await request(app)
        .post('/api/update-status')
        .set('Accept', 'application/json')
        .send({
          id: carlosItemId,
          status: 'Available',
          user: 'carlos@lsu.edu'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('only item donor can update item status', async () => {
      const res = await request(app)
        .post('/api/update-status')
        .set('Accept', 'application/json')
        .send({
          id: aliceItemId,
          status: 'Available',
          user: 'james@lsu.edu' // Not the donor
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ===== ACCESS CONTROL =====
  describe('Access Control & Security', () => {
    it('unauthenticated user should not access dashboard', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Accept', 'application/json');

      // Should either redirect or return error
      expect([301, 302, 307, 308, 401, 403]).toContain(res.statusCode);
    });

    it('non-admin should not access admin page', async () => {
      const res = await request(app)
        .get('/admin?user=alice@lsu.edu')
        .set('Accept', 'application/json');

      expect(res.statusCode).not.toBe(200);
    });

    it('admin should access admin page', async () => {
      const res = await request(app)
        .get('/admin?user=admin.mike@lsu.edu')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
    });

    it('student should not delete items', async () => {
      const res = await request(app)
        .post(`/admin/delete/1?user=alice@lsu.edu`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(302); // Non-admin gets redirected
    });
  });

  // ===== ERROR HANDLING =====
  describe('Error Handling', () => {
    it('should handle invalid item ID gracefully', async () => {
      const res = await request(app)
        .post('/api/reserve')
        .set('Accept', 'application/json')
        .send({
          id: 99999,
          user: 'alice@lsu.edu'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should require valid .edu email for login', async () => {
      const res = await request(app)
        .post('/login')
        .set('Accept', 'application/json')
        .send({ email: 'test@yahoo.com', password: 'password123' });

      expect(res.statusCode).toBe(401);
    });

    it('should not allow donation without required fields', async () => {
      const res = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'Incomplete Item')
        .field('donor', 'alice@lsu.edu');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ===== DATA INTEGRITY =====
  describe('Data Integrity', () => {
    it('item should have correct donor after donation', async () => {
      const res = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'Integrity Test Item')
        .field('description', 'Testing data integrity')
        .field('category', 'Books')
        .field('condition', 'Good')
        .field('donor', 'james@lsu.edu');

      expect(res.statusCode).toBe(200);
      expect(res.body.item.Donor).toBe('james@lsu.edu');
      expect(res.body.item.Status).toBe('Pending Aproval');
      expect(res.body.item.ReservedBy).toBeNull();
    });

    it('reservation should update item status correctly', async () => {
      // First donate an item
      const donateRes = await request(app)
        .post('/api/donate')
        .set('Accept', 'application/json')
        .field('title', 'Reservation Test Item')
        .field('description', 'For reservation testing')
        .field('category', 'Electronics')
        .field('condition', 'Excellent')
        .field('donor', 'carlos@lsu.edu');

      const itemId = donateRes.body.item.ID;

      // Approve it
      await request(app)
        .post(`/admin/approve/${itemId}?user=admin.mike@lsu.edu`)
        .set('Accept', 'application/json');

      // Reserve it
      const reserveRes = await request(app)
        .post('/api/reserve')
        .set('Accept', 'application/json')
        .send({ id: itemId, user: 'sarah@lsu.edu' });

      expect(reserveRes.statusCode).toBe(200);
      expect(reserveRes.body.success).toBe(true);
    });
  });
});
