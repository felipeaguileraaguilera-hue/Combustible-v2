import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Modal, Badge, EmptyState, ConfirmDialog, Spinner } from '../components/UI'
import { IconPlus, IconTrash, IconEdit } from '../components/Icons'
import { getStaffMembers, updateStaffMember, deactivateStaffMember } from '../lib/database'
import { createStaffMember } from '../lib/auth'

const EMPTY_FORM = { name: '', phone: '', plates: '', role: 'operario' }

export default function UsuariosPage({ showToast }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null) // null = crear, object = editar
  const [showConfirm, setShowConfirm] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const loadUsers = async () => {
    try {
      const data = await getStaffMembers()
      setUsers(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({
      name: u.name,
      phone: u.phone,
      plates: (u.plates || []).join(', '),
      role: u.role,
    })
    setErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Requerido'
    const cleaned = form.phone.replace(/\s/g, '')
    if (!cleaned || cleaned.length < 6) e.phone = 'Teléfono inválido'
    // Al crear, comprobar duplicados
    if (!editUser && users.find((u) => u.phone === cleaned)) e.phone = 'Teléfono ya registrado'
    // Al editar, comprobar duplicados excluyendo el propio
    if (editUser && users.find((u) => u.phone === cleaned && u.id !== editUser.id)) e.phone = 'Teléfono ya registrado'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setSaving(true)
    try {
      const plates = form.plates
        .split(',')
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean)

      if (editUser) {
        // Actualizar
        await updateStaffMember(editUser.id, {
          name: form.name.trim(),
          phone: cleaned,
          plates,
          role: form.role,
        })
        showToast('Usuario actualizado correctamente')
      } else {
        // Crear
        await createStaffMember({
          name: form.name.trim(),
          phone: cleaned,
          plates,
          role: form.role,
        })
        showToast('Operario creado correctamente')
      }

      setShowModal(false)
      setForm(EMPTY_FORM)
      setEditUser(null)
      setErrors({})
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userId) => {
    try {
      await deactivateStaffMember(userId)
      showToast('Usuario desactivado', 'info')
      loadUsers()
    } catch (err) {
      showToast(err.message || 'Error al eliminar', 'error')
    }
    setShowConfirm(null)
  }

  if (loading) return <Spinner />

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[22px] font-extrabold tracking-tight">Personal</h2>
          <p className="text-[13px] text-gray-500 mt-1">
            {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button small onClick={openCreate}>
          <IconPlus size={16} /> Nuevo
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 stagger-children">
        {users.map((u) => (
          <Card key={u.id} className="!p-3.5">
            <div className="flex justify-between items-start">
              <div className="flex gap-3 items-center cursor-pointer" onClick={() => openEdit(u)}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base
                  ${u.role === 'admin'
                    ? 'bg-olive-500/12 text-olive-500'
                    : u.role === 'repartidor'
                      ? 'bg-blue-500/12 text-blue-500'
                      : 'bg-surface-alt text-gray-500'
                  }`}>
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[15px] font-semibold">{u.name}</div>
                  <div className="text-[13px] text-gray-500 font-mono">{u.phone}</div>
                  {u.plates && u.plates.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.plates.map((p) => (
                        <Badge key={p} color="gray">{p}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={u.role === 'admin' ? 'olive' : u.role === 'repartidor' ? 'blue' : 'yellow'}>
                  {u.role === 'admin' ? 'Admin' : u.role === 'repartidor' ? 'Repartidor' : 'Operario'}
                </Badge>
                <button
                  onClick={() => openEdit(u)}
                  className="text-gray-600 hover:text-olive-400 transition-colors bg-transparent border-none cursor-pointer p-1"
                >
                  <IconEdit size={16} />
                </button>
                {u.role !== 'admin' && (
                  <button
                    onClick={() => setShowConfirm(u)}
                    className="text-gray-600 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-1"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Crear / Editar */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setErrors({}) }}
        title={editUser ? `Editar: ${editUser.name}` : 'Nuevo Operario'}>
        <Input label="Nombre completo" placeholder="Juan García López"
          value={form.name} error={errors.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />

        <Input label="Teléfono" type="tel" placeholder="612 345 678"
          value={form.phone} error={errors.phone}
          disabled={!!editUser?.auth_user_id}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <Input label="Matrículas (separadas por coma)" placeholder="1234ABC, 5678DEF"
          value={form.plates}
          onChange={(e) => setForm({ ...form, plates: e.target.value })} />

        <Select label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
          options={[
            { value: 'operario', label: 'Operario' },
            { value: 'repartidor', label: 'Repartidor' },
            { value: 'admin', label: 'Administrador' },
          ]} />

        {!editUser && (
          <p className="text-xs text-gray-500 mb-4 -mt-2">
            El usuario accederá con su número de teléfono
          </p>
        )}

        {editUser?.auth_user_id && (
          <p className="text-xs text-gray-500 mb-4 -mt-2">
            El teléfono no se puede cambiar porque ya tiene sesión vinculada
          </p>
        )}

        <Button fullWidth onClick={handleSave} loading={saving}>
          {editUser ? 'Guardar Cambios' : <><IconPlus size={18} /> Crear Operario</>}
        </Button>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={() => handleDelete(showConfirm.id)}
        title="Desactivar usuario"
        message={`¿Seguro que quieres desactivar a ${showConfirm?.name}? Ya no podrá acceder a la aplicación.`}
      />
    </div>
  )
}
