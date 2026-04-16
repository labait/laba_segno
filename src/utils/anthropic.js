// ── Image preparation (client-side) ───────────────────────────────

/**
 * Convert a data URL to { base64, mimeType } accepted by the API.
 * SVG files are rasterised via canvas since the API does not support SVG.
 */
async function prepareImage(dataUrl) {
  if (!dataUrl) throw new Error('Nessuna immagine fornita.')

  if (dataUrl.startsWith('data:image/svg+xml')) {
    return rasteriseSvg(dataUrl)
  }

  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) throw new Error('Formato immagine non riconosciuto.')

  const mimeType = match[1]
  const base64   = match[2]

  const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!SUPPORTED.includes(mimeType)) {
    return rasteriseViaCanvas(dataUrl)
  }

  return { base64, mimeType }
}

function rasteriseSvg(svgDataUrl) {
  return new Promise((resolve, reject) => {
    const img   = new Image()
    img.onload  = () => resolve(drawToCanvas(img))
    img.onerror = () => reject(new Error('Impossibile elaborare il file SVG.'))
    img.src = svgDataUrl
  })
}

function rasteriseViaCanvas(dataUrl) {
  return new Promise((resolve, reject) => {
    const img   = new Image()
    img.onload  = () => resolve(drawToCanvas(img))
    img.onerror = () => reject(new Error('Impossibile elaborare il file immagine.'))
    img.src = dataUrl
  })
}

function drawToCanvas(img) {
  const MAX   = 1568
  const w0    = img.naturalWidth  || 512
  const h0    = img.naturalHeight || 512
  const scale = Math.min(1, MAX / Math.max(w0, h0))
  const w     = Math.round(w0 * scale)
  const h     = Math.round(h0 * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const pngDataUrl = canvas.toDataURL('image/png')
  const base64     = pngDataUrl.split(',')[1]
  return { base64, mimeType: 'image/png' }
}

// ── Main export ───────────────────────────────────────────────────

/**
 * Send the image to the Netlify function for a structured design review.
 *
 * @param {object} options
 * @param {string} options.imageDataUrl  - Image as a data URL
 * @param {string[]} options.criteria    - Selected review criteria
 * @param {string} [options.context]     - Optional project brief
 * @param {string} [options.mode]        - 'logo' or 'pittogramma'
 * @returns {Promise<string>}            - Claude's feedback text
 */
export async function analyzeImage({ imageDataUrl, criteria, context, mode = 'logo' }) {
  const { base64, mimeType } = await prepareImage(imageDataUrl)

  const response = await fetch('/.netlify/functions/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, mimeType, criteria, context, mode }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `Errore (${response.status})`)
  }

  return data.text
}
