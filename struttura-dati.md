# Struttura Dati - Burraco

Questo documento descrive le strutture dati che rappresentano lo stato del gioco.
Utile per chi deve implementare una funzione AI che gestisce il turno di un giocatore.

---

## 1. Oggetto `game` (stato globale)

L'oggetto `game` contiene tutto lo stato del gioco:

```javascript
game = {
    modalita: '2v2',           // '1v1' o '2v2'

    giocatori: [],             // Array di 2 o 4 Giocatore
    giocatoreCorrente: 0,      // Indice del giocatore di turno (0-3)

    mazzo: [],                 // Array di Carta (carte da pescare)
    scarti: [],                // Array di Carta (pila degli scarti)
    pozzetti: [[], []],        // Due pozzetti, uno per squadra

    combinazioniNoi: [],       // Array di Combinazione (squadra 0)
    combinazioniLoro: [],      // Array di Combinazione (squadra 1)

    fase: 'pesca',             // Fase corrente (vedi sotto)
    haPescato: false,          // true se il giocatore ha gia' pescato
    carteSelezionate: [],      // Carte selezionate dal giocatore umano

    puntiNoi: 0,               // Punteggio squadra 0
    puntiLoro: 0,              // Punteggio squadra 1
}
```

### Fasi del gioco
- `'attesa'` - In attesa di iniziare
- `'pesca'` - Il giocatore deve pescare (da mazzo o scarti)
- `'gioco'` - Il giocatore puo' fare combinazioni o attaccare carte
- `'scarta'` - Il giocatore deve scartare per finire il turno
- `'finito'` - Partita terminata

---

## 2. Classe `Carta`

Ogni carta ha queste proprieta':

```javascript
carta = {
    id: 123,                   // ID univoco
    seme: 'C',                 // 'C'=Cuori, 'Q'=Quadri, 'F'=Fiori, 'P'=Picche, 'J'=Jolly
    numero: 7,                 // 1-13 per carte normali, 50-51 per jolly
    mazzo: 0,                  // 0 o 1 (ci sono due mazzi identici)
    faceUp: true,              // true se la carta e' scoperta
    selezionata: false,        // true se selezionata dal giocatore

    // Proprieta' per carte in combinazione
    inCombinazione: false,     // true se fa parte di una combinazione
    idCombinazione: -1,        // ID della combinazione (-1 se non in combinazione)

    // Proprieta' per jolly/pinella usati come matta
    jollycomeNumero: null,     // Numero che la matta rappresenta (es: 5)
}
```

