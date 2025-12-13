const controller = require('../../src/modules/modul3_surat_keterangan/controller')

function createMockRes() {
  return {
    _status: 200,
    _payload: null,
    status(code) {
      this._status = code
      return this
    },
    json(obj) {
      this._payload = obj
    },
  }
}

describe('Unit: controller.getMahasiswaByNim', () => {
  it('returns 400 when nim is missing', async () => {
    const req = { query: {} }
    const res = createMockRes()
    await controller.getMahasiswaByNim(req, res)
    expect(res._status).toBe(400)
    expect(res._payload).toEqual({ message: 'nim query required' })
  })
})
