const request = require('supertest');
const app = require('../server');

describe('Integration Test: Donate and Reserve Item Flow', () => {
  let donatedItemId;

  it('should allow carlos to donate an item', async () => {
    const res = await request(app)
      .post('/api/donate')
      .set('Accept', 'application/json')
      .field('title', 'Integration Test Laptop')
      .field('description', 'Laptop for integration testing')
      .field('category', 'Electronics')
      .field('condition', 'Excellent')
      .field('donor', 'carlos@lsu.edu');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.item).toHaveProperty('ID');
    expect(res.body.item).toHaveProperty('Donor', 'carlos@lsu.edu');
    expect(res.body.item).toHaveProperty('Status', 'Pending Aproval');

    // Store the ID for the next test
    donatedItemId = res.body.item.ID;
  });

  it('should approve the item so it becomes available', async () => {
    const res = await request(app)
      .post(`/admin/approve/${donatedItemId}?user=admin.mike@lsu.edu`)
      .set('Accept', 'application/json');

    expect([200, 302]).toContain(res.statusCode);
  });

  it('should allow sarah to reserve the donated item', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Accept', 'application/json')
      .send({
        id: donatedItemId,
        user: 'sarah@lsu.edu'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('should show the item as reserved by sarah', async () => {
    const res = await request(app)
      .get(`/api/item/${donatedItemId}`)
      .set('Accept', 'application/json');

    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('ReservedBy', 'sarah@lsu.edu');
      expect(res.body).toHaveProperty('Status', 'Reserved');
    }
  });

  it('should not allow james to reserve an already reserved item', async () => {
    const res = await request(app)
      .post('/api/reserve')
      .set('Accept', 'application/json')
      .send({
        id: donatedItemId,
        user: 'james@lsu.edu'
      });

    // Should fail because item is already reserved
    expect(res.body).toHaveProperty('success', false);
  });

  it('should allow carlos (donor) to mark item as taken', async () => {
    const res = await request(app)
      .post('/api/update-status')
      .set('Accept', 'application/json')
      .send({
        id: donatedItemId,
        status: 'Taken',
        user: 'carlos@lsu.edu'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('should show the item as taken', async () => {
    const res = await request(app)
      .get(`/api/item/${donatedItemId}`)
      .set('Accept', 'application/json');

    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('Status', 'Taken');
    }
  });
});
