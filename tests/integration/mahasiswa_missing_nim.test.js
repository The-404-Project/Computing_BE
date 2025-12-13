const request = require('supertest')
const app = require('../../src/app')

describe('Integration: GET /api/mahasiswa', () => {
  it('returns 400 when nim is missing', async () => {
    const res = await request(app).get('/api/mahasiswa')
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'nim query required' })
  })
})
