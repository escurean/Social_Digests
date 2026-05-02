import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { proposals } from '../../services/api.js'
import useToastStore from '../../store/toastStore.js'

export default function ProposePage() {
  const [form, setForm] = useState({ title: '', description: '', category_slug: '' })
  const [loading, setLoading] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await proposals.submit(form)
      addToast({ message: 'Topic proposal submitted for review.', type: 'success' })
      navigate('/topics')
    } catch {
      addToast({ message: 'Failed to submit. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-enter">
      <div style={{ background: 'var(--color-terracotta)', padding: '40px 24px' }}>
        <div className="container">
          <Link to="/topics" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            ← Back to topics
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 600, color: 'white' }}>Propose a topic</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 8 }}>
            Suggest a discussion topic. Our team will review and publish it within 2 business days.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <form className="card" style={{ padding: 32 }} onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="title">Topic title *</label>
              <input
                id="title"
                className="form-input"
                type="text"
                placeholder="e.g. Waste management in county towns"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" htmlFor="category">Category</label>
              <select
                id="category"
                className="form-input"
                value={form.category_slug}
                onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
              >
                <option value="">Select a category</option>
                {['environment', 'health', 'education', 'economy', 'governance'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="form-label" htmlFor="description">Why is this important? *</label>
              <textarea
                id="description"
                className="form-input"
                rows={5}
                placeholder="Give context — why does this matter to the community?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
              {loading ? 'Submitting…' : 'Submit for review'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
