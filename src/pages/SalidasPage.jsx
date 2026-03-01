import { useState, useEffect } from 'react'
import { Card, Input, Select, Button } from '../components/UI'
import { IconFuel, IconUser } from '../components/Icons'
import { createExit, getStats, getStaffMembers } from '../lib/database'
import { nowLocal, isFutureDate, formatVolume } from '../lib/utils'

export default function SalidasPage({ user, showToast }) {
  const isAdmin = user.role === 'admin'
  const [staffList, setStaffList] = useState([])
  const [stock, setStock] = useState({ diesel: 0, agricola: 0 })
  const [form, setForm] = useState({
    date: nowLocal(),
    product: 'Diesel',
    volume: '',
    refuel_type: 'Vehículo',
    plate: user.plates?.[0] || '',
    staff_id: user.id,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Cargar stock actual
    getStats().then(s => {
      setStock({ diesel: s.diesel.stock, agricola: s.agricola.stock })
    }).catch(() => {})
    // Si es admin, cargar lista de personal
    if (isAdmin) {
      getStaffMembers().then(data => setStaffList(data || [])).catch(() => {})
    }
  }, [isAdmin])

  const selectedStaff = isAdmin
    ? staffList.find(s => s.id === form.staff_id) || user
    : user

  const needsPlate = form.refuel_type === 'Vehículo'
  const currentStock = form.product === 'Diesel' ? stock.diesel : stock.agricola

  const validate = () => {
    const e = {}
    if (!form.date) e.date = 'Requerido'
    if (isFutureDate(form.date)) e.date = 'No puede ser fecha futura'
    const vol = parseFloat(form.volume)
    if (!form.volume || vol <= 0) e.volume = 'Debe ser mayor que 0'
    else if (vol > currentStock) e.volume = `Stock insuficiente. Disponible: ${formatVolume(currentStock)}L`
    if (needsPlate && !form.plate.trim()) e.plate = 'Matrícula requerida para vehículos'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await createExit({
        staff_id: form.staff_id,
        staff_name: selectedStaff.name,
        date: form.date,
        product: form.product,
        volume: form.volume,
        refuel_type: form.refuel_type,
        plate: needsPlate ? form.plate : null,
      })
      // Actualizar stock local
      const vol = parseFloat(form.volume)
      setStock(prev => ({
        ...prev,
        [form.product === 'Diesel' ? 'diesel' : 'agricola']:
          (form.product === 'Diesel' ? prev.diesel : prev.agricola) - vol
      }))
      setForm({
        date: nowLocal(),
        product: 'Diesel',
        volume: '',
        refuel_type: 'Vehículo',
        plate: selectedStaff.plates?.[0] || '',
        staff_id: form.staff_id,
      })
      setErrors({})
      showToast('Salida registrada correctamente')
    } catch (err) {
      showToast(err.message || 'Error al registrar', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (newType) => {
    setForm({
      ...form,
      refuel_type: newType,
      plate: newType === 'Vehículo' ? (selectedStaff.plates?.[0] || '') : '',
    })
  }

  const handleStaffChange = (e) => {
    const sid = e.target.value
    const s = staffList.find(x => x.id === sid)
    setForm({
      ...form,
      staff_id: sid,
      plate: s?.plates?.[0] || '',
    })
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="animate-fade-in">
      <h2 className="text-[22px] font-extrabold tracking-tight mb-1">
        <span className="text-red-400">−</span> Salida de Combustible
      </h2>
      <p className="text-[13px] text-gray-500 mb-5">Registro de repostaje</p>

      {/* Stock indicator */}
      <div className="flex gap-3 mb-4">
        <div className={`flex-1 p-3 rounded-lg border text-center ${
          stock.diesel > 50 ? 'border-olive-700/40 bg-olive-500/10' : 'border-red-700/40 bg-red-500/10'
        }`}>
          <div className="text-xs text-gray-400 mb-0.5">Diesel</div>
          <div className={`text-lg font-bold font-mono ${stock.diesel > 50 ? 'text-olive-400' : 'text-red-400'}`}>
            {formatVolume(stock.diesel)}L
          </div>
        </div>
        <div className={`flex-1 p-3 rounded-lg border text-center ${
          stock.agricola > 50 ? 'border-yellow-700/40 bg-yellow-500/10' : 'border-red-700/40 bg-red-500/10'
        }`}>
          <div className="text-xs text-gray-400 mb-0.5">D. Agrícola</div>
          <div className={`text-lg font-bold font-mono ${stock.agricola > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {formatVolume(stock.agricola)}L
          </div>
        </div>
      </div>

      <Card className="mb-4">
        {/* Selector de operario (solo admin) */}
        {isAdmin && staffList.length > 0 ? (
          <Select label="Registrar para" value={form.staff_id} onChange={handleStaffChange}
            options={staffList.map(s => ({ value: s.id, label: `${s.name} (${s.role})` }))} />
        ) : (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-olive-500/10 rounded-lg mb-4">
            <IconUser size={16} className="text-olive-500" />
            <span className="text-sm font-semibold text-olive-400">{user.name}</span>
          </div>
        )}

        <Input label="Fecha y hora" type="datetime-local" value={form.date}
          max={nowLocal()} error={errors.date} onChange={set('date')} />

        <Select label="Producto" value={form.product} onChange={set('product')}
          options={[
            { value: 'Diesel', label: `Diesel (${formatVolume(stock.diesel)}L disponible)` },
            { value: 'Diesel Agrícola', label: `Diesel Agrícola (${formatVolume(stock.agricola)}L disponible)` },
          ]} />

        <Input label="Volumen (litros)" type="number" step="0.1" min="0"
          placeholder="0.0" value={form.volume} error={errors.volume} onChange={set('volume')} />

        {/* Tipo de repostaje */}
        <div className="mb-4">
          <label className="block text-[13px] text-gray-400 mb-1.5 font-medium">
            Tipo de repostaje
          </label>
          <div className="flex gap-2">
            {['Vehículo', 'Garrafa', 'Depósito'].map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-[13px] font-semibold
                  transition-all cursor-pointer
                  ${form.refuel_type === type
                    ? 'border-olive-500 bg-olive-500/10 text-olive-400'
                    : 'border-dark-border bg-dark text-gray-500 hover:border-dark-border-light'
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Matrícula */}
        {needsPlate && (
          <div className="mb-4">
            <label className="block text-[13px] text-gray-400 mb-1.5 font-medium">
              Matrícula
            </label>

            {selectedStaff.plates && selectedStaff.plates.length > 1 && (
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {selectedStaff.plates.map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, plate: p })}
                    className={`px-3 py-1.5 rounded-md text-[13px] font-semibold font-mono
                      border transition-all cursor-pointer
                      ${form.plate === p
                        ? 'border-olive-500 bg-olive-500/10 text-olive-400'
                        : 'border-dark-border bg-dark text-gray-500'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={form.plate}
              placeholder="1234ABC"
              onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
              className={`w-full px-3.5 py-2.5 bg-dark border rounded-lg text-[15px] text-gray-100
                font-mono tracking-wider outline-none transition-colors
                ${errors.plate ? 'border-red-500' : 'border-dark-border focus:border-olive-500'}`}
            />
            {errors.plate && <p className="text-red-500 text-xs mt-1">{errors.plate}</p>}
          </div>
        )}

        <Button fullWidth onClick={handleSubmit} loading={loading}>
          <IconFuel size={18} /> Registrar Salida
        </Button>
      </Card>
    </div>
  )
}
