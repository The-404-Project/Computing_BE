const request = require('supertest')
const app = require('../../src/app')
const service = require('../../src/modules/modul3_surat_keterangan/service')

describe('Integration: POST /api/surat-keterangan/aktif/generate', () => {
  it('returns 400 when body missing fields', async () => {
    const res = await request(app).post('/api/surat-keterangan/aktif/generate').send({})
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'nim, nomor_surat, dan keperluan wajib diisi' })
  })

  it('returns 200 and file info when generation succeeds', async () => {
    jest.spyOn(service, 'generateSuratAktif').mockResolvedValue({
      fileName: 'SK-IF-2024-03-0123.docx',
      filePath: 'd:/Kuliah/Semester 7/Computing Project/Computing_BE/output/generated_documents/SK-IF-2024-03-0123.docx',
    })
    const res = await request(app)
      .post('/api/surat-keterangan/aktif/generate')
      .send({ nim: '1234567890', nomor_surat: 'SK-IF-2024-03-0123', keperluan: 'Pengajuan Beasiswa Prestasi Gemilang 2024' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ message: 'Dokumen berhasil dibuat', fileName: expect.any(String), filePath: expect.any(String) })
  })
})

