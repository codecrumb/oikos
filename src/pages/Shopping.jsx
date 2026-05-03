import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Shopping() {
  const { member } = useAuth()
  const householdId = member?.household_id

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const inputRef = useRef(null)

  const loadItems = useCallback(async () => {
    if (!householdId) return
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    loadItems()

    const channel = supabase
      .channel('shopping-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `household_id=eq.${householdId}` },
        loadItems
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [loadItems, householdId])

  async function handleAdd(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return

    await supabase.from('shopping_items').insert({
      household_id: householdId,
      added_by: member.id,
      name,
      quantity: newQty.trim() || null,
    })

    setNewName('')
    setNewQty('')
    inputRef.current?.focus()
  }

  async function toggleChecked(item) {
    await supabase
      .from('shopping_items')
      .update({ checked: !item.checked })
      .eq('id', item.id)
  }

  async function deleteItem(id) {
    await supabase.from('shopping_items').delete().eq('id', id)
  }

  async function clearChecked() {
    const checkedIds = items.filter(i => i.checked).map(i => i.id)
    if (checkedIds.length === 0) return
    await supabase.from('shopping_items').delete().in('id', checkedIds)
  }

  const pending = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className="page-content">
      <header className="page-header">
        <h1 className="page-title">Shopping list</h1>
        {checked.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={clearChecked}>
            Clear checked ({checked.length})
          </button>
        )}
      </header>

      <form className="shopping-add-form" onSubmit={handleAdd}>
        <input
          ref={inputRef}
          className="input"
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add item…"
          aria-label="Item name"
        />
        <input
          className="input input--qty"
          type="text"
          value={newQty}
          onChange={e => setNewQty(e.target.value)}
          placeholder="Qty"
          aria-label="Quantity"
          style={{ width: 72 }}
        />
        <button type="submit" className="btn btn--primary" aria-label="Add item">
          <Plus size={18} aria-hidden />
        </button>
      </form>

      {loading ? (
        <div className="page-loading">Loading…</div>
      ) : items.length === 0 ? (
        <p className="empty-state">Your list is empty — add something above.</p>
      ) : (
        <ul className="shopping-list">
          {[...pending, ...checked].map(item => (
            <li
              key={item.id}
              className={`shopping-item${item.checked ? ' shopping-item--checked' : ''}`}
            >
              <button
                className="shopping-item__check"
                onClick={() => toggleChecked(item)}
                aria-label={item.checked ? 'Uncheck' : 'Check off'}
              >
                {item.checked
                  ? <CheckSquare size={22} aria-hidden />
                  : <Square size={22} aria-hidden />
                }
              </button>

              <span className="shopping-item__name">{item.name}</span>

              {item.quantity && (
                <span className="shopping-item__qty">{item.quantity}</span>
              )}

              <button
                className="shopping-item__delete btn--icon"
                onClick={() => deleteItem(item.id)}
                aria-label="Delete item"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
