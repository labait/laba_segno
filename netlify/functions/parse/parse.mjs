const MODEL = 'claude-sonnet-4-20250514'

const SYSTEM_PROMPT_LOGO =
  'Sei un critico di design specializzato in identità visiva. ' +
  'Analizza il logo caricato dallo studente in modo costruttivo e professionale. ' +
  'Se riconosci il logo di un brand esistente, menzionalo esplicitamente indicando il nome del brand e il designer o studio che lo ha progettato, se noto. ' +
  'Valuta aspetti come leggibilità del logotipo, coerenza tra segno e lettering, riconoscibilità del marchio, uso del colore e scalabilità. ' +
  'IMPORTANTE: verifica sempre se il logo presenta somiglianze significative con loghi di brand esistenti e noti. ' +
  'Se rilevi possibili plagi o somiglianze evidenti, segnalalo in modo chiaro e diretto indicando il brand, il grado di somiglianza e gli elementi in comune. ' +
  'Struttura il feedback in sezioni chiare con punti di forza e aree di miglioramento. ' +
  'Usa un tono da docente: diretto ma incoraggiante. ' +
  'Rispondi sempre in italiano.'

const SYSTEM_PROMPT_PITTOGRAMMA =
  'Sei un critico di design specializzato in identità visiva. ' +
  'Analizza il pittogramma caricato dallo studente in modo costruttivo e professionale. ' +
  'Un pittogramma è un segno iconico puro, senza testo. ' +
  'Valuta aspetti come sintesi formale, riconoscibilità a piccole dimensioni, chiarezza semantica, equilibrio tra pieni e vuoti, e capacità di comunicare senza parole. ' +
  'Se riconosci il pittogramma di un brand o sistema esistente, menzionalo indicando il designer o studio che lo ha progettato, se noto. ' +
  'IMPORTANTE: verifica sempre se il pittogramma presenta somiglianze significative con pittogrammi o icone di brand esistenti e noti. ' +
  'Se rilevi possibili plagi o somiglianze evidenti, segnalalo in modo chiaro e diretto indicando il brand, il grado di somiglianza e gli elementi in comune. ' +
  'Struttura il feedback in sezioni chiare con punti di forza e aree di miglioramento. ' +
  'Usa un tono da docente: diretto ma incoraggiante. ' +
  'Rispondi sempre in italiano.'

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  try {
    const { base64, mimeType, criteria, context, mode } = await request.json()

    if (!base64 || !mimeType || !criteria?.length) {
      return new Response(JSON.stringify({ error: 'Parametri mancanti.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

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
      'seguite da punti elenco. Non usare **grassetto** per i titoli di sezione, usa sempre ### heading.\n\n' +
      'ALLA FINE del feedback, aggiungi sempre una sezione:\n' +
      '## Verifica originalità\n' +
      'Indica chiaramente se il ' + subject + ' presenta somiglianze con brand esistenti. ' +
      'Se sì, elenca i brand coinvolti, il grado di somiglianza (alta/media/bassa) e gli elementi in comune. ' +
      'Se non rilevi somiglianze significative, scrivi che il ' + subject + ' appare originale.'

    const systemPrompt = mode === 'pittogramma' ? SYSTEM_PROMPT_PITTOGRAMMA : SYSTEM_PROMPT_LOGO

    // Netlify AI Gateway injects ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL
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
      } catch (_) { /* ignore */ }
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const text = data.content[0].text

    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Errore interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
