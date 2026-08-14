import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import * as api from './data'
import type { Snapshot } from './data'
import type { Attachment, Document, Entry, Medication, Profile, Reminder, Topic } from '../types'

interface Ctx {
  session: Session | null
  authReady: boolean
  data: Snapshot
  loading: boolean
  offline: boolean
  pendingCount: number
  toast: string | null
  say: (msg: string) => void
  refresh: () => Promise<void>
  addTopic: (patch: Partial<Topic> & { name: string }) => Promise<Topic>
  editTopic: (id: string, patch: Partial<Topic>) => Promise<void>
  removeTopic: (id: string) => Promise<void>
  addEntry: (payload: api.NewEntry, files: File[]) => Promise<Entry | null>
  editEntry: (id: string, patch: Partial<Entry>) => Promise<void>
  removeEntry: (id: string) => Promise<void>
  addPhotos: (entryId: string, files: File[]) => Promise<void>
  removePhoto: (att: Attachment) => Promise<void>
  addMed: (patch: Partial<Medication> & { name: string }) => Promise<void>
  editMed: (id: string, patch: Partial<Medication>) => Promise<void>
  removeMed: (id: string) => Promise<void>
  addDocument: (
    file: File,
    meta: {
      title: string
      kind: Document['kind']
      doc_date: string | null
      topic_id: string | null
      notes: string | null
    },
  ) => Promise<void>
  editDocument: (id: string, patch: Partial<Document>) => Promise<void>
  removeDocument: (doc: Document) => Promise<void>
  addReminder: (patch: Partial<Reminder> & { title: string }) => Promise<void>
  editReminder: (id: string, patch: Partial<Reminder>) => Promise<void>
  removeReminder: (id: string) => Promise<void>
  markReminder: (id: string, day: string, done: boolean) => Promise<void>
  editProfile: (patch: Partial<Profile>) => Promise<void>
  signOut: () => Promise<void>
}

const AppCtx = createContext<Ctx | null>(null)

