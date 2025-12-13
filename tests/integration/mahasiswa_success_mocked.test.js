const request = require('supertest')
const app = require('../../src/app')
const service = require('../../src/modules/modul3_surat_keterangan/service')

describe('Integration: GET /api/mahasiswa (mocked service)', () => {
  it('returns 200 and mapped fields when nim is found', async () => {
    jest.spyOn(service, 'findMahasiswaByNim').mockResolvedValue({
      nim: '1234567890',
      nama: 'Budi Setiawan',
      prodi: 'Teknik Informatika',
      angkatan: 2023,
      status: 'aktif',
      email: 'budi.setiawan@example.com',
    })

    const res = await request(app).get('/api/mahasiswa').query({ nim: '1234567890' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      nim: '1234567890',
      namaMahasiswa: 'Budi Setiawan',
      programStudi: 'Teknik Informatika',
      status: 'Aktif',
      tahunAkademik: '2023/2024',
      email: 'budi.setiawan@example.com',
    })
  })
})

