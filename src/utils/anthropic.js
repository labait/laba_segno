const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT_LOGO =
  'Sei un critico di design specializzato in identità visiva. ' +
  'Analizza il logo caricato dallo studente in modo costruttivo e professionale. ' +
  'Se riconosci il logo di un brand esistente, menzionalo esplicitamente indicando il nome del brand e il designer o studio che lo ha progettato, se noto. ' +
  'Valuta aspetti come leggibilità del logotipo, coerenza tra segno e lettering, riconoscibilità del marchio, uso del colore e scalabilità. ' +
  'Struttura il feedback in sezioni chiare con punti di forza e aree di miglioramento. ' +
  'Usa un tono da docente: diretto ma incoraggiante. ' +
  'Rispondi sempre in italiano.'

const SYSTEM_PROMPT_PITTOGRAMMA =
  'Sei un critico di design specializzato in identità visiva. ' +
  'Analizza il pittogramma caricato dallo studente in modo costruttivo e professionale. ' +
  'Un pittogramma è un segno iconico puro, senza testo. ' +
  'Valuta aspetti come sintesi formale, riconoscibilità a piccole dimensioni, chiarezza semantica, equilibrio tra pieni e vuoti, e capacità di comunicare senza parole. ' +
  'Se riconosci il pittogramma di un brand o sistema esistente, menzionalo indicando il designer o studio che lo ha progettato, se noto. ' +
  'Struttura il feedback in sezioni chiare con punti di forza e aree di miglioramento. ' +
  'Usa un tono da docente: diretto ma incoraggiante. ' +
  'Rispondi sempre in italiano.'

// ── Image preparation ─────────────────────────────────────────────

/**
 * Convert a data URL to { base64, mimeType } accepted by the Anthropic API.
 * SVG files are rasterised via canvas since the API does not support SVG.
 * Supported types: image/jpeg, image/png, image/gif, image/webp
 */
async function prepareImage(dataUrl) {
  if (!dataUrl) throw new Error('Nessuna immagine fornita.')

  // SVG → PNG via canvas
  if (dataUrl.startsWith('data:image/svg+xml')) {
    return rasteriseSvg(dataUrl)
  }

  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) throw new Error('Formato immagine non riconosciuto.')

  const mimeType = match[1]
  const base64   = match[2]

  const SUPPORTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!SUPPORTED.includes(mimeType)) {
    // Try converting via canvas for any other raster type
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
  const MAX   = 1568 // Anthropic max dimension recommendation
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
 * Send the logo to Claude for a structured design review.
 *
 * @param {object} options
 * @param {string} options.apiKey        - Anthropic API key
 * @param {string} options.imageDataUrl  - Image as a data URL
 * @param {string[]} options.criteria    - Selected review criteria
 * @param {string} [options.context]     - Optional project brief
 * @param {string} [options.mode]        - 'logo' or 'pittogramma'
 * @returns {Promise<string>}            - Claude's feedback text
 */
export async function analyzeImage({ apiKey, imageDataUrl, criteria, context, mode = 'logo' }) {
  const { base64, mimeType } = await prepareImage(imageDataUrl)

  const criteriaText = criteria.map((c) => `- ${c}`).join('\n')
  const subject = mode === 'pittogramma' ? 'pittogramma' : 'logo'
  let userPrompt =
    `Analizza questo ${subject} secondo i seguenti criteri di revisione:\n${criteriaText}\n\n`

  if (context?.trim()) {
    userPrompt +=
      `Contesto del progetto (brief dello studente):\n${context.trim()}\n\n`
  }

  userPrompt +=
    'Fornisci un feedback strutturato per ciascun criterio selezionato. ' +
    'Usa intestazioni ## per ogni criterio. ' +
    'Dentro ogni criterio, usa ### Punti di forza e ### Aree di miglioramento come sottosezioni, ' +
    'seguite da punti elenco. Non usare **grassetto** per i titoli di sezione, usa sempre ### heading.'

  const systemPrompt = mode === 'pittogramma' ? SYSTEM_PROMPT_PITTOGRAMMA : SYSTEM_PROMPT_LOGO
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':                             'application/json',
      'x-api-key':                                apiKey,
      'anthropic-version':                        '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 1500,
      system:     systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    let message = `Errore API (${response.status})`
    try {
      const body = await response.json()
      if (body.error?.message) message = body.error.message
    } catch (_) { /* ignore parse errors */ }
    throw new Error(message)
  }

  const data = await response.json()
  return data.content[0].text
}
