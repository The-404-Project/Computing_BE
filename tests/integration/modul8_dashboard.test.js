
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const authUtils = require('../../src/utils/auth');

jest.mock('../../src/models/User');
jest.mock('../../src/utils/auth');

describe('Integration: Modul 8 Dashboard (Auth)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('POST /api/auth/login should return token on success', async () => {
        User.findOne.mockResolvedValue({
            user_id: 1,
            username: 'admin',
            password_hash: 'hashed_pw',
            role: 'admin',
            full_name: 'Admin User',
            email: 'admin@test.com'
        });
        authUtils.verifyPassword.mockResolvedValue(true);
        authUtils.generateToken.mockReturnValue('mock-jwt-token');

        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'password' })
            .expect(200);

        expect(res.body).toEqual({
            message: 'Login berhasil',
            token: 'mock-jwt-token',
            user: expect.objectContaining({ username: 'admin' })
        });
    });

    it('POST /api/auth/login should fail with wrong password', async () => {
        User.findOne.mockResolvedValue({
            user_id: 1,
            username: 'admin',
            password_hash: 'hashed_pw'
        });
        authUtils.verifyPassword.mockResolvedValue(false);

        await request(app)
            .post('/api/auth/login')
            .send({ username: 'admin', password: 'wrong' })
            .expect(401);
    });
});