### Proprieta' calcolate (getter)
- `carta.isJolly` → `true` se numero >= 50
- `carta.isPinella` → `true` se numero === 2 (il 2 puo' essere usato come matta)
- `carta.punti` → Valore in punti della carta
- `carta.nome` → Nome leggibile (es: "7Cuori", "Jolly")

### Valori carte
| Numero | Carta | Punti |
|--------|-------|-------|
| 1 | Asso | 15 |
| 2-7 | 2-7 | 5 |
| 8-13 | 8-K | 10 |
| 50-51 | Jolly | 30 |

### Nota sulla Pinella
Il 2 (pinella) puo' essere usato in due modi:
1. **Come carta naturale**: in posizione 2 di una scala dello stesso seme
2. **Come matta**: in qualsiasi altra posizione (come un jolly)

Quando usata come matta, `jollycomeNumero` indica la posizione che occupa.

---

## 3. Classe `Giocatore`

```javascript
giocatore = {
    nome: "Giocatore 1",
    posizione: 'bottom',       // 'bottom', 'top', 'left', 'right'
    isUmano: true,             // true se controllato dall'utente
    carte: [],                 // Array di Carta in mano
    haPozzetto: false,         // true se ha gia' preso il pozzetto
    haChiuso: false,           // true se ha chiuso la partita
    squadra: 0,                // 0 = noi, 1 = loro
}
```

### Disposizione giocatori (2v2)
```
        [Compagno - top]
           squadra 0

[Avv.Sx]              [Avv.Dx]
squadra 1              squadra 1
left                   right

        [Giocatore - bottom]
           squadra 0 (umano)
```

---

## 4. Classe `Combinazione`

```javascript
combinazione = {
    id: 1,                     // ID univoco
    tipo: TIPO_SCALA,          // TIPO_TRIS (1) o TIPO_SCALA (2)
    carte: [],                 // Array di Carta nella combinazione
    seme: 'C',                 // Seme della scala (solo per scale)
    numero: 7,                 // Numero del tris (solo per tris)
    assoAlto: false,           // true se l'asso e' dopo il K (Q-K-A)
}
```

### Proprieta' calcolate
- `combinazione.isBurraco` → `true` se carte.length >= 7
- `combinazione.isPulito` → `true` se burraco senza jolly/pinella
- `combinazione.puntiCarte` → Somma punti delle carte
- `combinazione.puntiBurraco` → 100 se pulito, 50 se sporco, 0 se non burraco

### Regole combinazioni
- **Tris**: 3+ carte dello stesso numero (semi qualsiasi)
- **Scala**: 3+ carte consecutive dello stesso seme
- Max 1 matta (jolly o pinella) per combinazione
- Burraco: combinazione di 7+ carte

---

## 5. Informazioni utili per l'AI

### Accesso ai dati durante il turno AI

```javascript
// Giocatore corrente
const giocatore = game.giocatori[game.giocatoreCorrente];

// Carte in mano
const mieCarte = giocatore.carte;

// Ultima carta scartata (se visibile)
const ultimoScarto = game.scarti[game.scarti.length - 1];

// Combinazioni della mia squadra
const mieCombinazioni = giocatore.squadra === 0
    ? game.combinazioniNoi
    : game.combinazioniLoro;

// Combinazioni avversarie
const combiAvversari = giocatore.squadra === 0
    ? game.combinazioniLoro
    : game.combinazioniNoi;

// Numero carte in mano agli altri giocatori
game.giocatori.forEach((g, i) => {
    console.log(g.nome, g.carte.length, 'carte');
});

// Carte rimanenti nel mazzo
const carteNelMazzo = game.mazzo.length;
```

### Azioni possibili

1. **Pescare** (fase 'pesca')
   - Dal mazzo: `pescaDaMazzo()`
   - Dagli scarti: `pescaDaScarti()`

2. **Depositare combinazione** (fase 'gioco')
   - Verificare: `verificaCombinazione(carte)` → ritorna `{valida, tipo, ...}`
   - Depositare: selezionare carte e chiamare `depositaCombinazione()`

3. **Attaccare carta a combinazione** (fase 'gioco')
   - Verificare: `puoAggiungereACombinazione(carta, combinazione)`
   - Aggiungere: `aggiungiCartaACombinazione(carta, combinazione)`

4. **Scartare** (per finire il turno)
   - `scartaCarta(carta)`

### Funzione helper: isCartaMatta()

```javascript
// Verifica se una carta sta agendo come matta (non in posizione naturale)
function isCartaMatta(c) {
    if (c.isJolly) return true;
    if (c.isPinella && c.jollycomeNumero !== null) return true;
    return false;
}
```

---

## 6. Storia delle mosse

L'array `game.storia` traccia tutte le mosse della partita.

```javascript
game.storia = [];
game.turno = 0;  // Incrementato ad ogni cambio turno

// Costanti azioni
const AZIONE_PESCA_MAZZO = 1;
const AZIONE_PESCA_SCARTI = 2;
const AZIONE_SCARTO = 3;
const AZIONE_COMBINAZIONE = 4;
const AZIONE_ATTACCO = 5;
const AZIONE_POZZETTO = 6;

// Struttura elemento storia
{
    turno: 15,                    // Numero turno
    giocatore: 0,                 // Indice giocatore (0-3)
    azione: AZIONE_SCARTO,        // Tipo azione (enum numerico)
    carta: 45,                    // ID carta (per azioni singola carta)
    carte: [45, 67, 89],          // Array ID carte (per combinazioni/pesca scarti)
    combinazione: 3,              // ID combinazione (per attacco/combinazione)
    tipo: TIPO_SCALA,             // Tipo combinazione (per AZIONE_COMBINAZIONE)
    sostituzione: false,          // true se ha sostituito matta (per AZIONE_ATTACCO)
    squadra: 0                    // Squadra (per AZIONE_POZZETTO)
}
```

### Query sulla storia

```javascript
// Tutti gli scarti del giocatore 2
game.storia.filter(m => m.azione === AZIONE_SCARTO && m.giocatore === 2)

// Tutte le combinazioni depositate
game.storia.filter(m => m.azione === AZIONE_COMBINAZIONE)

// Ultima mossa
game.storia[game.storia.length - 1]
```

---

## 7. Costanti utili

```javascript
const SEMI = ['C', 'Q', 'F', 'P'];  // Cuori, Quadri, Fiori, Picche
const TIPO_TRIS = 1;
const TIPO_SCALA = 2;
const PUNTI_BURRACO_PULITO = 100;
const PUNTI_BURRACO_SPORCO = 50;
const PUNTI_CHIUSURA = 100;

// Azioni storia
const AZIONE_PESCA_MAZZO = 1;
const AZIONE_PESCA_SCARTI = 2;
const AZIONE_SCARTO = 3;
const AZIONE_COMBINAZIONE = 4;
const AZIONE_ATTACCO = 5;
const AZIONE_POZZETTO = 6;
```
