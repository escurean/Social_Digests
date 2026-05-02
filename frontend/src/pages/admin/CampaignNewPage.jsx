import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cmsAdmin, content as cmsContent } from '../../services/api.js'
import { normalizeList, getImages, getImageUrl } from '../../utils/strapi.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminCampaignNewPage() {
  const { slug: editSlug } = useParams()
  const isEditing = Boolean(editSlug)

  const [form, setForm] = useState({
    title: '', description: '', goal_amount: '', currency: 'KES',
    deadline: '', beneficiary_name: '', beneficiary_details: '', status: 'active', topic_slug: '',
  })
  const [topicList, setTopicList]           = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [pendingFiles, setPendingFiles]     = useState([])
  const [pendingPreviews, setPendingPreviews] = useState([])
  const [removedIds, setRemovedIds]         = useState(new Set())
  const [uploading, setUploading]           = useState(false)
  const [loading, setLoading]               = useState(false)
  const fileInputRef = useRef(null)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  useEffect(() => {
    // Load active topics from Strapi for the linked-topic selector
    cmsContent.topics.list({ 'filters[status][$eq]': 'active' })
      .then(({ data }) => setTopicList(normalizeList(data)))
      .catch(() => {})

    if (isEditing) {
      cmsAdmin.campaigns.get(editSlug)
        .then(({ data }) => {
          setForm({
            title:              data.title              || '',
            description:        data.description        || '',
            goal_amount:        String(data.goal_amount || ''),
            currency:           data.currency           || 'KES',
            deadline:           data.deadline ? data.deadline.slice(0, 10) : '',
            beneficiary_name:   data.beneficiary_name   || '',
            beneficiary_details:data.beneficiary_details|| '',
            status:             data.status             || 'active',
            topic_slug:         data.topic_slug         || '',
          })
          setExistingImages(getImages(data))
        })
        .catch(() => addToast({ message: 'Failed to load campaign.', type: 'error' }))
    }
  }, [editSlug])

  useEffect(() => () => pendingPreviews.forEach(URL.revokeObjectURL), [pendingPreviews])

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const oversized = files.filter((f) => f.size > 5_000_000)
    if (oversized.length) {
      addToast({ message: 'Each image must be under 5 MB.', type: 'error' })
      return
    }
    setPendingFiles((prev) => [...prev, ...files])
    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeExisting = (strapiId) => setRemovedIds((prev) => new Set([...prev, strapiId]))
  const removePending  = (i) => {
    URL.revokeObjectURL(pendingPreviews[i])
    setPendingFiles((prev)    => prev.filter((_, idx) => idx !== i))
    setPendingPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim())     return addToast({ message: 'Title is required.', type: 'error' })
    if (!form.goal_amount || isNaN(form.goal_amount))
      return addToast({ message: 'A valid goal amount is required.', type: 'error' })

    setLoading(true)
    setUploading(pendingFiles.length > 0)

    try {
      const newMediaIds = []
      for (const file of pendingFiles) {
        const media = await cmsAdmin.uploadImage(file)
        newMediaIds.push(media.id)
      }
      setUploading(false)

      const keptIds  = existingImages.filter((img) => !removedIds.has(img.id)).map((img) => img.id)
      const imageIds = [...keptIds, ...newMediaIds]

      const payload = {
        ...form,
        goal_amount: parseFloat(form.goal_amount),
        deadline:    form.deadline || null,
        topic_slug:  form.topic_slug || null,
        imageIds,
      }

      if (isEditing) {
        await cmsAdmin.campaigns.update(editSlug, payload)
        addToast({ message: 'Campaign updated.', type: 'success' })
      } else {
        await cmsAdmin.campaigns.create(payload)
        addToast({ message: 'Campaign created.', type: 'success' })
      }
      navigate('/admin/campaigns')
    } catch (err) {
      addToast({ message: err.message || err.response?.data?.error || 'Failed to save campaign.', type: 'error' })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const keptImages  = existingImages.filter((img) => !removedIds.has(img.id))
  const totalImages = keptImages.length + pendingFiles.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{isEditing ? 'Edit campaign' : 'New campaign'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            {isEditing ? `Editing: ${form.title}` : 'Create a new donation campaign'}
          </p>
        </div>
        <Link to="/admin/campaigns" className="btn-secondary">Cancel</Link>
      </div>

      <form className="card" style={{ padding: 28, maxWidth: 720 }} onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="title">Campaign title *</label>
          <input
            id="title" className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="e.g. Borehole for Mathare South"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="goal">Goal amount *</label>
            <input
              id="goal" className="form-input" type="number" min="1"
              value={form.goal_amount}
              onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
              required placeholder="800000"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="currency">Currency</label>
            <select id="currency" className="form-input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="deadline">Deadline</label>
            <input
              id="deadline" className="form-input" type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="beneficiary">Beneficiary name</label>
            <input
              id="beneficiary" className="form-input"
              value={form.beneficiary_name}
              onChange={(e) => setForm({ ...form, beneficiary_name: e.target.value })}
              placeholder="Community Water Committee"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="status">Status</label>
            <select id="status" className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft (hidden from public)</option>
              <option value="active">Active (published)</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="beneficiary_details">Beneficiary details</label>
          <textarea
            id="beneficiary_details" className="form-input" rows={2}
            placeholder="More details about the beneficiary…"
            value={form.beneficiary_details}
            onChange={(e) => setForm({ ...form, beneficiary_details: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="topic">Linked topic (optional)</label>
          <select id="topic" className="form-input" value={form.topic_slug} onChange={(e) => setForm({ ...form, topic_slug: e.target.value })}>
            <option value="">None</option>
            {topicList.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="description">Description</label>
          <textarea
            id="description" className="form-input" rows={5}
            placeholder="Describe what the funds will achieve…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Images */}
        <div style={{ marginBottom: 24 }}>
          <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>
            Images
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 8 }}>
              {totalImages}/10 · PNG, JPG, WebP · max 5 MB each
            </span>
          </label>

          {keptImages.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {keptImages.map((img) => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <img
                    src={getImageUrl(img, 'thumbnail') ?? img.url}
                    alt=""
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeExisting(img.id)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--color-terracotta)', color: 'white',
                      border: 'none', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {pendingPreviews.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              {pendingPreviews.map((url, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={url} alt=""
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, display: 'block', opacity: 0.8 }}
                  />
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--color-terracotta)', color: 'white',
                      border: 'none', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >×</button>
                  <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, fontSize: 9, textAlign: 'center', color: 'white', background: 'rgba(0,0,0,0.5)', borderRadius: 4, padding: '1px 2px' }}>
                    pending
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalImages < 10 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: 13 }}
              onClick={() => fileInputRef.current?.click()}
            >
              + Add images
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '11px 28px' }}>
          {uploading ? 'Uploading images…' : loading ? 'Saving…' : isEditing ? 'Save changes' : 'Create campaign'}
        </button>
      </form>
    </div>
  )
}
