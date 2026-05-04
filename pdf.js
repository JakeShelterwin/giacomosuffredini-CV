/**
 * pdf.js
 * Genera un PDF del CV leggendo direttamente il DOM.
 * Dipendenza esterna: jsPDF (caricato via CDN)
 */

async function generateCV_PDF() { 

  const urlSite = window.location.href;
  // 1. Mostra un feedback all'utente (opzionale)
  const btn = event.currentTarget; /* prende il pulsante che ha attivato l'evento */
  const originalText = btn.innerHTML;   /* salva il contenuto originale del pulsante */
  btn.innerHTML = "Caricamento..."; /* cambia il testo del pulsante per indicare che il processo è in corso */

  try {
    // 2. Carica dinamicamente jsPDF solo ora
    if (!window.jspdf) {
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    // Estrae il costruttore jsPDF dall'oggetto globale window.jspdf (iniettato dal CDN)
    const { jsPDF } = window.jspdf;

    // Crea una nuova istanza di documento PDF:
    // - unit: 'mm'          → tutte le misure saranno espresse in millimetri
    // - format: 'a4'        → dimensioni foglio A4 (210×297 mm)
    // - orientation: 'portrait' → orientamento verticale (ritratto)
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // ── Costanti layout (tutte in millimetri, formato A4) ────────

    const W       = 210;          // larghezza totale della pagina A4 in mm
    const ML      = 15;           // margine sinistro: distanza dal bordo sinistro all'inizio del testo
    const MR      = 15;           // margine destro: distanza dal bordo destro alla fine del testo
    const MT      = 55;           // margine top del contenuto: la banda scura dell'intestazione occupa i primi ~42mm, il testo parte da qui
    const MB      = 15;           // margine inferiore: se il cursore y supera PAGE_H - MB si crea una nuova pagina
    const CONTENT = W - ML - MR; // larghezza utile del testo = 210 - 15 - 15 = 180 mm
    const PAGE_H  = 297;          // altezza totale della pagina A4 in mm

    // ── Palette colori RGB [R, G, B] ──────────────────────────
    // jsPDF accetta colori come array [R, G, B] con valori 0-255.
    // Modificare qui per cambiare l'intera palette del PDF.

    const C_DARK   = [3,  4,  12];   // quasi nero tendente al blu: usato per nomi azienda/istituto e banda intestazione
    const C_TEXT   = [40,  40,  60];   // grigio scuro: usato per il corpo del testo (descrizioni, paragrafi)
    const C_MUTED  = [100, 110, 140];  // grigio medio: usato per date, livelli lingua, testo footer
    const C_ACCENT = [37, 99, 235];    // blu pianeta: usato per titoli sezione, ruoli, bullet
    const C_ACCENT_2 = [91, 156, 246];    // blu pianeta2: usato per i sottotitoli
    const C_ACCENT_3 = [182, 213, 255];    // blu pianeta3: usato per linee decorative
    const C_LINE   = [220, 225, 240];  // grigio chiarissimo: usato per le linee separatori sottili tra le voci
    const F_SIZE_P = 9;                // dimensione del font per il testo del paragrafo

    // y è il cursore verticale in millimetri.
    // Parte da MT (inizio contenuto dopo l'intestazione).
    // Ogni funzione di scrittura incrementa y verso il basso.
    // Quando y + spazio_necessario > PAGE_H - MB, checkPage() aggiunge una nuova pagina e resetta y a 18.
    let y = MT;

    // ── Utilities ─────────────────────────────────────────────

    /**
     * Controlla se c'è abbastanza spazio verticale per il prossimo blocco.
     * @param {number} needed - spazio stimato necessario in mm (default 10)
     */
    function checkPage(needed = 10) {
      // Se il cursore y più lo spazio richiesto supera il margine inferiore...
      if (y + needed > PAGE_H - MB) {
        doc.addPage();  // ...aggiunge una nuova pagina al documento
        y = 18;         // ...resetta il cursore al margine top della nuova pagina
      }
    }

    /**
     * Pulisce una stringa HTML restituendo solo testo leggibile.
     * @param {string} str - stringa eventualmente contenente tag HTML
     * @returns {string} testo pulito
     */
    function clean(str) {
      if (!str) return '';
      // Crea un elemento temporaneo per decodificare entità e gestire l'HTML
      const temp = document.createElement('div');
      temp.innerHTML = str.replace(/<br\s*\/?>/gi, '\n'); // Mantieni i ritorni a capo
      const text = temp.textContent || temp.innerText || '';
      return text.replace(/\s+/g, ' ').trim();
    }

    function safeUrl(url, fallback) {
      if (!url) return fallback;
      // Permetti solo http, https e mailto
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return url;
      }
      return fallback;
    }

    /**
     * Scrive testo con wrapping automatico alla larghezza massima specificata.
     * Avanza il cursore y in base al numero di righe scritte.
     * @param {string} text      - testo da scrivere (può contenere HTML, verrà pulito)
     * @param {number} x         - posizione orizzontale di partenza in mm
     * @param {number} fontSize  - dimensione del font in pt
     * @param {Array}  color     - colore RGB come array [R, G, B]
     * @param {string} fontStyle - stile del font: 'normal' | 'bold' | 'italic'
     * @param {number} maxWidth  - larghezza massima del testo prima del wrap (default: CONTENT)
     */
    function addText(text, x, fontSize, color, fontStyle = 'normal', maxWidth = CONTENT) {
      const t = clean(text);      // pulisce il testo da eventuali tag HTML
      if (!t) return;             // esce subito se il testo è vuoto, evitando righe bianche

      doc.setFontSize(fontSize);              // imposta la dimensione del font
      doc.setTextColor(...color);             // imposta il colore del testo (spread dell'array RGB)
      doc.setFont('helvetica', fontStyle);    // imposta il font Helvetica con lo stile richiesto

      // splitTextToSize divide il testo in un array di righe che rispettano maxWidth
      const lines = doc.splitTextToSize(t, maxWidth);

      // Stima lo spazio verticale: numero righe × altezza stimata di ogni riga (fontSize × 0.42) + margine basso
      checkPage(lines.length * (fontSize * 0.42) + 2);

      doc.text(lines, x, y);  // scrive tutte le righe a partire dalla posizione (x, y)

      // Avanza y in base all'altezza occupata dal blocco di testo
      y += lines.length * (fontSize * 0.42) + 1;
    }

    /**
     * Scrive testo allineato al margine destro, sulla riga corrente (stesso y di chi ha chiamato prima).
     * Non avanza y: serve a scrivere, per esempio, la data sulla stessa riga del titolo.
     * @param {string} text      - testo da allineare a destra
     * @param {number} fontSize  - dimensione del font in pt
     * @param {Array}  color     - colore RGB come array [R, G, B]
     * @param {string} fontStyle - stile del font: 'normal' | 'bold' | 'italic'
     */
    function addRight(text, fontSize, color, fontStyle = 'normal', altezza = y) {
      const t = clean(text);      // pulisce il testo da eventuali tag HTML
      if (!t) return;             // esce se il testo è vuoto

      doc.setFontSize(fontSize);              // imposta la dimensione del font
      doc.setTextColor(...color);             // imposta il colore del testo
      doc.setFont('helvetica', fontStyle);    // imposta il font con lo stile richiesto

      const tw = doc.getTextWidth(t);         // misura la larghezza del testo in mm
      // Posiziona il testo in modo che il suo bordo destro coincida con il margine destro della pagina
      doc.text(t, W - MR - tw, altezza);
    }

    /**
     * Disegna un titolo di sezione con testo in maiuscolo e una linea colorata sotto.
     * Aggiunge margine sopra e sotto per separare visivamente le sezioni.
     * @param {string} label - nome della sezione (es. "Esperienze")
     */
    function sectionTitle(label) {
      checkPage(16);          // verifica che ci sia spazio sufficiente per il titolo + linea

      y += 6;                 // aggiunge spazio verticale sopra il titolo (respiro tra sezioni)

      doc.setFontSize(13);                        // dimensione del testo del titolo sezione
      doc.setFont('helvetica', 'bold');           // font in grassetto
      doc.setTextColor(...C_ACCENT);              // colore accent (blu)
      doc.text(label.toUpperCase(), ML, y);       // scrive il testo in maiuscolo allineato al margine sinistro

      y += 3;                                     // sposta il cursore sotto il testo per posizionare la linea

      doc.setDrawColor(...C_ACCENT_3);              // colore della linea = stesso dell'accent
      doc.setLineWidth(0.4);                      // spessore della linea in mm
      doc.line(ML, y, W - MR, y);                // traccia la linea orizzontale da margine sinistro a destro

      y += 6;                                     // aggiunge spazio dopo la linea prima del contenuto
    }

    /**
     * Disegna una linea separatrice sottile e grigia tra le voci (es. tra due esperienze lavorative).
     * Aggiunge margine sopra e sotto la linea.
     */
    function thinLine() {
      checkPage(8);           // verifica che ci sia spazio per la linea + margini

      y += 3;                 // margine sopra la linea

      doc.setDrawColor(...C_LINE);    // colore grigio chiarissimo per la linea
      doc.setLineWidth(0.2);          // linea molto sottile (0.2 mm)
      doc.line(ML, y, W - MR, y);    // traccia la linea orizzontale da margine a margine

      y += 3;                 // margine sotto la linea prima del prossimo contenuto
    }

    // ─────────────────────────────────────────────────────────
    // 1. INTESTAZIONE (banda scura)
    // ─────────────────────────────────────────────────────────

    doc.setFillColor(...C_DARK);          // imposta il colore di riempimento = quasi-nero blu
    doc.rect(0, 0, W, 55, 'F');          // disegna un rettangolo pieno (F = Fill) che copre tutta la larghezza, alto 50mm, partendo dall'angolo in alto a sinistra

    // Legge il nome dall'h1 nell'header del DOM.
    // L'h1 contiene sia un text node con il nome sia uno <span> con il ruolo;
    // si cerca solo il primo text node diretto (nodeType === 3) non vuoto.
    const h1 = document.querySelector('header.tile h1');   // seleziona l'h1 nell'header con classe "tile"
    const nomeNode = [...(h1?.childNodes || [])].find(     // converte i childNodes in array e cerca...
      n => n.nodeType === 3 && n.textContent.trim()        // ...il primo nodo di tipo testo (3) non vuoto
    );
    // Usa il testo trovato oppure il valore di fallback 'Giacomo Suffredini'
    const nome = (nomeNode?.textContent || 'Giacomo Suffredini').trim();

    doc.setFontSize(33);                          // dimensione grande per il nome
    doc.setFont('helvetica', 'bold');             // grassetto per il nome
    doc.setTextColor(255, 248, 231);              // bianco caldo per il nome (leggibile sulla banda scura)
    doc.text(nome.toUpperCase(), ML, 22);         // scrive il nome in maiuscolo a y=22mm dall'alto

    // Legge il ruolo dallo <span> figlio dell'h1 (es. "Full Stack Web Developer")
    const ruolo = clean(h1?.querySelector('span')?.textContent || 'Full Stack Web Developer');

    doc.setFontSize(13);                          // dimensione più piccola per il ruolo
    doc.setFont('helvetica', 'normal');           // peso normale (non bold)
    doc.setTextColor(255, 248, 231);              // bianco caldo per il ruolo (leggibile sulla banda scura)
    doc.text(ruolo.toUpperCase(), ML, 30);        // scrive il ruolo in maiuscolo a y=30mm

    // Recupero i dati dal DOM (Testo per la visualizzazione e HREF per i link) dei contatti (email, github, linkedin) con fallback ai valori hardcoded se non trovati
    const emailNode = document.querySelector('header.tile .liMail a');
    const emailText = emailNode?.textContent?.trim() || 'jake.suffredini@gmail.com';
    const emailHref = safeUrl(emailNode?.href, `mailto:${emailText}`);

    const githubNode = document.querySelector('header.tile .liGithub a');
    const githubText = githubNode?.textContent?.trim() || 'github.com/JakeShelterwin';
    const githubHref = safeUrl(githubNode?.href, `https://${githubText}`);

    const linkedinNode = document.querySelector('header.tile .liLinkedin a');
    const linkedinText = linkedinNode?.textContent?.trim() || 'linkedin.com/in/giacomo-suffredini-0b16181b1';
    const linkedinHref = safeUrl(linkedinNode?.href, `https://${linkedinText}`);

    // Configuro lo stile per jsPDF
    doc.setFontSize(9); /* dimen */
    doc.setTextColor(255, 248, 231); 

    let currentX = ML;
    const separator = "   |   ";
    const sepWidth = doc.getTextWidth(separator);
    const rigaY = 42;


    // Email
    doc.text(emailText, currentX, rigaY);
    doc.link(currentX, rigaY - 4, doc.getTextWidth(emailText), 5, { url: emailHref });
    currentX += doc.getTextWidth(emailText);

    // Separatore 1
    doc.text(separator, currentX, rigaY);
    currentX += sepWidth;

    // GitHub
    doc.text(githubHref, currentX, rigaY);
    doc.link(currentX, rigaY - 4, doc.getTextWidth(githubHref), 5, { url: githubHref });
    currentX += doc.getTextWidth(githubHref);

    // Separatore 2
    doc.text(separator, currentX, rigaY);
    currentX += sepWidth;

    // LinkedIn
    doc.text(linkedinHref, currentX, rigaY);
    doc.link(currentX, rigaY - 4, doc.getTextWidth(linkedinHref), 5, { url: linkedinHref });

    y = MT;

    // ─────────────────────────────────────────────────────────
    // 2. IN BREVE
    // ─────────────────────────────────────────────────────────

    // Cerca il tile della sezione sommario nel DOM
    y += 5;
    const summaryTile = document.querySelector('.summary-section .tile');
    if (summaryTile) {
      // Legge il testo dell'h2 come titolo della sezione (con fallback 'In Breve')
      sectionTitle(clean(summaryTile.querySelector('h2')?.textContent || 'In Breve'));

      // Itera su tutti i paragrafi <p> dentro il tile e li scrive nel PDF
      summaryTile.querySelectorAll('p').forEach(p => {
        addText(p.innerHTML, ML, F_SIZE_P, C_TEXT);  // usa innerHTML per preservare <br> che clean() trasformerà in spazi
        y += 1.5;                               // piccolo spazio tra un paragrafo e l'altro
      });
    }

    // ─────────────────────────────────────────────────────────
    // 3. HARD SKILLS — due colonne
    // ─────────────────────────────────────────────────────────

    // Cerca il tile della sezione hard skills nel DOM
    const skillsTile = document.querySelector('.sezione-hard-skills .tile');
    if (skillsTile) {
      sectionTitle(clean(skillsTile.querySelector('h2')?.textContent || 'Hard Skills'));

      // Raccoglie tutti i <dt> (termini) e <dd> (definizioni) della lista descrittiva
      const dts = [...skillsTile.querySelectorAll('dt')];   // array di tutti i termini (nomi categoria skill)
      const dds = [...skillsTile.querySelectorAll('dd')];   // array di tutte le definizioni (valori skill)

      const colW = (CONTENT - 10) / 2;  // larghezza di ogni colonna = (spazio utile - gap centrale) / 2
      const colY = [y, y];              // array che traccia il cursore y per ciascuna delle due colonne (col 0 = sinistra, col 1 = destra)

      // Itera su ogni coppia dt/dd e le distribuisce alternativamente nelle due colonne
      dts.forEach((dt, i) => {
        const col  = i % 2;                   // 0 = colonna sinistra, 1 = colonna destra (alternanza)
        const xOff = ML + col * (colW + 10);  // offset orizzontale: colonna sinistra parte da ML, destra da ML + colW + gap

        y = colY[col];    // riprende il cursore y dalla posizione corrente della colonna scelta
        checkPage(14);    // verifica che ci sia spazio per circa una voce skill

        // Scrive il nome della categoria skill in maiuscolo e in accent
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_ACCENT_2);
        doc.text(clean(dt.textContent).toUpperCase(), xOff, y);  // testo del <dt> in maiuscolo
        y += 5;  // spazio tra il titolo categoria e il valore

        // Scrive il valore della skill (il <dd> corrispondente)
        doc.setFontSize(F_SIZE_P);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C_TEXT);
        const lines = doc.splitTextToSize(clean(dds[i]?.textContent || ''), colW); // divide il testo in righe entro la larghezza della colonna
        doc.text(lines, xOff, y);                                                  // scrive le righe
        y += lines.length * 3.6 + 5;   // avanza y in base al numero di righe + margine inferiore voce

        colY[col] = y;  // aggiorna il cursore della colonna corrente
      });

      // Dopo aver stampato tutte le skill, il cursore y viene portato sotto la colonna più lunga
      y = Math.max(...colY) - 2; /* tolto il margine inferiore dell'ultima voce */
    }

    // ─────────────────────────────────────────────────────────
    // 4. ESPERIENZE
    // ─────────────────────────────────────────────────────────
    const espTile = document.querySelector('.esperienze.tile');
    if (espTile) {
      sectionTitle(clean(espTile.querySelector('h2')?.textContent || 'Esperienze'));
      y -= 3;  // piccolo spazio dopo il titolo sezione
      // Itera su ogni articolo di esperienza lavorativa
      espTile.querySelectorAll('article.singleEsperienza').forEach(article => {
        checkPage(20);  // verifica spazio per almeno un blocco esperienza (intestazione + qualche riga)

        // Legge il nome dell'azienda dall'h3.location.
        const h3 = article.querySelector('h3.location');
        const aziendaNode = [...(h3?.childNodes || [])].find(
          n => n.nodeType === 3 && n.textContent.trim() ||   // text node diretto non vuoto
              (n.nodeType === 1 && n.tagName === 'A')        // oppure elemento <a>
        );
        const azienda = clean(
          h3?.querySelector('a')?.textContent ||   // preferisce il testo del link
          aziendaNode?.textContent ||              // altrimenti usa il text node
          ''
        );
        y += 5;

        // Legge il periodo complessivo dell'esperienza dallo span dentro .time
        const periodo = clean(article.querySelector('.time span')?.textContent || '');

        // Scrive il nome azienda in grassetto grande (riga sinistra)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_DARK);
        doc.text(azienda, ML, y);

        // Scrive il periodo allineato a destra sulla stessa riga (addRight non avanza y)
        addRight(periodo, 8.5, C_MUTED, 'bold', y);  
        y += 6;  // avanza y dopo la riga azienda+periodo

        // Itera su ogni mansione/ruolo svolto all'interno dell'esperienza
        article.querySelectorAll('.single-mansione').forEach(mansione => {
          checkPage(14);  // verifica spazio per il blocco ruolo + qualche riga descrizione

          // --- INIZIO LOGICA LINEA SPEZZATA ---
          const startMansioneY = y; // Salva la Y dove inizia questo specifico ruolo
          const timelineX = ML + 1;  // Posizione orizzontale della linea

          const ruoloTxt = clean(mansione.querySelector('h4')?.textContent || '');           // testo del ruolo (es. "Frontend Developer")
          const dateTxt  = clean(mansione.querySelector('.stats span')?.textContent || '');  // date del ruolo (es. "Gen 2022 – Dic 2023")

          // Scrive il ruolo in accent e grassetto (rientrato di 4mm per far spazio alla linea)
          doc.setFontSize(F_SIZE_P);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C_ACCENT_2);
          doc.text(ruoloTxt, ML + 4, y + 2);

          // Scrive le date del ruolo allineate a destra sulla stessa riga
          addRight(dateTxt, 8, C_MUTED, 'bold', y + 2);
          y += 7;  // avanza y dopo la riga ruolo+date

          // Legge la descrizione del ruolo
          const desc = mansione.querySelector('.descrizione');
          if (desc) {
            const ps = desc.querySelectorAll('p');   // cerca eventuali paragrafi <p> dentro .descrizione
            if (ps.length) {
              // Se ci sono paragrafi, li scrive uno per uno con rientro di 4mm
              ps.forEach(p => {
                addText(p.innerHTML, ML + 4, F_SIZE_P, C_TEXT, 'normal', CONTENT - 4);
                y += 0.8;  // piccolo spazio tra paragrafi della descrizione
              });
            } else {
              // Se non ci sono <p>, scrive il contenuto HTML diretto del div .descrizione
              addText(desc.innerHTML, ML + 4, F_SIZE_P, C_TEXT, 'normal', CONTENT - 4);
            }
          }

          // --- DISEGNA IL SEGMENTO DELLA LINEA ---
          // La linea copre solo questa mansione, dall'altezza del titolo alla fine della descrizione
          doc.setDrawColor(...C_ACCENT_3);
          doc.setLineWidth(0.3);
          doc.line(timelineX, startMansioneY - 2, timelineX, y - 3); // la linea parte 2mm sopra il titolo e finisce 3mm prima del prossimo blocco (dove c'è lo stacco)

          if (mansione !== article.querySelector(".single-mansione:last-of-type")) /* se non è l'ultima mansione allora aggiungi uno stacco */
          y += 3; // Spazio di "stacco" tra una mansione e l'altra (dove la linea si interrompe)
        });

        if (article !== espTile.querySelector('article.singleEsperienza:last-of-type')) /* se non è l'ultima esperienza allora aggiungi una linea  */
        thinLine();  // traccia una linea separatrice sottile dopo ogni esperienza lavorativa
      });
    }

    // ─────────────────────────────────────────────────────────
    // 5. FORMAZIONE
    // ─────────────────────────────────────────────────────────
    y += 5;
    // Cerca il tile della sezione formazione nel DOM
    // 5. FORMAZIONE
    // Cerca il tile della sezione formazione nel DOM
    const formazioneTile = document.querySelector('.formazione.tile');
    if (formazioneTile) {
      sectionTitle(clean(formazioneTile.querySelector('h2')?.textContent || 'Formazione'));

      y -= 1;

      // Itera su ogni voce di formazione (scuola, università, corso ecc.)
      formazioneTile.querySelectorAll('article.itemFormazione').forEach(article => {
        checkPage(16);  // verifica spazio per intestazione istituto + qualche riga

        // Legge il nome dell'istituto: raccoglie solo i text node diretti dell'h3.location
        // (esclude lo <span> che contiene il .time, ossia il periodo)
        const h3 = article.querySelector('h3.location');
        const istituto = clean(
          [...(h3?.childNodes || [])]
            .filter(n => n.nodeType === 3)           // filtra solo i text node diretti (nodeType === 3)
            .map(n => n.textContent)                 // estrae il testo di ciascuno
            .join(' ') || h3?.textContent || ''      // li unisce; se nessun text node, usa l'intero textContent dell'h3
        );
        y += 3;

        const periodo = clean(article.querySelector('.time span')?.textContent || '');   // periodo formazione (es. "2015 – 2018")
        const grado   = clean(article.querySelector('h4')?.textContent || '');           // titolo/grado conseguito (es. "Diploma Scientifico")
        const desc    = clean(article.querySelector('.descrizione')?.innerHTML || '');   // descrizione/dettagli del percorso

        // --- LOGICA LINEA VERTICALE (TIMELINE) ---
        const timelineX = ML + 1;        // Posizione X della linea
        const startFormazioneY = y + 4;  // Inizia la linea dopo il nome dell'istituto

        // Scrive il nome dell'istituto in grassetto (riga sinistra)
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_DARK);
        doc.text(istituto, ML, y);
        y += 2;

        // Scrive il periodo allineato a destra sulla stessa riga
        addRight(periodo, 8, C_MUTED);
        y += 5;  // avanza y dopo la riga istituto+periodo

        // Scrive il grado/titolo in accent con rientro di 4mm per la linea
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_ACCENT_2);
        doc.text('' + grado, ML + 4, y); // Rientro portato a 4mm
        y += 4;  // avanza y dopo il grado

        // Scrive la descrizione del percorso formativo con rientro di 4mm
        addText(desc, ML + 4, F_SIZE_P, C_TEXT, 'normal', CONTENT - 4);
        y -= 2;

        // --- DISEGNA IL SEGMENTO DELLA LINEA ---
        doc.setDrawColor(...C_ACCENT_2); // Usiamo il colore accent della formazione
        doc.setLineWidth(0.3);
        doc.line(timelineX, startFormazioneY, timelineX, y - 2);

        if (article !== formazioneTile.querySelector('article.itemFormazione:last-of-type')) /* se non è l'ultima esperienza allora aggiungi una linea  */
        thinLine();    // linea separatrice dopo ogni voce di formazione
        y += 2;
      });
    }


    y += 2;
    // doc.setDrawColor(...[255, 255, 255]);              // colore della linea = bianco
    // doc.setLineWidth(0.4);                      // spessore della linea in mm
    // doc.line(ML, y, W - MR, y);                // traccia la linea orizzontale da margine sinistro a destro
    y += 5;


    // ─────────────────────────────────────────────────────────
    // 6. LINGUE + SOFT SKILLS + ABOUT — tre colonne affiancate
    // ─────────────────────────────────────────────────────────

    /* checkPage(16); */ // verifica che ci sia spazio per il blocco a tre colonne (~45mm stimati)
    y += 3;
    
    // ── CONFIGURAZIONE DELLE 3 COLONNE ───────────────────────────
    const cols = 3;
    const gap = 30; // Spazio (in mm) tra una colonna e l'altra
    // Calcolo corretto della larghezza di ciascuna colonna:
    const thirdW = (CONTENT - (gap * (cols - 1))) / cols; 
    const rowStartY = y; // Salva la Y di partenza comune
    
    let maxY = y; // Variabile d'appoggio per aggiornare la Y globale alla fine

    // ── Colonna 1: Lingue ──────────────────────────────────
    const lingueTile = document.querySelector('.lingue.tile');
    if (lingueTile) {
      // 1. Titolo della colonna Lingue
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C_ACCENT);
      y -= 8; // piccolo spazio dopo il titolo
      sectionTitle(clean(lingueTile.querySelector('h2')?.textContent || 'Lingue').toUpperCase(), ML, y);
      y -= 5; // piccolo spazio dopo il titolo

      let ly = y + 5; 

      // 2. Recupero tutte le lingue e i livelli
      const dts = lingueTile.querySelectorAll('dt');
      const dds = lingueTile.querySelectorAll('dd');

      // 3. Iteriamo su dt e dd distribuendoli su 3 colonne
      dts.forEach((dt, i) => {
        const nomeL  = clean(dt.textContent);
        const levelL = clean(dds[i]?.textContent || '');

        // Calcolo della colonna corrente (0, 1 o 2)
        const colIndex = i % cols;
        
        // Se ricominciamo da colonna 0 dopo la terza lingua, scendiamo di riga
        if (i > 0 && colIndex === 0) {
          ly += 5;
        }

        // Calcolo la X di partenza della colonna corrente
        const colX = ML + colIndex * (thirdW + gap);

        // Stampa il nome della lingua (allineato a sinistra della colonna)
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C_TEXT);
        doc.text(nomeL, colX, ly);

        // Stampa il livello (allineato a destra della colonna - Space Between)
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C_MUTED);
        const lw = doc.getTextWidth(levelL);
        doc.text(levelL, colX + thirdW - lw, ly);
      });

      // Calcola la Y massima raggiunta
      maxY = Math.max(maxY, ly + 5);
    }

    // Aggiorna la coordinata Y globale per la sezione successiva
    y = maxY;

    // ── Colonna 2: Soft Skills ─────────────────────────────

    // const softTile = document.querySelector('.softSkill.tile');   // cerca il tile delle soft skill
    // if (softTile) {
    //   const sx = ML + thirdW + 17;   // offset x della seconda colonna = inizio prima colonna + larghezza colonna + gap (10mm)
    //   let sy = rowStartY;            // cursore y locale per questa colonna, parte dalla stessa riga delle altre

    //   // Scrive il titolo della colonna Soft Skills
    //   doc.setFontSize(11);
    //   doc.setFont('helvetica', 'bold');
    //   doc.setTextColor(...C_ACCENT);
    //   doc.text(clean(softTile.querySelector('h2')?.textContent || 'Soft Skill').toUpperCase(), sx, sy);
    //   sy += 5;  // avanza il cursore locale dopo il titolo

    //   // Itera su ogni <li> della lista soft skill
    //   softTile.querySelectorAll('li').forEach(li => {
    //     doc.setFontSize(F_SIZE_P);
    //     doc.setFont('helvetica', 'normal');
    //     doc.setTextColor(...C_TEXT);
    //     doc.text('• ' + clean(li.textContent), sx, sy);  // scrive ogni skill preceduta da un bullet "•"
    //     sy += 4.2;  // avanza il cursore locale (passo leggermente più stretto rispetto alle lingue)
    //   });
    // }

    // ── Colonna 3: About ──────────────────────────────────

    /* y += 5; */
    const aboutTile = document.querySelector('.about.tile');   // cerca il tile della sezione About
    if (aboutTile) {
      const ax = ML + (CONTENT + 10) * 0;   // offset x della terza colonna = inizio prima colonna + (larghezza colonna + gap) × 2
      let ay = rowStartY;                  // cursore y locale per questa colonna
      ay = y;                  // cursore y locale per questa colonna

      // Scrive il titolo della colonna About
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C_ACCENT);
      ay -= 10;  // avanza il cursore locale dopo il titolo
      sectionTitle(clean(aboutTile.querySelector('h2')?.textContent || 'About').toUpperCase(), ax, ay);
      ay += 25;  // avanza il cursore locale dopo il titolo

      // Legge il testo del paragrafo About
      const aboutText = clean(aboutTile.querySelector('p')?.innerHTML || '');

      // Scrive il testo About con wrap entro la larghezza della terza colonna
      doc.setFontSize(F_SIZE_P);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C_TEXT);
      const aboutLines = doc.splitTextToSize(aboutText, CONTENT);  // divide il testo in righe entro thirdW
      doc.text(aboutLines, ax, ay);                                // scrive tutte le righe
      /* y = Math.max(y, ay + aboutLines.length * F_SIZE_P * 0.3528);  */
    }
    

    // ─────────────────────────────────────────────────────────
    // FOOTER — numero di pagina su ogni pagina
    // ─────────────────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();   // recupera il numero totale di pagine generate

    // Itera su ogni pagina per aggiungere il footer
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);           // seleziona la pagina i per poterci scrivere sopra

      doc.setFontSize(7.5);                   // testo molto piccolo per il footer
      doc.setTextColor(...C_MUTED);           // colore grigio medio per il footer

      const footerText = `giacomosuffredini.com  —  ${i} / ${totalPages}`;
      const footerUrl = urlSite;

      // Scrive il testo centrato
      doc.text(
        footerText,
        W / 2,             // posizione x = metà pagina (per centrare con align: center)
        PAGE_H - 7,        // posizione y = 7mm dal bordo inferiore della pagina
        { align: 'center' }  // allineamento centrato rispetto alla posizione x
      );

      // --- AGGIUNTA LINK CLICCABILE ---
      const textWidth = doc.getTextWidth(footerText);
      const linkX = (W / 2) - (textWidth / 2); // Calcola l'inizio del testo per posizionare il link

      doc.link(
        linkX, 
        PAGE_H - 11,      // Rettangolo cliccabile leggermente sopra la baseline del testo
        textWidth, 
        5, 
        { url: footerUrl }
      );
    }

    // ─────────────────────────────────────────────────────────
    // SALVA / PREVIEW
    // ─────────────────────────────────────────────────────────

    const todayYmd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const pdfFileName = `giacomo-suffredini-curriculum-${todayYmd}.pdf`;

    doc.save(pdfFileName); /* FA IL DOWNLOAD DEL PDF */

    
    // Cerca un eventuale iframe di anteprima già presente nel DOM
    // Genera il PDF come stringa data URI (base64) — usato per mostrarlo nell'iframe
    // const pdfData = doc.output('datauristring'); // RIACCENDERE QUESTA RIGA PER TESTARE L'ANTEPRIMA SENZA DOVER SCARICARE IL PDF OGNI VOLTA
    // let preview = document.getElementById('pdf-preview'); // RIACCENDERE QUESTA RIGA PER TESTARE L'ANTEPRIMA SENZA DOVER SCARICARE IL PDF OGNI VOLTA

    // if (!preview) {

    //   window.generateCV_PDF_save = () => doc.save(pdfFileName);
    //   /* window.generateCV_PDF_save = doc.save('Giacomo-Suffredini-CV.pdf'); */
    //   // Se l'overlay di anteprima non esiste ancora, lo crea dinamicamente
    //   preview = document.createElement('div');     // crea il div contenitore dell'overlay
    //   preview.id = 'pdf-preview';                  // assegna l'id per poterlo recuperare e rimuovere

    //   // Stile inline dell'overlay: copre tutto lo schermo con sfondo scuro semitrasparente
    //   preview.style.cssText = `
    //     position: fixed; inset: 0; z-index: 9999;
    //     background: rgba(0,0,0,0.6);
    //     display: flex; flex-direction: column;
    //     align-items: center; padding: 20px; gap: 10px;
    //   `;

    //   // HTML interno dell'overlay: barra pulsanti + iframe di visualizzazione
    //   preview.innerHTML = `
    //     <div class="contieni-bottoni" style="display:flex;gap:10px;align-items:center">
    //       <button onclick="window.generateCV_PDF_save()" 
    //         style="padding:8px 16px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px">
    //         ↓ Salva PDF
    //       </button>
    //     </div>
    //     <iframe id="pdf-preview-frame" style="width:900px;max-width:95vw;height:85vh;border-radius:8px;border:none"></iframe>
    //   `;

    //   // Aggiunge l'overlay al body della pagina
    //   document.body.appendChild(preview);

      
    //   const closeBtn = document.createElement('button');
    //   closeBtn.innerText = '✕ Chiudi';
    //   closeBtn.style.cssText = `padding:8px 16px; border-radius:8px; border:none; background:#ef4444; color:white; cursor:pointer; font-size: 14px;`;
    
    //   // La funzione è collegata direttamente, non è una stringa di testo
    //   closeBtn.onclick = () => {
    //     document.getElementById('pdf-preview').remove();
    //   };
    
    //   // Poi lo aggiungi al contenitore dei bottoni
    //   const controls = preview.querySelector('.contieni-bottoni');
    //   if (controls) {
    //     controls.prepend(closeBtn); // primo figlio
    //   } else {
    //     preview.appendChild(closeBtn); // fallback
    //   }
    
    //   // Imposta il src dell'iframe con il data URI del PDF → il browser lo renderizza direttamente
    //   document.getElementById('pdf-preview-frame').src = pdfData;
    // }

  

  // Espone la funzione generateCV_PDF sull'oggetto globale window,
  // rendendola richiamabile dall'HTML (es. onclick="generateCV_PDF()")
  /* window.generateCV_PDF = generateCV_PDF; */

  } catch (err) {
    console.error("Errore nel caricamento della libreria PDF:", err);
  } finally {
    btn.innerHTML = originalText; // Ripristina il testo originale del bottone indipendentemente da errori
  }
}