export function useApp() {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp fuera del provider')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [data, setData] = useState<Snapshot>(() => api.readCache() ?? api.EMPTY)
  const [loading, setLoading] = useState(false)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [pendingCount, setPendingCount] = useState(() => api.readOutbox().length)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const say = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const userId = session?.user.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const sent = await api.flushOutbox(userId)
      setPendingCount(api.readOutbox().length)
      if (sent > 0) say(`Se enviaron ${sent} registro(s) que estaban pendientes`)
      setData(await api.fetchAll())
    } catch {
      say('No se pudo conectar. Estás viendo lo último guardado en el celular.')
    } finally {
      setLoading(false)
    }
  }, [userId, say])

  useEffect(() => {
    if (userId) void refresh()
    else setData(api.EMPTY)
  }, [userId, refresh])

  // Al recuperar internet, reintenta lo que quedó pendiente.
  useEffect(() => {
    if (!offline && userId && pendingCount > 0) void refresh()
  }, [offline, userId, pendingCount, refresh])

  const value = useMemo<Ctx>(() => {
    const need = () => {
      if (!userId) throw new Error('Sesión no iniciada')
      return userId
    }

    return {
      session,
      authReady,
      data,
      loading,
      offline,
      pendingCount,
      toast,
      say,
      refresh,

      addTopic: async (patch) => {
        const t = await api.createTopic(need(), patch)
        setData((d) => ({ ...d, topics: [...d.topics, t] }))
        return t
      },
      editTopic: async (id, patch) => {
        const t = await api.updateTopic(id, patch)
        setData((d) => ({ ...d, topics: d.topics.map((x) => (x.id === id ? t : x)) }))
      },
      removeTopic: async (id) => {
        await api.deleteTopic(id)
        setData((d) => ({
          ...d,
          topics: d.topics.filter((x) => x.id !== id),
          entries: d.entries.map((e) => (e.topic_id === id ? { ...e, topic_id: null } : e)),
        }))
      },

      addEntry: async (payload, files) => {
        const uid = need()
        try {
          const e = await api.createEntry(uid, payload)
          setData((d) => ({ ...d, entries: [e, ...d.entries] }))
          if (files.length) {
            const atts: Attachment[] = []
            for (const f of files) {
              try {
                atts.push(await api.uploadAttachment(uid, e.id, f))
              } catch {
                say('Una foto no se pudo subir. Puedes agregarla otra vez desde el registro.')
              }
            }
            if (atts.length) setData((d) => ({ ...d, attachments: [...d.attachments, ...atts] }))
          }
          say('Registro guardado')
          return e
        } catch {
          // Sin internet: se guarda en el celular y se envía después.
          api.pushOutbox(payload)
          setPendingCount(api.readOutbox().length)
          say(
            files.length
              ? 'Sin internet: guardé la nota en el celular. Las fotos hay que agregarlas cuando vuelva la señal.'
              : 'Sin internet: guardé la nota en el celular y la envío cuando vuelva la señal.',
          )
          return null
        }
      },
      editEntry: async (id, patch) => {
        const e = await api.updateEntry(id, patch)
        setData((d) => ({ ...d, entries: d.entries.map((x) => (x.id === id ? e : x)) }))
      },
      removeEntry: async (id) => {
        await api.deleteEntry(id)
        setData((d) => ({
          ...d,
          entries: d.entries.filter((x) => x.id !== id),
          attachments: d.attachments.filter((a) => a.entry_id !== id),
        }))
      },

      addPhotos: async (entryId, files) => {
        const uid = need()
        const atts: Attachment[] = []
        for (const f of files) atts.push(await api.uploadAttachment(uid, entryId, f))
        setData((d) => ({ ...d, attachments: [...d.attachments, ...atts] }))
        say(atts.length === 1 ? 'Foto agregada' : `${atts.length} fotos agregadas`)
      },
      removePhoto: async (att) => {
        await api.deleteAttachment(att)
        setData((d) => ({ ...d, attachments: d.attachments.filter((a) => a.id !== att.id) }))
      },

      addMed: async (patch) => {
        const m = await api.createMedication(need(), patch)
        setData((d) => ({ ...d, medications: [m, ...d.medications] }))
        say('Medicamento guardado')
      },
      editMed: async (id, patch) => {
        const m = await api.updateMedication(id, patch)
        setData((d) => ({ ...d, medications: d.medications.map((x) => (x.id === id ? m : x)) }))
      },
      removeMed: async (id) => {
        await api.deleteMedication(id)
        setData((d) => ({ ...d, medications: d.medications.filter((x) => x.id !== id) }))
      },

      addDocument: async (file, meta) => {
        const doc = await api.uploadDocument(need(), file, meta)
        setData((d) => ({ ...d, documents: [doc, ...d.documents] }))
        say('Documento guardado')
      },
      editDocument: async (id, patch) => {
        const doc = await api.updateDocument(id, patch)
        setData((d) => ({ ...d, documents: d.documents.map((x) => (x.id === id ? doc : x)) }))
      },
      removeDocument: async (doc) => {
        await api.deleteDocument(doc)
        setData((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== doc.id) }))
      },

      addReminder: async (patch) => {
        const r = await api.createReminder(need(), patch)
        setData((d) => ({ ...d, reminders: [...d.reminders, r] }))
        say('Recordatorio creado')
      },
      editReminder: async (id, patch) => {
        const r = await api.updateReminder(id, patch)
        setData((d) => ({ ...d, reminders: d.reminders.map((x) => (x.id === id ? r : x)) }))
      },
      removeReminder: async (id) => {
        await api.deleteReminder(id)
        setData((d) => ({
          ...d,
          reminders: d.reminders.filter((x) => x.id !== id),
          reminderLogs: d.reminderLogs.filter((l) => l.reminder_id !== id),
        }))
      },
      markReminder: async (id, day, done) => {
        const uid = need()
        if (done) {
          const log = await api.logReminder(uid, id, day)
          setData((d) => ({
            ...d,
            reminderLogs: [log, ...d.reminderLogs.filter((l) => !(l.reminder_id === id && l.done_on === day))],
            reminders: d.reminders.map((r) => (r.id === id ? { ...r, last_done_on: day } : r)),
          }))
        } else {
          await api.unlogReminder(id, day)
          setData((d) => ({
            ...d,
            reminderLogs: d.reminderLogs.filter((l) => !(l.reminder_id === id && l.done_on === day)),
          }))
        }
      },

      editProfile: async (patch) => {
        const p = await api.saveProfile(need(), patch)
        setData((d) => ({ ...d, profile: p }))
        say('Datos guardados')
      },

      signOut: async () => {
        await supabase.auth.signOut()
        api.clearLocal()
        setData(api.EMPTY)
      },
    }
  }, [session, authReady, data, loading, offline, pendingCount, toast, say, refresh, userId])

  useEffect(() => {
    if (data !== api.EMPTY) api.writeCache(data)
  }, [data])

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
