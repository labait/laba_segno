const MODEL = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT =
  'Sei un esperto di proprietà intellettuale e identità visiva. ' +
  'Il tuo compito è analizzare un logo o pittogramma e determinare se assomiglia in modo significativo a marchi, loghi o pittogrammi di brand esistenti e noti. ' +
  'Rispondi SEMPRE in formato JSON valido con questa struttura esatta:\n' +
  '{\n' +
  '  "plagiarism": true | false,\n' +
  '  "confidence": "alta" | "media" | "bassa",\n' +
  '  "matches": [\n' +
  '    {\n' +
  '      "brand": "Nome del brand",\n' +
  '      "similarity": "alta" | "media" | "bassa",\n' +
  '      "details": "Breve spiegazione della somiglianza"\n' +
  '    }\n' +
  '  ],\n' +
  '  "summary": "Frase riassuntiva del verdetto"\n' +
  '}\n\n' +
  'Se non riconosci somiglianze con brand esistenti, rispondi con plagiarism: false e matches vuoto. ' +
  'Sii rigoroso: segnala solo somiglianze realmente significative, non vaghe ispirazioni stilistiche. ' +
  'Rispondi SOLO con il JSON, senza testo prima o dopo.'

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  try {
    const { base64, mimeType, mode } = await request.json()

    if (!base64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Parametri mancanti.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const subject = mode === 'pittogramma' ? 'pittogramma' : 'logo'
    const userPrompt =
      `Analizza questo ${subject} e verifica se presenta somiglianze significative con loghi, marchi o pittogrammi di brand esistenti e noti. ` +
      `Includi anche somiglianze parziali (forma, struttura, composizione, lettering). ` +
      `Rispondi esclusivamente in formato JSON come da istruzioni.`

    const apiKey  = process.env.ANTHROPIC_API_KEY
    const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1000,
        system:     SYSTEM_PROMPT,
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
      } catch (_) { /* ignore */ }
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text = (data.content?.[0]?.text || '').trim()

    if (!text) {
      return new Response(JSON.stringify({
        plagiarism: false, confidence: 'bassa', matches: [],
        summary: 'Non è stato possibile completare la verifica.',
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Parse JSON from Claude's response
    let result
    try {
      result = JSON.parse(text)
    } catch (_) {
      // Try extracting JSON from markdown code block
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[1].trim())
        } catch (_2) {
          result = { plagiarism: false, confidence: 'bassa', matches: [], summary: text }
        }
      } else {
        // Try finding a JSON object in the text
        const braceMatch = text.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          try {
            result = JSON.parse(braceMatch[0])
          } catch (_3) {
            result = { plagiarism: false, confidence: 'bassa', matches: [], summary: text }
          }
        } else {
          result = { plagiarism: false, confidence: 'bassa', matches: [], summary: text }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Errore interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
