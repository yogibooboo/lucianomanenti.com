# Gestione Combinazioni - Burraco

## 1. Validazione di una Combinazione

Quando il giocatore seleziona delle carte e clicca sull'area "Noi" o "Loro", il sistema verifica se le carte formano una combinazione valida tramite `verificaCombinazione()`.

### Requisiti generali
- Minimo 3 carte
- Massimo 1 matta (jolly o pinella) per combinazione
- Deve esserci almeno una carta normale (non jolly/pinella)

### Tris
- Tutte le carte normali devono avere lo stesso numero
- Il seme puo' essere qualsiasi (anche duplicato, dato che ci sono due mazzi)
- Esempio valido: 7-cuori, 7-fiori, 7-picche oppure 7-cuori, 7-cuori, jolly

### Scala
- Tutte le carte normali devono avere lo stesso seme
- I numeri devono formare una sequenza continua (eventualmente con un buco riempito dalla matta)
- Non sono ammessi numeri duplicati
- L'Asso puo' essere basso (prima del 2) o alto (dopo il K), ma non puo' "girare" (K-A-2 non e' valido)
- Se la matta e' posizionata dopo il K, il sistema interpreta la scala come "asso alto"

---

## 2. Posizionamento della Matta al Deposito

Quando si deposita una scala contenente una matta, il sistema determina dove posizionarla tramite `ordinaScalaConJolly()`.

### Logica di posizionamento

Il sistema analizza l'ordine in cui il giocatore ha selezionato le carte:

1. **Matta in un buco**: Se tra le carte normali c'e' un buco nella sequenza (es. 3-5 senza il 4), la matta va nel buco.

2. **Matta all'inizio**: Se il giocatore ha posizionato la matta PRIMA delle carte normali nella selezione, la matta va all'inizio della scala (valore piu' basso).

3. **Matta alla fine**: Se il giocatore ha posizionato la matta DOPO le carte normali, la matta va alla fine della scala (valore piu' alto).

### Caso speciale: Pinella in posizione 2

La pinella (carta con valore 2) ha una particolarita': puo' essere usata come carta naturale in posizione 2 oppure come matta in qualsiasi altra posizione.

- La pinella e' "naturale" SOLO se va in posizione 2 **E** ha lo stesso seme della scala
- Esempio: 2-cuori in scala di cuori (3C-4C) e' naturale, non viene evidenziata in blu
- Esempio: 2-fiori in scala di cuori (3C-4C) e' matta (sta rappresentando il 2C), viene evidenziata in blu
- Se la pinella va in qualsiasi altra posizione, e' sempre una matta

### Finestra di modifica

Dopo aver depositato una combinazione con matta, il giocatore puo' cliccare sulla combinazione per spostare la matta da un'estremita' all'altra (gestito da `spostaMattaCombinazione()`).

---

## 3. Attaccamento di una Carta a una Combinazione

Quando il giocatore trascina una carta su una combinazione esistente, il sistema verifica se l'operazione e' valida tramite `puoAggiungereACombinazione()`.

### Per i Tris
- La carta deve avere lo stesso numero delle carte nel tris
- Se c'e' gia' una matta nel tris, si puo' aggiungere solo la carta che sostituisce la matta

### Per le Scale
- La carta deve avere lo stesso seme della scala
- La carta deve essere consecutiva a una delle estremita' (es. se la scala e' 5-6-7, si puo' aggiungere il 4 o l'8)
- Caso speciale Asso: l'Asso puo' andare prima del 2 (come 1) oppure dopo il K (come 14)

### Sostituzione della Matta

Se la carta che si vuole aggiungere corrisponde al valore della matta nella scala:
- La carta sostituisce la matta in quella posizione
- La matta si sposta automaticamente a un'estremita' della scala
- Di default va all'inizio (valore piu' basso), se non possibile va alla fine
- Dopo la sostituzione, il giocatore puo' cliccare per spostare la matta all'altra estremita'

### Caso speciale: Sostituzione Pinella naturale

Se la scala contiene una pinella in posizione naturale (come 2) e il giocatore aggiunge un 2 dello stesso seme:
- Il 2 aggiunto prende la posizione naturale
- La pinella diventa matta e si sposta a un'estremita' (tipicamente in posizione 1, come Asso)

---

## 4. Visualizzazione

- Le matte (jolly e pinella usata come matta) vengono visualizzate con lo sprite blu (`conjollyselblu.png`)
- Le pinelle in posizione naturale (2) vengono visualizzate normalmente
- Le scale sono mostrate in ordine discendente (dal valore piu' alto al piu' basso)
- I Burraco (7+ carte) hanno un bordo colorato (oro per pulito, argento per sporco)

---

## Funzioni principali

| Funzione | Scopo |
|----------|-------|
| `verificaCombinazione()` | Valida se le carte selezionate formano una combinazione |
| `verificaTris()` | Verifica se le carte formano un tris valido |
| `verificaScala()` | Verifica se le carte formano una scala valida |
| `ordinaScalaConJolly()` | Ordina una scala e posiziona la matta |
| `puoAggiungereACombinazione()` | Verifica se una carta puo' essere aggiunta |
| `aggiungiCartaACombinazione()` | Esegue l'aggiunta della carta |
| `spostaMattaCombinazione()` | Sposta la matta da un'estremita' all'altra |
| `isCartaMatta()` | Determina se una carta sta agendo come matta |
