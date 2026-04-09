import { jsPDF } from 'jspdf'

// Accent color RGB (keep in sync with --color-accent in style.css)
const ACCENT   = [255, 93, 4]   // #FF5D04
const GHOST    = [79, 72, 98]   // #4F4862
const BODY_CLR = [40, 40, 40]   // dark body text for white PDF
const HEADING  = [30, 30, 30]   // near-black for headings
const GREEN_D  = [22, 130, 65]  // dark green for print
const MUTED    = [107, 114, 128] // gray captions

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Render any image data URL (including SVG) to a PNG base64 string
 * via an offscreen canvas so jsPDF can embed it reliably.
 */
function loadAsPng(dataUrl, maxW = 600, bgColor = '#ffffff') {
  return new Promise((resolve) => {
    const img   = new Image()
    img.onload  = () => {
      const MAX    = maxW
      const w0     = img.naturalWidth  || 300
      const h0     = img.naturalHeight || 200
      const scale  = Math.min(1, MAX / Math.max(w0, h0))
      const w      = Math.round(w0 * scale)
      const h      = Math.round(h0 * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (bgColor) {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: canvas.toDataURL('image/png'), w, h })
    }
    img.onerror = () => resolve(null)
    img.src     = dataUrl
  })
}

/** Add a new page if `y` is too close to the bottom margin. */
function checkPageBreak(doc, y, pageHeight, margin = 20) {
  if (y > pageHeight - margin) {
    doc.addPage()
    return margin
  }
  return y
}

/**
 * Sanitize text for jsPDF built-in fonts (WinAnsiEncoding).
 * Replaces Unicode chars that cause spacing corruption.
 */
function sanitize(str) {
  return str
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '\xB7')
    .replace(/\u25B8/g, '-')
    .replace(/\u2726/g, '+')
    .replace(/\u25B3/g, '>')
    .replace(/\u00A0/g, ' ')
}

