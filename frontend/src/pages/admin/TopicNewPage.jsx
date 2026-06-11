import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { cmsAdmin, content as cmsContent } from '../../services/api.js'
import { getImages, getImageUrl } from '../../utils/strapi.js'
import useToastStore from '../../store/toastStore.js'

export default function AdminTopicNewPage() {
  const { slug: editSlug } = useParams()
  const isEditing = Boolean(editSlug)

  const [form, setForm] = useState({
    title: '', context: '', category_slug: '', status: 'draft', is_featured: false,
  })
  const [categoryList, setCategoryList]     = useState([])
  const [existingImages, setExistingImages] = useState([])  // normalized image objects from Strapi
  const [pendingFiles, setPendingFiles]     = useState([])  // File objects not yet uploaded
  const [pendingPreviews, setPendingPreviews] = useState([]) // object URLs for UI preview
  const [removedIds, setRemovedIds]         = useState(new Set()) // strapiIds to remove
  const [uploading, setUploading]           = useState(false)
  const [loading, setLoading]               = useState(false)
  const fileInputRef = useRef(null)
  const addToast  = useToastStore((s) => s.addToast)
  const navigate  = useNavigate()

  useEffect(() => {
    cmsContent.categories.list()
      .then(({ data }) => setCategoryList(data.categories ?? []))
      .catch(() => {})

    if (isEditing) {
      cmsAdmin.topics.get(editSlug)
        .then(({ data }) => {
          setForm({
            title:         data.title        || '',
            context:       data.context      || '',
            category_slug: data.category_slug || '',
            status:        data.status       || 'draft',
            is_featured:   data.is_featured  || false,
          })
          setExistingImages(getImages(data))
        })
        .catch(() => addToast({ message: 'Failed to load topic.', type: 'error' }))
    }
  }, [editSlug])

  // Clean up object URLs on unmount
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

  const removeExisting = (strapiId) => {
    setRemovedIds((prev) => new Set([...prev, strapiId]))
  }

  const removePending = (i) => {
    URL.revokeObjectURL(pendingPreviews[i])
    setPendingFiles((prev)    => prev.filter((_, idx) => idx !== i))
    setPendingPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return addToast({ message: 'Title is required.', type: 'error' })

    setLoading(true)
    setUploading(pendingFiles.length > 0)

    try {
      // 1. Upload new images to Strapi
      const newMediaIds = []
      for (const file of pendingFiles) {
        const media = await cmsAdmin.uploadImage(file)
        newMediaIds.push(media.id)
      }
      setUploading(false)

      // 2. Build final image ID list: kept existing + newly uploaded
      const keptIds = existingImages
        .filter((img) => !removedIds.has(img.id))
        .map((img) => img.id)
      const imageIds = [...keptIds, ...newMediaIds]

      // 3. Create or update topic via proxy
      const payload = { ...form, imageIds }

      if (isEditing) {
        await cmsAdmin.topics.update(editSlug, payload)
        addToast({ message: 'Topic updated.', type: 'success' })
      } else {
        await cmsAdmin.topics.create(payload)
        addToast({ message: 'Topic created.', type: 'success' })
      }
      navigate('/admin/topics')
    } catch (err) {
      addToast({ message: err.message || err.response?.data?.error || 'Failed to save topic.', type: 'error' })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const keptImages = existingImages.filter((img) => !removedIds.has(img.id))
  const totalImages = keptImages.length + pendingFiles.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>{isEditing ? 'Edit topic' : 'New topic'}</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 2 }}>
            {isEditing ? `Editing: ${form.title}` : 'Create a new community discussion topic'}
          </p>
        </div>
        <Link to="/admin/topics" className="btn-secondary">Cancel</Link>
      </div>

      <form className="card" style={{ padding: 28, maxWidth: 720 }} onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="title">Title *</label>
          <input
            id="title" className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="e.g. Water access in Nairobi informal settlements"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <select
              id="category" className="form-input"
              value={form.category_slug}
              onChange={(e) => setForm({ ...form, category_slug: e.target.value })}
            >
              <option value="">Select…</option>
              {categoryList.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="status">Status</label>
            <select
              id="status" className="form-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft (hidden from public)</option>
              <option value="active">Active (published)</option>
              <option value="closed">Closed (visible, no contributions)</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label" htmlFor="context">Background brief</label>
          <textarea
            id="context" className="form-input" rows={6}
            placeholder="Provide context and background for this topic…"
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
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

          {/* Existing images */}
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

          {/* Pending (not yet uploaded) previews */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <input
            type="checkbox" id="featured"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
          />
          <label htmlFor="featured" style={{ fontSize: 14, cursor: 'pointer' }}>Pin as featured topic</label>
        </div>

        <button className="btn-primary" type="submit" disabled={loading} style={{ padding: '11px 28px' }}>
          {uploading ? 'Uploading images…' : loading ? 'Saving…' : isEditing ? 'Save changes' : 'Create topic'}
        </button>
      </form>
    </div>
  )
}
