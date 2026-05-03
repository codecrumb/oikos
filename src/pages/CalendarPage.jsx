import { useEffect, useState, useCallback, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CalendarPage() {
  const { member } = useAuth()
  const householdId = member?.household_id

  const [events, setEvents] = useState([])
  const [modal, setModal] = useState(null) // { mode: 'create'|'edit', data }

  const loadEvents = useCallback(async () => {
    if (!householdId) return
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('household_id', householdId)
    setEvents((data ?? []).map(dbToFc))
  }, [householdId])

  useEffect(() => {
    loadEvents()

    const channel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `household_id=eq.${householdId}` },
        loadEvents
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [loadEvents, householdId])

  function handleDateSelect(selectInfo) {
    setModal({
      mode: 'create',
      data: {
        title: '',
        starts_at: selectInfo.startStr,
        ends_at: selectInfo.endStr,
        all_day: selectInfo.allDay,
        color: '#6366f1',
      },
    })
  }

  function handleEventClick(clickInfo) {
    const ev = clickInfo.event
    setModal({
      mode: 'edit',
      id: ev.id,
      data: {
        title: ev.title,
        starts_at: ev.startStr,
        ends_at: ev.endStr ?? ev.startStr,
        all_day: ev.allDay,
        color: ev.backgroundColor ?? '#6366f1',
      },
    })
  }

  async function handleSave(formData) {
    if (modal.mode === 'create') {
      await supabase.from('events').insert({
        household_id: householdId,
        created_by: member.id,
        ...formData,
      })
    } else {
      await supabase
        .from('events')
        .update(formData)
        .eq('id', modal.id)
    }
    setModal(null)
  }

  async function handleDelete() {
    if (!modal?.id) return
    await supabase.from('events').delete().eq('id', modal.id)
    setModal(null)
  }

  return (
    <div className="page-content page-content--calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek',
        }}
        events={events}
        selectable
        editable
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={async info => {
          await supabase
            .from('events')
            .update({ starts_at: info.event.startStr, ends_at: info.event.endStr })
            .eq('id', info.event.id)
        }}
        height="100%"
      />

      {modal && (
        <EventModal
          modal={modal}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' ? handleDelete : null}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function EventModal({ modal, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(modal.data)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    await onSave({ ...form, title: form.title.trim() })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal>
        <div className="modal__header">
          <h2 className="modal__title">
            {modal.mode === 'create' ? 'New event' : 'Edit event'}
          </h2>
          <button className="btn--icon" onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="event-title">Title</label>
            <input
              id="event-title"
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="event-start">Start</label>
              <input
                id="event-start"
                className="input"
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.all_day ? form.starts_at?.slice(0, 10) : form.starts_at?.slice(0, 16)}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="event-end">End</label>
              <input
                id="event-end"
                className="input"
                type={form.all_day ? 'date' : 'datetime-local'}
                value={form.all_day ? form.ends_at?.slice(0, 10) : form.ends_at?.slice(0, 16)}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group form-group--inline">
            <input
              id="event-allday"
              type="checkbox"
              checked={form.all_day}
              onChange={e => setForm(f => ({ ...f, all_day: e.target.checked }))}
            />
            <label className="label" htmlFor="event-allday">All-day event</label>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="event-color">Colour</label>
            <input
              id="event-color"
              className="input input--color"
              type="color"
              value={form.color ?? '#6366f1'}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
            />
          </div>

          <div className="form-actions">
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function dbToFc(event) {
  return {
    id: event.id,
    title: event.title,
    start: event.starts_at,
    end: event.ends_at,
    allDay: event.all_day,
    backgroundColor: event.color,
    borderColor: event.color,
  }
}