/** Write wrapped text and return the new y position. */
function writeWrapped(doc, text, x, y, maxWidth, lineHeight, pageHeight, margin) {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = checkPageBreak(doc, y, pageHeight, margin)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

// ── Main export ───────────────────────────────────────────────────

/**
 * Generate and download a PDF review document.
 *
 * @param {object} data
 * @param {string|null} data.imageDataUrl  - Logo image as data URL
 * @param {string[]}    data.criteria      - Selected review criteria
 * @param {string}      [data.context]     - Optional project brief
 * @param {string}      data.feedback      - Claude's feedback text
 * @param {Date|null}   [data.reviewDate]  - Timestamp of the review
 * @param {string}      [data.mode]        - 'logo' or 'pittogramma'
 */
export async function exportReviewPdf({ imageDataUrl, criteria, context, feedback, reviewDate, mode = 'logo' }) {
  const doc        = new jsPDF({ unit: 'mm', format: 'a4' })
  const PW         = doc.internal.pageSize.getWidth()   // 210 mm
  const PH         = doc.internal.pageSize.getHeight()  // 297 mm
  const MARGIN     = 18
  const CW         = PW - MARGIN * 2                    // content width
  const now        = reviewDate instanceof Date ? reviewDate : new Date()

  const dateStr = now.toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) + ' - ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  let y = MARGIN

  // ── LABA logo (top-left) ──────────────────────────────────────
  try {
    const logoRes  = await fetch('/logo.svg')
    const logoText = await logoRes.text()
    const logoBlob = new Blob([logoText], { type: 'image/svg+xml;charset=utf-8' })
    const logoUrl  = URL.createObjectURL(logoBlob)
    const logoPng  = await loadAsPng(logoUrl, 400, null)
    URL.revokeObjectURL(logoUrl)
    if (logoPng) {
      const logoH  = 8 // mm height in PDF
      const logoW  = logoH * (logoPng.w / logoPng.h)
      doc.addImage(logoPng.dataUrl, 'PNG', MARGIN, y, logoW, logoH, undefined, 'FAST')
      y += logoH + 12
    }
  } catch (_) { /* skip if logo unavailable */ }

  // ── Title ──────────────────────────────────────────────────────
  const modeLabel = mode === 'pittogramma' ? 'pittogramma' : 'logo'
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(24)
  doc.setTextColor(...ACCENT)
  doc.text(`Segno - Revisione ${modeLabel}`, MARGIN, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(dateStr, MARGIN, y)
  y += 10

  // ── Logo image ────────────────────────────────────────────────
  if (imageDataUrl) {
    try {
      const png = await loadAsPng(imageDataUrl)
      if (png) {
        const MAX_PDF_W = 70  // mm
        const MAX_PDF_H = 50  // mm
        const ratio     = png.w / png.h
        let pdfW = MAX_PDF_W
        let pdfH = pdfW / ratio
        if (pdfH > MAX_PDF_H) { pdfH = MAX_PDF_H; pdfW = pdfH * ratio }
        const imgX = (PW - pdfW) / 2
        doc.addImage(png.dataUrl, 'PNG', imgX, y, pdfW, pdfH, undefined, 'FAST')
        y += pdfH + 10
      }
    } catch (_) {
      // silently skip image if something goes wrong
    }
  }

  // ── Review criteria ───────────────────────────────────────────
  y = checkPageBreak(doc, y, PH, MARGIN)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...HEADING)
  doc.text('CRITERI DI REVISIONE', MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BODY_CLR)
  for (const c of criteria) {
    y = checkPageBreak(doc, y, PH, MARGIN)
    doc.text(`\xB7  ${sanitize(c)}`, MARGIN + 2, y)
    y += 5
  }
  y += 6

  // ── Project context ───────────────────────────────────────────
  if (context?.trim()) {
    y = checkPageBreak(doc, y, PH, MARGIN)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...HEADING)
    doc.text('CONTESTO DEL PROGETTO', MARGIN, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...BODY_CLR)
    y = writeWrapped(doc, sanitize(context.trim()), MARGIN + 2, y, CW - 4, 5, PH, MARGIN)
    y += 6
  }

  // ── Feedback ───────────────────────────────────────────────────
  y = checkPageBreak(doc, y, PH, MARGIN)

  // Render feedback line by line matching on-screen hierarchy
  const feedbackLines = feedback.split('\n')
  for (const raw of feedbackLines) {
    const line = sanitize(raw.trim())

    if (line === '') continue

    y = checkPageBreak(doc, y, PH, MARGIN)

    if (line.startsWith('# ') && !line.startsWith('## ') && !line.startsWith('### ')) {
      // H1 — large accent title
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(18)
      doc.setTextColor(...ACCENT)
      const heading = line.replace(/^#\s+/, '').replace(/\*\*/g, '')
      const wrapped = doc.splitTextToSize(heading, CW)
      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 7 + 4

    } else if (line.startsWith('## ')) {
      // H2 — uppercase section label
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...GHOST)
      const heading = line.replace(/^##\s+/, '').replace(/\*\*/g, '').toUpperCase()
      const wrapped = doc.splitTextToSize(heading, CW)
      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 6 + 3

    } else if (line.startsWith('### ')) {
      // H3 — strength/improve detection
      y += 4
      const heading = line.replace(/^###\s+/, '').replace(/\*\*/g, '')
      const lower = heading.toLowerCase()
      let prefix = ''
      let color = HEADING

      if (lower.includes('forza') || lower.includes('positiv') || lower.includes('funziona') || lower.includes('efficac')) {
        prefix = '+ '
        color = GREEN_D
      } else if (lower.includes('miglior') || lower.includes('critic') || lower.includes('attenzione') || lower.includes('debolezz')) {
        prefix = '> '
        color = ACCENT
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...color)
      const wrapped = doc.splitTextToSize(`${prefix}${heading}`, CW)
      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 5.5 + 2

    } else if (line.match(/^[-*\u2022]\s/)) {
      // Bullet list item
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...BODY_CLR)
      const bullet = line.replace(/^[-*\u2022]\s/, '').replace(/\*\*(.+?)\*\*/g, '$1')
      const wrapped = doc.splitTextToSize(`\xB7  ${bullet}`, CW - 6)
      for (const w of wrapped) {
        y = checkPageBreak(doc, y, PH, MARGIN)
        doc.text(w, MARGIN + 3, y)
        y += 5
      }

    } else {
      // Body paragraph
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...BODY_CLR)
      const clean = line.replace(/\*\*(.+?)\*\*/g, '$1')
      const wrapped = doc.splitTextToSize(clean, CW)
      for (const w of wrapped) {
        y = checkPageBreak(doc, y, PH, MARGIN)
        doc.text(w, MARGIN, y)
        y += 5.5
      }
    }
  }

  // ── Footer on every page ──────────────────────────────────────
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Segno - Revisione ${modeLabel} - ${now.toLocaleDateString('it-IT')}`,
      MARGIN,
      PH - 10,
    )
    doc.text(`${i} / ${total}`, PW - MARGIN, PH - 10, { align: 'right' })
  }

  const slug = now.toISOString().slice(0, 10)
  doc.save(`segno-revisione-${slug}.pdf`)
}
