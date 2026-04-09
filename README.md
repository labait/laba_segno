# laba_segno

# prompt

Crea un'applicazione Vue 3 (Vite) chiamata "Segno" per la revisione di loghi e pittogrammi da parte di studenti di design.

## Stack
- Vue 3 + Vite
- Tailwind CSS v4 (installa via: npm install tailwindcss @tailwindcss/vite)
- Configura Tailwind in vite.config.js aggiungendo il plugin:
  import tailwindcss from '@tailwindcss/vite'
  plugins: [vue(), tailwindcss()]
- In src/style.css aggiungi solo: @import "tailwindcss";
- jsPDF (npm install jspdf)
- Anthropic API chiamata direttamente dal browser (nessun backend)

## Funzionalità
1. Campo input per la API key Anthropic (salvata in localStorage)
2. Upload immagine (PNG, JPG, SVG) con anteprima
3. Selezione del tipo di revisione tramite checkbox:
   - Leggibilità e chiarezza del segno
   - Bilanciamento visivo e proporzioni
   - Originalità e coerenza concettuale
   - Uso del colore
   - Scalabilità e versatilità
4. Campo opzionale per il contesto del progetto (brief dello studente)
5. Pulsante "Analizza" che invia l'immagine a Claude con vision
6. Area di output con il feedback strutturato di Claude
7. Pulsante "Scarica revisione PDF"

## Chiamata API
Usa fetch direttamente verso https://api.anthropic.com/v1/messages con:
- header "anthropic-dangerous-direct-browser-access": "true"
- model: "claude-sonnet-4-20250514"
- immagine convertita in base64 (image block)
- max_tokens: 1500

## System prompt da usare nella chiamata
"Sei un critico di design specializzato in identità visiva. Analizza il logo o pittogramma caricato dallo studente in modo costruttivo e professionale. Struttura il feedback in sezioni chiare con punti di forza e aree di miglioramento. Usa un tono da docente: diretto ma incoraggiante. Rispondi sempre in italiano."

## User prompt dinamico
Costruisci il prompt utente includendo: i criteri di revisione selezionati, il contesto del progetto se fornito, e una richiesta esplicita di feedback strutturato.

## Export PDF
Dopo aver ricevuto il feedback di Claude, mostra un pulsante "Scarica revisione PDF".
Il PDF deve essere generato client-side con jsPDF.

Il PDF deve contenere:
- Titolo: "Segno — Revisione logo"
- Data e ora della revisione
- Anteprima del logo caricato (inserita come immagine base64)
- Criteri di revisione selezionati
- Contesto del progetto se fornito
- Il feedback completo di Claude
- Footer con nome app e data

Crea un file src/utils/exportPdf.js con la funzione exportReviewPdf(data)
che accetta un oggetto con: imageBase64, criteria, context, feedback.
Usa jsPDF con formato A4, font Helvetica, gestisci correttamente
l'a capo del testo lungo con splitTextToSize().

## UI
- Design minimale con Tailwind CSS
- Tipografia chiara e leggibile
- Stato di loading durante la chiamata API
- Gestione errori visibile (API key mancante, errore di rete, ecc.)
- Layout a due colonne su desktop: upload + opzioni a sinistra, output a destra

## Identità visiva
L'interfaccia deve usare la seguente identità visiva:

### Colori
[inserisci qui i tuoi colori, es:]
- Primario: #1A1A2E
- Accento: #E94560
- Sfondo: #F5F5F0
- Testo: #1A1A2E

### Logo
Il logo dell'app è il file /public/logo.svg
Il colore di fondo delle pagine è #333 ed i font utilizzati sono l'inter
Mostralo nell'header in alto a sinistra, altezza 32px.
Affiancalo al nome "Segno" oppure usalo da solo se il logo è già wordmark.

### Stile generale
- [descrivi il tono: es. "minimal e professionale", "bold e contemporaneo"]
- Font: [es. "usa Google Font 'DM Sans' per l'interfaccia"]

## Struttura file
src/
  App.vue
  components/
    ApiKeyInput.vue
    ImageUploader.vue
    ReviewOptions.vue
    FeedbackOutput.vue
  utils/
    anthropic.js
    exportPdf.js

Crea tutti i file necessari inclusi package.json e vite.config.js.