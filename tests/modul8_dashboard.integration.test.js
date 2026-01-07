const request = require('supertest');
const app = require('../src/app');
const service = require('../src/modules/modul8_dashboard/service');

// Mock Database Config
jest.mock('../src/config/database', () => ({
    authenticate: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
    }),
}));

// Mock Service
jest.mock('../src/modules/modul8_dashboard/service');

describe('Integration Test: Modul 8 Dashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/dashboard/login', () => {
        it('should login successfully', async () => {
            service.loginService.mockResolvedValue({
                token: 'mock_token',
                user: { id: 1, username: 'admin' }
            });

            const res = await request(app)
                .post('/api/dashboard/login')
                .send({
                    username: 'admin',
                    password: 'password'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBe('mock_token');
        });

        it('should fail login', async () => {
            service.loginService.mockRejectedValue(new Error('User tidak ditemukan'));

            const res = await request(app)
                .post('/api/dashboard/login')
                .send({
                    username: 'wrong',
                    password: 'password'
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/dashboard/users', () => {
        it('should list users', async () => {
            service.getAllUsersService.mockResolvedValue([
                { id: 1, username: 'admin' }
            ]);

            const res = await request(app)
                .get('/api/dashboard/users');

            expect(res.statusCode).toBe(200);
            expect(res.body.users).toHaveLength(1);
        });
    });

    describe('POST /api/dashboard/users', () => {
        it('should create user', async () => {
            service.createUserService.mockResolvedValue({
                id: 2,
                username: 'newuser'
            });

            const res = await request(app)
                .post('/api/dashboard/users')
                .send({
                    username: 'newuser',
                    password: '123'
                });

            expect(res.statusCode).toBe(201);
        });
    });
});
