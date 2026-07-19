/*
 * scala40tris.js
 * Refactor strutturale di scala40bis.js: classi Card/CardGroup con API esplicite
 * e stati del turno IA enumerati (TurnState). Nessuna dipendenza da jQuery,
 * stessa identica meccanica di gioco, stesso layout, stessa sequenza di eventi.
 */

function log(msg) {
	if (window.console && log.enabled) {
		console.log(msg);
	}
} // log
log.enabled = true;

var translations = {
	it: {
		undo: "UNDO",
		opponents: "AVVERSARI",
		face_up: "SCOPERTE",
		deck: "mazzo",
		discards: "scarti",
		reset: "AZZERA",
		new_limit: "nuovo limite: ",
		too_high: "valore troppo alto",
		too_low: "valore troppo basso",
		cannot_empty: "non è possibile rimanere senza carte",
		jolly_first: "devi giocare il jolly che hai recuperato prima di scartare",
		scarti_first: "devi giocare la carta pescata dagli scarti prima di scartare. Per annullare la pescata usa ↩ (annulla)",
		attacca_first: "non puoi scartare una carta che attacca a un tris o una scala in tavola",
		game_saved: "partita salvata",
		turn: "TURNO DI: ",
		player: "giocatore",
		opponent: "avversario",
		draw_card: "PESCA UNA CARTA!",
		deposit_cards: "DEPOSITA",
		move_joker: "CLICCA SUL JOLLY PER SPOSTARLO",
		change_joker_suit: "CLICCA SUL JOLLY PER CAMBIARE IL SEME",
		dealer: "MAZZIERE",
		excluded: "FUORI",
		opz_titolo: "Opzioni",
		opz_avversari: "Avversari",
		opz_nota_avversari: "Il numero di avversari vale dalla prossima partita; se cambia, i totali si azzerano.",
		opz_regole: "Regole",
		opz_jollyimmediato: "Il jolly recuperato va giocato subito, nello stesso turno",
		opz_scartoimmediato: "La carta pescata dagli scarti va giocata subito, nello stesso turno",
		opz_nonscartareattaccanti: "Non si può scartare una carta che attacca a un tris o una scala in tavola (a meno che sia l'unica in mano)",
		opz_unacartabasta: "Un tris o una scala può contenere anche una sola carta non jolly (se disattivata, ne servono almeno due, come da regolamento)",
		opz_assosingolo: "L'asso rimasto da solo in mano a fine partita vale 1 punto anziché 11",
		opz_escludiavversari: "Un avversario che ha superato il limite non gioca più le mani successive (punteggio congelato)",
		badge_fisca: "regola FISCA",
		badge_variante: "variante non ufficiale",
		opz_nota_salvate: "Salvate sul dispositivo, valgono da subito.",
		btn_chiudi: "CHIUDI",
		btn_nuovapartita: "NUOVA PARTITA",
		btn_nuovo: "NUOVO / ",
		audio_tuono: "Tuono",
		audio_lacrimosa: "Mozart: Lacrimosa",
		sigla_giocatore: "G",
		sigla_avversario: "A"
	},
	en: {
		undo: "UNDO",
		opponents: "OPPONENTS",
		face_up: "FACE UP",
		deck: "deck",
		discards: "discards",
		reset: "RESET",
		new_limit: "new limit: ",
		too_high: "value too high",
		too_low: "value too low",
		cannot_empty: "you cannot remain without cards",
		jolly_first: "you must play the recovered joker before discarding",
		scarti_first: "you must play the card drawn from the discards before discarding. To undo the draw use ↩ (undo)",
		attacca_first: "you cannot discard a card that attaches to a combination on the table",
		game_saved: "game saved",
		turn: "TURN OF: ",
		player: "player",
		opponent: "opponent",
		draw_card: "DRAW A CARD!",
		deposit_cards: "DEPOSIT",
		move_joker: "CLICK THE JOKER TO MOVE IT",
		change_joker_suit: "CLICK THE JOKER TO CHANGE SUIT",
		dealer: "DEALER",
		excluded: "OUT",
		opz_titolo: "Options",
		opz_avversari: "Opponents",
		opz_nota_avversari: "The number of opponents applies from the next game; changing it resets the totals.",
		opz_regole: "Rules",
		opz_jollyimmediato: "A recovered joker must be played immediately, in the same turn",
		opz_scartoimmediato: "The card drawn from the discard pile must be played immediately, in the same turn",
		opz_nonscartareattaccanti: "You cannot discard a card that attaches to a meld on the table (unless it is the only card in your hand)",
		opz_unacartabasta: "A meld may contain a single non-joker card (if disabled, at least two are required, as per official rules)",
		opz_assosingolo: "An ace left alone in your hand at the end of a game scores 1 point instead of 11",
		opz_escludiavversari: "An opponent who exceeded the limit no longer plays the following hands (score frozen)",
		badge_fisca: "FISCA rule",
		badge_variante: "unofficial variant",
		opz_nota_salvate: "Saved on this device, effective immediately.",
		btn_chiudi: "CLOSE",
		btn_nuovapartita: "NEW GAME",
		btn_nuovo: "NEW / ",
		audio_tuono: "Thunder",
		audio_lacrimosa: "Mozart: Lacrimosa",
		sigla_giocatore: "P",
		sigla_avversario: "O"
	}
};

function t(key) {
	var lang = document.documentElement.lang || 'it';
	if (translations[lang] && translations[lang][key]) {
		return translations[lang][key];
	}
	return translations['it'][key] || key;
}

function getLangImg(name) {
	var lang = document.documentElement.lang || 'it';
	if (lang === 'en') {
		return 'images/scala40/' + name.replace('.png', '-en.png');
	}
	return 'images/scala40/' + name;
}

log(location.search);

function suona(suono) {
	if ((scala.turno != -1) && (scala.dopo)) {
		scala.salvasuono = suono;
	}
	else suono.play();
}

Array.prototype.togli = function (elemento) {
	var indice = this.indexOf(elemento);
	this.splice(indice, 1);
};

/* ==========================================================================
   Mini helper DOM: sostituisce le poche funzionalità jQuery usate dal motore
   (selettori, classi, css, append, show/hide, animate) senza introdurre
   dipendenze esterne.
   ========================================================================== */

var $$ = {
	one: function (selector) {
		return document.querySelector(selector);
	},
	all: function (selector) {
		return document.querySelectorAll(selector);
	},
	addClass: function (el, cls) {
		if (el) el.classList.add(cls);
	},
	removeClass: function (el, cls) {
		if (el) el.classList.remove(cls);
	},
	removeClassAll: function (selector, cls) {
		var els = document.querySelectorAll(selector);
		for (var i = 0; i < els.length; i++) els[i].classList.remove(cls);
	},
	css: function (el, props) {
		if (!el) return;
		for (var k in props) {
			if (!props.hasOwnProperty(k)) continue;
			var val = props[k];
			if (k === 'z-index') { el.style.zIndex = val; continue; }
			if (k === 'background-position') { el.style.backgroundPosition = val; continue; }
			if (k === 'background-position-x') { el.style.backgroundPositionX = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'background-position-y') { el.style.backgroundPositionY = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'background-size') { el.style.backgroundSize = val; continue; }
			if (k === 'border-color') { el.style.borderColor = val; continue; }
			if (k === 'width') { el.style.width = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'height') { el.style.height = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'top') { el.style.top = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'left') { el.style.left = (typeof val === 'number' ? val + 'px' : val); continue; }
			if (k === 'padding') { el.style.padding = val; continue; }
			if (k === 'color') { el.style.color = val; continue; }
			el.style[k] = val;
		}
	},
	getCssInt: function (el, prop) {
		if (!el) return 0;
		return parseInt(getComputedStyle(el)[prop], 10) || 0;
	},
	show: function (el) {
		if (typeof el === 'string') el = $$.one(el);
		if (el) el.style.display = 'block';
	},
	hide: function (el) {
		if (typeof el === 'string') el = $$.one(el);
		if (el) el.style.display = 'none';
	},
	append: function (containerSelectorOrEl, html) {
		var container = (typeof containerSelectorOrEl === 'string') ? $$.one(containerSelectorOrEl) : containerSelectorOrEl;
		if (!container) return;
		container.insertAdjacentHTML('beforeend', html);
	},
	offset: function (el) {
		var rect = el.getBoundingClientRect();
		return { left: rect.left + window.scrollX, top: rect.top + window.scrollY };
	},
	on: function (target, event, handler) {
		var els;
		if (typeof target === 'string') els = document.querySelectorAll(target);
		else els = [target];
		for (var i = 0; i < els.length; i++) els[i].addEventListener(event, handler);
	}
};

/* Animazione leggera equivalente a $.animate({top,left,z-index}, durata)
   e alla variante con step personalizzato usata per i contatori digitali. */
function animateEl(el, props, duration, opts) {
	opts = opts || {};
	if (!el) return;
	if (!duration || duration <= 0) {
		applyImmediate(el, props, opts);
		return;
	}

	/* Ogni moveTo può interrompere un'animazione precedente ancora in corso
	   sullo stesso elemento (es. un riordino del giocatore durante il replay
	   IA): senza invalidare il tween vecchio, i due step() concorrenti si
	   contendono style.left/top e la carta "torna indietro" a scatti verso
	   il bersaglio ormai superato. Un token per elemento fa sì che solo
	   l'ultimo tween avviato continui a scrivere sullo stile. */
	var mioToken = (el._animToken || 0) + 1;
	el._animToken = mioToken;

	var startTime = null;
	var start = {};
	var startCustom = null;

	if (opts.step) {
		// animazione a valore singolo custom (usata per i digit dei contatori)
		var key = Object.keys(props)[0];
		startCustom = opts.customStart != null ? opts.customStart : 0;
		var endCustom = parseFloat(props[key]);

		function stepCustom(ts) {
			if (el._animToken !== mioToken) return;
			if (startTime === null) startTime = ts;
			var progress = Math.min(1, (ts - startTime) / duration);
			var now = startCustom + (endCustom - startCustom) * progress;
			opts.step(now, { pos: progress });
			if (progress < 1) requestAnimationFrame(stepCustom);
		}
		requestAnimationFrame(stepCustom);
		return;
	}

	if ('top' in props) start.top = parseFloat(el.style.top) || 0;
	if ('left' in props) start.left = parseFloat(el.style.left) || 0;

	function step(ts) {
		if (el._animToken !== mioToken) return;
		if (startTime === null) startTime = ts;
		var progress = Math.min(1, (ts - startTime) / duration);
		if ('top' in props) el.style.top = (start.top + (parseFloat(props.top) - start.top) * progress) + 'px';
		if ('left' in props) el.style.left = (start.left + (parseFloat(props.left) - start.left) * progress) + 'px';
		if (progress < 1) {
			requestAnimationFrame(step);
		} else {
			if ('z-index' in props) el.style.zIndex = props['z-index'];
		}
	}
	if ('z-index' in props) el.style.zIndex = props['z-index'];
	requestAnimationFrame(step);
}

/* Animazione di lampeggio per il banner "pesca una carta". */
(function () {
	var st = document.createElement('style');
	st.textContent = '@keyframes pulsapesca { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }';
	document.head.appendChild(st);
})();

function applyImmediate(el, props, opts) {
	if (opts && opts.step) {
		var key = Object.keys(props)[0];
		opts.step(parseFloat(props[key]), { pos: 1 });
		return;
	}
	/* Invalida un eventuale tween animato ancora in corso su questo
	   elemento, altrimenti il suo step() continuerebbe a sovrascrivere
	   la posizione impostata qui. */
	el._animToken = (el._animToken || 0) + 1;
	if ('top' in props) el.style.top = props.top + 'px';
	if ('left' in props) el.style.left = props.left + 'px';
	if ('z-index' in props) el.style.zIndex = props['z-index'];
}

var CUORI = "C", QUADRI = "Q", FIORI = "F", PICCHE = "P", JOLLY = "J";
var valoreseme = { "F": 0, "Q": 1, "C": 2, "P": 3, "J": 4 };
var semevalore = ["F", "Q", "C", "P", "J"];
var RETROROSSO = 0, RETROBLU = 1;
/* Dimensione unica delle carte per tutte le modalità (il vecchio formato
   "grande" 71x96 ingrandito di un ulteriore 10%). Lo sprite in showcard si
   scala proporzionalmente a queste costanti. */
var CARTAW = 94, CARTAH = 127;
var TRIS = 1, SCALA = 2;
/* Margine di cattura orizzontale attorno all'impronta reale delle carte di un
   gruppo: entro questa distanza un drag "vede" il gruppo (cercamatch). */
var MARGINECATTURA = 40;

/* Stati della macchina a stati del turno IA (alavorastato). Sostituiscono
   le stringhe magiche "nextavv"/"playrender"/"fineturno"/"abortito". */
var TurnState = {
	INIZIO: 0,
	NEXTAVV: "nextavv",
	PLAYRENDER: "playrender",
	FINETURNO: "fineturno",
	ABORTITO: "abortito"
};
var ESEGUI = true;
var NOESEGUI = false;
var PUNTI = true;
var NOPUNTI = false;

var PUNTITRIS = 100;
var PUNTIATTACCABILI = 50;
var PUNTICOPPIA = 40;
var PUNTIMEZZACOPPIA = 20;
var PUNTICARTEUGUALI = 30;
var PUNTIJOLLY = 200;
var JOLLYRECUPERABILE = 150;

/* ==========================================================================
   Frammenti DOM specifici della versione nuova: il motore li crea da solo,
   con le etichette da t() (quindi già bilingui in base al lang della pagina),
   così può girare sia sulla pagina dedicata sia su un guscio che contiene
   solo il markup condiviso (integrazione in scala40.html con caricamento
   condizionale classica/nuova). Ogni blocco è iniettato solo se manca; gli
   elementi solo-classici (#nuovo, #formnuovo) vengono nascosti se presenti.
   Va eseguita PRIMA delle catture degli elementi audio qui sotto (crea
   #lacrimosa) e degli event binding in collegaeventi.
   ========================================================================== */
function creaframmentitris() {
	var campo = $$.one("#campogioco");
	if (!campo) return;

	if (!$$.one("#formopzioni")) {
		var fisca = ' <em class="opzioni-badge opzioni-badge-fisca">' + t('badge_fisca') + '</em>';
		var variante = ' <em class="opzioni-badge opzioni-badge-variante">' + t('badge_variante') + '</em>';
		var check = function (id, chiave, badge, checked) {
			return '<label class="opzioni-check">' +
				'<input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '>' +
				'<span>' + t(chiave) + badge + '</span></label>';
		};
		$$.append(campo,
			'<div id="formopzioni" class="formistruzioni">' +
			'<h2 class="opzioni-titolo">' + t('opz_titolo') + '</h2>' +
			'<div class="opzioni-sezione">' +
			'<div class="opzioni-etichetta">' + t('opz_avversari') + '</div>' +
			'<div class="opzioni-radio">' +
			'<label><input type="radio" name="avversari" value="1"><span>1</span></label>' +
			'<label><input type="radio" name="avversari" value="2"><span>2</span></label>' +
			'<label><input type="radio" name="avversari" value="3" checked><span>3</span></label>' +
			'</div>' +
			'<div class="opzioni-nota">' + t('opz_nota_avversari') + '</div>' +
			'</div>' +
			'<div class="opzioni-sezione">' +
			'<div class="opzioni-etichetta">' + t('opz_regole') + '</div>' +
			check('optjollyimmediato', 'opz_jollyimmediato', fisca, false) +
			check('optscartoimmediato', 'opz_scartoimmediato', fisca, false) +
			check('optnonscartareattaccanti', 'opz_nonscartareattaccanti', fisca, false) +
			check('optunacartabasta', 'opz_unacartabasta', variante, true) +
			check('optassosingolo', 'opz_assosingolo', variante, false) +
			check('optescludiavversariesuperano', 'opz_escludiavversari', fisca, false) +
			'<div class="opzioni-nota">' + t('opz_nota_salvate') + '</div>' +
			'</div>' +
			'<div class="opzioni-bottoni">' +
			'<button class="bottone2" type="button">' + t('btn_chiudi') + '</button>' +
			'<button class="bottone1" type="button">' + t('btn_nuovapartita') + '</button>' +
			'</div>' +
			'</div>');
	}

	if (!$$.one("#opzioni")) {
		$$.append($$.one("#nonpertest") || campo,
			'<div id="opzioni" class="pulsante2" style="top: 53px; left: 10px; z-index:1000">' + t('btn_nuovo') +
			'<svg class="icona-opzioni" viewBox="0 0 24 24" width="19" height="19" fill="white" aria-hidden="true"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>' +
			'</div>');
	}

	/* Elementi solo-classici del guscio condiviso: in modalità nuova non
	   devono restare visibili (il loro posto è preso da #opzioni e
	   #formopzioni). Sulla pagina tris dedicata non esistono: no-op. */
	$$.hide("#nuovo");
	$$.hide("#formnuovo");

	if (!document.getElementById("lacrimosa")) {
		/* ~1.3MB contro i ~15KB di thunder.mp3: su rete reale (non
		   localhost) può non essere ancora bufferizzato quando il torneo
		   finisce e si chiama play() nell'istante stesso della sconfitta.
		   preload="auto" + load() esplicito avviano il download subito,
		   appena l'elemento esiste, invece di aspettare il primo play(). */
		$$.append(document.body, '<audio id="lacrimosa" src="sounds/scala40/lacrimosa.mp3" preload="auto"></audio>');
		document.getElementById("lacrimosa").load();
	}

	var modaletorneo = $$.one("#haipersotorneo");
	if (modaletorneo && !document.getElementById("audiotorneolacrimosa")) {
		modaletorneo.insertAdjacentHTML('afterbegin',
			'<div class="audiotorneo-select" style="position:absolute; top:6px; left:6px; z-index:100; font-family: sans-serif; font-size:10px; color:#fff; background:rgba(0,0,0,0.5); border-radius:6px; padding:4px 6px; line-height:1.5;">' +
			'<label style="display:block; cursor:pointer;"><input type="radio" name="audiotorneo" id="audiotorneothunder" value="thunder"> ' + t('audio_tuono') + '</label>' +
			'<label style="display:block; cursor:pointer;"><input type="radio" name="audiotorneo" id="audiotorneolacrimosa" value="lacrimosa" checked> ' + t('audio_lacrimosa') + '</label>' +
			'</div>');
	}
}
creaframmentitris();

var scarta = document.getElementById("scarta");
var scartatris = document.getElementById("scartatris");
var ordina = document.getElementById("ordina");
var pesca = document.getElementById("pesca");
var perjolly = document.getElementById("perjolly");
var tada = document.getElementById("tada");
var haiperso = document.getElementById("perso");
var dascarti = document.getElementById("dascarti");
var slitta = document.getElementById("slitta");
var ding = document.getElementById("ding");
var thunder = document.getElementById("thunder");
var lacrimosa = document.getElementById("lacrimosa");
if (localStorage.getItem('scala40tris_audiotorneo') === 'thunder') {
	var radiothunder = document.getElementById('audiotorneothunder');
	if (radiothunder) radiothunder.checked = true;
}
var applause = document.getElementById("applause");
var distribuisci = document.getElementById("distribuisci");

/* ==========================================================================
   Card: stessa struttura dati dell'originale (notazione invariata per non
   alterare la logica di gioco) più il metodo moveTo, che aggiorna la
   posizione logica della carta e muove/anima il suo div sul campo.
   ========================================================================== */

function Card(suit, rank, back, indice) {
	this.init(suit, rank, back, indice);
}

Card.prototype = {
	init: function (suit, rank, back, indice) {
		this.shortName = suit + rank;
		this.seme = suit;
		this.numero = rank;
		this.retro = back;
		this.faceUp = false;
		this.id = indice;
		this.selected = false;
		this.ntris = 0;
		this.tipotris = 0;
		this.tipojolly = "J";
		this.numerojolly = 0;
		this.intris = 0;
		this.puntitris = 0;
		this.puntiattacca = 0;
		this.puntijollyrecuperabile = 0;
		this.punticoppia = 0;
		this.punteggio = 0;
	},

	moveTo: function (top, left, zindex, velocita) {
		this.top = top;
		this.left = left;
		this.zindex = zindex;

		var divCard = this.gui;
		var currentLeft = parseInt(divCard.style.left) || 0;
		var currentTop = parseInt(divCard.style.top) || 0;
		var currentZ = parseInt(divCard.style.zIndex) || 0;

		if (Math.abs(currentLeft - left) < 1 && Math.abs(currentTop - top) < 1 && currentZ === zindex) return;

		if (scala.immediato) {
			applyImmediate(divCard, { "top": top, "left": left, "z-index": zindex });
		}
		else {
			animateEl(divCard, { "top": top, "left": left, "z-index": zindex }, velocita);
		}
	}
};

/* ==========================================================================
   CardGroup: contenitore di carte (mano, area tris, mazzo, scarti) che
   incapsula insieme l'array carte[] e i dati di layout del gruppo, con
   un'API esplicita per aggiungere/togliere/spostare carte. Sostituisce i
   plain object { carte: [], top, left, offsetx, ... } della versione bis.
   ========================================================================== */

function CardGroup(selector, layout) {
	var el = $$.one(selector);
	this.carte = [];
	this.top = $$.getCssInt(el, "top");
	this.left = $$.getCssInt(el, "left");
	this.offsetx = layout.offsetx;
	this.offsety = layout.offsety;
	this.deltax = layout.deltax;
	this.deltay = layout.deltay;
	this.xtris = layout.xtris;
	this.larghezza = layout.larghezza || 0;
	/* ancoradx: le carte si allineano al margine destro del contenitore e
	   crescono verso sinistra (usato per i tris, che possono invadere lo
	   spazio della mano man mano che questa si svuota). margindx riserva
	   spazio a destra dell'ancora (es. la colonna del contatore verticale). */
	this.ancoradx = layout.ancoradx || false;
	this.destra = this.left + $$.getCssInt(el, "width") - (layout.margindx || 10);
}

CardGroup.prototype = {

	/* Aggiunge una carta (in coda o alla posizione indicata) e ne aggiorna il gruppo. */
	add: function (carta, indice) {
		if (typeof indice === "undefined") this.carte.push(carta);
		else this.carte.splice(indice, 0, carta);
		carta.gruppo = this;
	},

	/* Toglie una carta dal gruppo (carta.gruppo viene riassegnato dalla destinazione). */
	remove: function (carta) {
		var posizione = this.carte.indexOf(carta);
		if (posizione >= 0) this.carte.splice(posizione, 1);
	},

	/* Estrae l'ultima carta del gruppo. */
	pop: function () {
		return this.carte.pop();
	},

	/* Sostituisce la carta alla posizione indicata (scambio jolly). */
	replaceAt: function (posizione, carta) {
		this.carte[posizione] = carta;
		carta.gruppo = this;
	},

	/* Sposta una carta da questo gruppo a destinazione (in coda o alla posizione indicata). */
	moveCardTo: function (carta, destinazione, indice) {
		this.remove(carta);
		destinazione.add(carta, indice);
	},

	/* Posizione (top/left) della carta i-esima secondo il layout del gruppo.
	   Se larghezza è impostata e il contenuto nominale eccede lo spazio,
	   comprime proporzionalmente la spaziatura carte e la distanza tra i tris.
	   Con ancoradx il PRIMO tris resta fisso al margine destro e ogni nuovo
	   tris si accumula alla sua sinistra (i tris esistenti non si muovono,
	   salvo compressione). */
	posizione: function (indice, carta) {
		var deltax = this.deltax;
		var xtris = this.xtris;
		var n = this.carte.length;
		var top = this.top + this.offsety + Math.floor(indice * this.deltay);

		if (!this.ancoradx) {
			if ((this.larghezza > 0) && (n > 1)) {
				var maxntris = 0;
				for (var k = 0; k < n; k++) { if (this.carte[k].ntris > maxntris) maxntris = this.carte[k].ntris; }
				var estensione = (n - 1) * deltax + xtris * maxntris;
				var disponibile = this.larghezza - this.offsetx - CARTAW;
				if ((estensione > disponibile) && (estensione > 0)) {
					var fattore = disponibile / estensione;
					deltax *= fattore;
					xtris *= fattore;
				}
			}
			return {
				top: top,
				left: this.left + this.offsetx + Math.floor(indice * deltax) + Math.floor(xtris * (carta ? carta.ntris : 0))
			};
		}

		/* Gruppo ancorato a destra: raggruppa le carte in blocchi contigui
		   per ntris (un blocco = un tris, nell'ordine di deposito). */
		var blocchi = [];
		var corrente = null;
		for (var k = 0; k < n; k++) {
			if ((corrente === null) || (this.carte[k].ntris !== corrente.ntris)) {
				corrente = { ntris: this.carte[k].ntris, inizio: k, len: 0 };
				blocchi.push(corrente);
			}
			corrente.len++;
		}

		var passi = 0;
		for (var m = 0; m < blocchi.length; m++) passi += (blocchi[m].len - 1);
		var estensione = passi * deltax + (blocchi.length - 1) * (deltax + xtris);
		var disponibile = this.larghezza - CARTAW;
		/* Se il gruppo mano associato (stessa fascia) si estende troppo verso
		   destra, riduce ulteriormente lo spazio disponibile per i tris, così
		   il passo orizzontale si comprime prima che le due zone si tocchino. */
		if (this.manogruppo && (this.manogruppo.carte.length > 0)) {
			var finemano = this.manogruppo.posizione(this.manogruppo.carte.length - 1).left + CARTAW;
			var margine = finemano + 10 - (this.destra - this.larghezza);
			if (margine > 0) disponibile -= margine;
		}
		if ((estensione > disponibile) && (estensione > 0)) {
			var fattore = Math.max(0, disponibile / estensione);
			deltax *= fattore;
			xtris *= fattore;
		}

		/* Scorre i blocchi: il primo al margine destro, i successivi a sinistra. */
		var ultima = this.destra - CARTAW;
		for (var m = 0; m < blocchi.length; m++) {
			var prima = ultima - (blocchi[m].len - 1) * deltax;
			if ((indice >= blocchi[m].inizio) && (indice < blocchi[m].inizio + blocchi[m].len)) {
				return {
					top: top,
					left: Math.floor(prima + (indice - blocchi[m].inizio) * deltax)
				};
			}
			ultima = prima - (deltax + xtris);
		}
		return { top: top, left: this.destra - CARTAW };
	}
};

/* ==========================================================================
   Snapshot: fotografia minimale ed esplicita dello stato di gioco, usata
   dall'undo e dal replay animato del turno IA (playrender). Sostituisce il
   deep-copy integrale di ogni carta: salva solo ciò che una mossa può
   davvero cambiare (appartenenza/ordine nei gruppi, faceUp, dati di
   combinazione e jolly, flag di partita). Posizioni e punteggi IA non
   vengono salvati: li ricalcolano render() e il motore IA a ogni turno.
   ========================================================================== */

function Snapshot(commento) {
	this.commento = commento;
	this.salvasuono = scala.salvasuono;
	this.pescato = scala.pescato;
	this.f40giocatore = scala.f40giocatore;
	this.f40avversario = scala.f40avversario.slice();
	/* Regole jolly/scarto immediato: i vincoli seguono l'undo (giocare la
	   carta vincolata e poi annullare la mossa li ripristina). */
	this.jollydarigiocare = scala.jollydarigiocare;
	this.cartascartidagiocare = scala.cartascartidagiocare;

	this.gruppi = {};
	for (var j = 0; j < Snapshot.NOMIGRUPPI.length; j++) {
		var nome = Snapshot.NOMIGRUPPI[j];
		this.gruppi[nome] = scala[nome].carte.slice();
	}

	this.carte = [];
	for (var i = 0; i < scala.stock.length; i++) {
		var c = scala.stock[i];
		this.carte[i] = {
			faceUp: c.faceUp,
			ntris: c.ntris,
			tipotris: c.tipotris,
			tipojolly: c.tipojolly,
			numerojolly: c.numerojolly
		};
	}
}

Snapshot.NOMIGRUPPI = ["mazzo", "scarti", "giocatore", "trisgiocatore",
	"avversario1", "trisavversario1", "avversario2", "trisavversario2",
	"avversario3", "trisavversario3"];

Snapshot.prototype.restore = function () {

	for (var i = 0; i < scala.stock.length; i++) {
		var c = scala.stock[i];
		var salvata = this.carte[i];
		c.faceUp = salvata.faceUp;
		c.ntris = salvata.ntris;
		c.tipotris = salvata.tipotris;
		c.tipojolly = salvata.tipojolly;
		c.numerojolly = salvata.numerojolly;
		c.selected = false;
	}

	for (var j = 0; j < Snapshot.NOMIGRUPPI.length; j++) {
		var nome = Snapshot.NOMIGRUPPI[j];
		var gruppo = scala[nome];
		var salvate = this.gruppi[nome];

		/* Durante il replay del turno IA il giocatore può riordinare la
		   mano: il contenuto della mano non cambia negli stati del turno,
		   quindi si ripristina il contenuto salvato preservando l'ordine
		   corrente (eventuali carte solo nello snapshot vanno in coda).
		   Si lavora su una copia: lo snapshot resta intatto. */
		if ((nome === "giocatore") && (scala.astato === TurnState.PLAYRENDER)) {
			var ordinate = [];
			for (var k = 0; k < gruppo.carte.length; k++) {
				if (salvate.indexOf(gruppo.carte[k]) !== -1) ordinate.push(gruppo.carte[k]);
			}
			for (var k = 0; k < salvate.length; k++) {
				if (ordinate.indexOf(salvate[k]) === -1) ordinate.push(salvate[k]);
			}
			salvate = ordinate;
		}

		gruppo.carte.splice(0, gruppo.carte.length);
		for (var k = 0; k < salvate.length; k++) {
			gruppo.carte.push(salvate[k]);
			salvate[k].gruppo = gruppo;
		}
	}

	scala.pescato = this.pescato;
	scala.f40giocatore = this.f40giocatore;
	scala.f40avversario.splice(0, scala.f40avversario.length);
	for (var m = 0; m < this.f40avversario.length; m++) scala.f40avversario[m] = this.f40avversario[m];
	scala.commento = this.commento;
	scala.salvasuono = this.salvasuono;

	scala.carteselezionate.splice(0, scala.carteselezionate.length);
	$$.removeClassAll(".card", "cardselected");

	/* I vincoli (jolly recuperato, carta dagli scarti) tornano com'erano al
	   momento dello stato: render() poi riapplica l'evidenziazione se la
	   carta vincolata è in mano. */
	scala.jollydarigiocare = this.jollydarigiocare || null;
	scala.cartascartidagiocare = this.cartascartidagiocare || null;
	$$.removeClassAll(".card", "jollypending");
};

//carte: 1-13   = 1 - RE,  50=jolly rosso, 51=jolly nero

var scala = {

	statostack: [],
	trispossibili: [],
	jollyincampo: [],
	jollyrecuperabili: [],
	carteattaccabili: [],
	coppie: [],
	coppiecontris: [],
	jollymodificabili: [],
	jollyestremiswappabili: [],

	start: function () {
		this.inizializzazioni();
		var campo = $$.one('#campogioco');
		if (campo && $$.offset(campo).left < 250) $$.hide('#messaggio');
		if (campo && $$.offset(campo).left < 300) $$.css($$.one('#messaggio'), { "padding": "0px", "left": "0px", "width": "220px", "height": "72%" });
		this.creamazzi();
		this.shuffle();
		this.shuffle();
		this.createDeckElements();
		this.givecards();
		return;
	},

	inizializzazioni: function () {

		scala.dopo = true;
		scala.immediato = false;
		scala.avvsalvalog = 0;
		scala.salvasuono = 0;

		var _na = parseInt(localStorage.getItem('scala40tris_numeroavversari') || '3', 10);
		var _tl = parseInt(localStorage.getItem('scala40tris_totalelimite') || '150', 10);
		this.numeroavversari = (_na > 0 && _na < 4) ? _na : 3;
		this.totalelimite = (!isNaN(_tl) && _tl > 0) ? _tl : 150;

		/* Opzioni di gioco (pannello OPZIONI, persistite sul dispositivo).
		   jollyimmediato: obbligo di giocare il jolly recuperato nello stesso
		   turno. jollydarigiocare: il jolly appena recuperato dal giocatore,
		   evidenziato finché resta in mano; blocca lo scarto se la regola è
		   attiva. */
		this.jollyimmediato = (localStorage.getItem('scala40tris_jollyimmediato') === '1');
		this.jollydarigiocare = null;
		/* scartoimmediato: obbligo di giocare nello stesso turno la carta
		   pescata dagli scarti (stessa meccanica del jolly recuperato).
		   L'IA non è coinvolta: pesca dagli scarti solo se usa la carta. */
		this.scartoimmediato = (localStorage.getItem('scala40tris_scartoimmediato') === '1');
		this.cartascartidagiocare = null;
		/* nonscartareattaccanti: vietato scartare una carta che attacca a un
		   tris/scala in tavola, a meno che sia l'unica rimasta in mano. */
		this.nonscartareattaccanti = (localStorage.getItem('scala40tris_nonscartareattaccanti') === '1');
		/* unacartabasta: se true (default, comportamento storico) un tris o
		   una scala può contenere anche una sola carta reale (il resto
		   jolly); se false richiede almeno 2 carte reali nel blocco.
		   Sostituisce il vecchio "duejolly", che valeva solo per i tris di 3
		   carte e non era mai stato esteso alle scale. */
		this.unacartabasta = (localStorage.getItem('scala40tris_unacartabasta') !== '0');
		/* assosingolo: variante non ufficiale (non FISCA) per cui l'asso,
		   se rimasto da solo in mano a fine smazzata, vale 1 punto anziché
		   11. Default off: la regola federale (sempre 11) resta invariata. */
		this.assosingolo = (localStorage.getItem('scala40tris_assosingolo') === '1');

		/* escludiavversariesuperano: variante non ufficiale, default off. Un
		   avversario che ha già raggiunto/superato il limite non riceve più
		   carte e salta il turno nelle mani successive: il suo punteggio
		   resta congelato mentre gli altri continuano. Non si applica mai al
		   giocatore umano, che ha già la propria gestione di fine torneo. */
		this.escludiavversariesuperano = (localStorage.getItem('scala40tris_escludiavversariesuperano') === '1');

		this.totalepartite = 0;
		this.totaleavversario1 = 0;
		this.totaleavversario2 = 0;
		this.totaleavversario3 = 0;
		this.totalegiocatore = 0;

		var _stato = null;
		try { _stato = JSON.parse(localStorage.getItem('scala40tris_stato') || 'null'); } catch (e) { }
		localStorage.removeItem('scala40tris_stato');
		if (_stato) {
			if (!isNaN(_stato.ta)) this.totaleavversario1 = _stato.ta;
			if (!isNaN(_stato.tb)) this.totaleavversario2 = _stato.tb;
			if (!isNaN(_stato.tc)) this.totaleavversario3 = _stato.tc;
			if (!isNaN(_stato.tg)) this.totalegiocatore = _stato.tg;
			if (!isNaN(_stato.tl)) this.totalelimite = _stato.tl;
			if (!isNaN(_stato.tp)) this.totalepartite = _stato.tp;
			if (_stato.na > 0 && _stato.na < 4) this.numeroavversari = _stato.na;
		}

		this.fscalauptouch = false;
		this.fmodale = false;
		this.turno = -1;

		this.cartescoperte = false;
		this.fscartiprima40 = true;

		this.carteselezionate = [];
		this.f40avversario = [false, false, false];
		this.f40giocatore = false;
		this.fscartipesca = false;
		this.modale = false;

		/* Mazziere: -1 = giocatore, 0..N-1 = avversario. Casuale alla
		   primissima partita, poi ruota a ogni mano conclusa (la rotazione
		   viene scritta in localStorage da calcolatotali). Il primo a giocare
		   è il successivo al mazziere. */
		var _mz = localStorage.getItem('scala40tris_mazziere');
		this.mazziere = (_mz === null) ? (Math.floor(Math.random() * (this.numeroavversari + 1)) - 1) : parseInt(_mz, 10);
		if (isNaN(this.mazziere) || this.mazziere < -1 || this.mazziere >= this.numeroavversari) this.mazziere = -1;
		localStorage.setItem('scala40tris_mazziere', this.mazziere);

		/* Layout fisso: 4 fasce da 150px (una per giocatore), mano a sinistra
		   e tris a destra nella stessa fascia. Con meno di 3 avversari le
		   fasce centrali restano semplicemente vuote, senza riscalare nulla. */
		this.altezzacampo = 150;

		for (var i = 1; i <= this.numeroavversari; i++) {
			this.creacampo("avversario" + i, i - 1, "trisavversario" + i);
		}
		this.creacampo("giocatore", 3, "trisgiocatore");

		/* Mostra l'etichetta MAZZIERE sopra il contatore del giocatore giusto. */
		var campomazziere = (this.mazziere == -1) ? "trisgiocatore" : ("trisavversario" + (this.mazziere + 1));
		$$.show("#mazziere" + campomazziere);

		/* Banner lampeggiante sotto le carte del giocatore: invita a pescare
		   all'inizio del turno. Visibilità gestita da render(). */
		this.distribuendo = false;
		this.iaimminente = false;
		$$.append("#campogioco", '<div id="bannerpesca" style="position:absolute; display:none;' +
			' top: ' + (100 + this.altezzacampo * 3 + 126) + 'px; left: 110px; width: 240px; height: 22px;' +
			' background-color: rgba(0,0,0,0.6); border: 1px solid #ffd700; border-radius: 11px;' +
			' color: #ffd700; font-family: sans-serif; font-weight: bold; font-size: 14px;' +
			' line-height: 22px; text-align: center; z-index: 600;' +
			' animation: pulsapesca 1.2s infinite;">' + t('draw_card') + '</div>');

		/* Banner lampeggiante "deposita": compare quando la selezione
		   corrente in mano è già una combinazione valida, invita a
		   cliccarci sopra per calarla (stessa area di bannerpesca, i due
		   non sono mai visibili insieme: uno prima di pescare, l'altro
		   dopo con una selezione valida). Visibilità gestita da render(). */
		$$.append("#campogioco", '<div id="bannerdeposita" style="position:absolute; display:none; cursor:pointer;' +
			' top: ' + (100 + this.altezzacampo * 3 + 126) + 'px; left: 110px; width: 240px; height: 22px;' +
			' background-color: rgba(0,0,0,0.6); border: 1px solid #ffd700; border-radius: 11px;' +
			' color: #ffd700; font-family: sans-serif; font-weight: bold; font-size: 14px;' +
			' line-height: 22px; text-align: center; z-index: 600;' +
			' animation: pulsapesca 1.2s infinite;">' + t('deposit_cards') + '</div>');

		/* Banner "clicca sul jolly per spostarlo": compare quando un jolly
		   di scala è stato depositato a un'estremità ambigua e resta
		   scambiabile con l'altra (jollyestremiswappabili). Non blocca
		   nulla, sparisce da solo alla mossa successiva. Posizione (top/left)
		   ricalcolata dinamicamente in aggiornabannermovejolly, centrata
		   sotto il blocco tris interessato: qui solo i valori iniziali. */
		$$.append("#campogioco", '<div id="bannermovejolly" style="position:absolute; display:none;' +
			' top: 0px; left: 0px; width: 240px; height: 20px;' +
			' background-color: rgba(0,0,0,0.6); border: 1px solid #00e5ff; border-radius: 10px;' +
			' color: #00e5ff; font-family: sans-serif; font-weight: bold; font-size: 11px;' +
			' line-height: 20px; text-align: center; z-index: 600;">' + t('move_joker') + '</div>');

		/* Banner "clicca sul jolly per cambiare il seme": stessa meccanica
		   di bannermovejolly ma per il jolly di un TRIS (non scala) il cui
		   seme è ambiguo tra quelli non ancora usati (jollymodificabili).
		   Posizione ricalcolata in aggiornabannermovejolly. */
		$$.append("#campogioco", '<div id="bannerchangesuit" style="position:absolute; display:none;' +
			' top: 0px; left: 0px; width: 240px; height: 20px;' +
			' background-color: rgba(0,0,0,0.6); border: 1px solid #00e5ff; border-radius: 10px;' +
			' color: #00e5ff; font-family: sans-serif; font-weight: bold; font-size: 11px;' +
			' line-height: 20px; text-align: center; z-index: 600;">' + t('change_joker_suit') + '</div>');

		var campo = $$.one("#campogioco");
		this.offsetxx = this.offsetxx || $$.offset(campo).left;
		this.offsetyy = this.offsetyy || $$.offset(campo).top;

		var yg = 115, ya1 = 50, ya2 = 110, ya3 = 110, ylim = 182, wbig = 90, hbig = 40, xbig = 40;
		if (this.numeroavversari == 2) { yg = 130, ya1 = 40, ya2 = 76, ya3 = 110, ylim = 182, wbig = 83, hbig = 35, xbig = 45; }
		if (this.numeroavversari == 3) {
			yg = 145, ya1 = 30, ya2 = 66, ya3 = 102, ylim = 192, wbig = 83, hbig = 35, xbig = 45;

			$$.append("#totalizzatore", '<div style="position:absolute; top: ' + (ya3 + 3) + 'px; left: 2px;">' +
				'<img src="' + getLangImg('totalea3.png') + '" height="35" width="35">');

			this.creacontatore("totaleavversario3", wbig, hbig, "totalizzatore", xbig, ya3);
		}

		if (this.numeroavversari > 1) {
			$$.append("#totalizzatore", '<div style="position:absolute; top: ' + (ya2 + 3) + 'px; left: 2px;">' +
				'<img src="' + getLangImg('totalea2.png') + '" height="35" width="35">');

			this.creacontatore("totaleavversario2", wbig, hbig, "totalizzatore", xbig, ya2);
		}

		$$.append("#totalizzatore", '<div style="position:absolute; top: ' + (ya1 + 3) + 'px; left: 2px;">' +
			'<img src="' + getLangImg('totalea1.png') + '" height="35" width="35">');

		$$.append("#totalizzatore", '<div style="position:absolute; top: ' + yg + 'px; left: -2px;">' +
			'<img src="' + getLangImg('totaleg.png') + '" height="40" width="40">');

		$$.append("#totalizzatore", '<div style="position:absolute; top: ' + (ylim - 5) + 'px; left: -2px;">' +
			'<img src="' + getLangImg('totalelim.png') + '" height="40" width="78">');

		$$.append("#totalizzatore", '<div style="position:absolute; top: 215px; left: -4px;">' +
			'<img src="' + getLangImg('totalepartite.png') + '" height="40" width="80">');

		this.creacontatore("totaleavversario1", wbig, hbig, "totalizzatore", xbig, ya1);
		this.creacontatore("totalegiocatore", wbig, hbig, "totalizzatore", xbig, yg);
		this.creacontatore("totalelimite", 60, 25, "totalizzatore", 67, ylim);
		this.creacontatore("totalepartite", 60, 25, "totalizzatore", 67, 225);
	},

	creacontatore: function (nome, larghezza, altezza, contenitore, posx, posy) {

		var wdigit = Math.floor(larghezza * 0.9 / 3), hdigit = Math.floor(altezza * 9 / 10);
		var offsetx = Math.round(1 + larghezza / 50);
		var offsety = Math.round(1 + altezza / 50);

		$$.append("#" + contenitore, '<div id="' + nome + '" style="top: ' + posy + 'px; left: ' + posx + 'px; z-index:500;" class="contatore">' +
			'<img src="images/scala40/vassoiod.png" height="' + altezza + 'px" width="' + larghezza + 'px">'

			+ '<div id="digit3" class="digitx" style="top: ' + offsety + 'px; left: ' + offsetx + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div>'
			+ '<div id="digit2" class="digitx" style="top: ' + offsety + 'px; left: ' + Math.floor(offsetx + larghezza / 3.2) + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div>'
			+ '<div id="digit1" class="digitx" style="top: ' + offsety + 'px; left: ' + Math.floor(offsetx + larghezza / 3.2 * 2) + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div> </div>'
		);
	},

	/* Contatore a 3 cifre impilate in verticale. Sfondo provvisorio
	   (rettangolo scuro con bordo dorato) in attesa della grafica definitiva.
	   Le cifre hanno id vdigit3/2/1 e sono aggiornate da displaypunti insieme
	   a quelle del contatore orizzontale. Se etichetta è indicata, in testa
	   viene aggiunta una cella (delle stesse dimensioni di una cifra) con la
	   sigla del giocatore (A1/A2/A3/G). */
	creacontatoreverticale: function (nome, contenitore, posx, posy, etichetta) {
		var wdigit = 22, hdigit = 26, gap = 3, pad = 4;
		var celle = etichetta ? 4 : 3;
		var larghezza = wdigit + pad * 2;
		var altezza = hdigit * celle + gap * (celle - 1) + pad * 2;

		var topcella = function (cella) { return pad + (hdigit + gap) * cella; };

		var stiledigit = function (cella, cifra) {
			return '<div id="vdigit' + cifra + '" class="digitx" style="top: ' + topcella(cella) + 'px; left: ' + pad + 'px;' +
				' width:' + wdigit + 'px; height:' + hdigit + 'px;' +
				' background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px;"> </div>';
		};

		var html = '<div id="' + nome + '" style="top: ' + posy + 'px; left: ' + posx + 'px;' +
			' width:' + larghezza + 'px; height:' + altezza + 'px; z-index:500;' +
			' background-image: url(images/wood2.png);' +
			' border: 1px solid #b8860b; border-radius: 6px;" class="contatore">';

		var prima = 0;
		if (etichetta) {
			/* La sigla a un solo carattere (G) viene allargata per riempire la
			   cella come le sigle a due caratteri (A1/A2/A3). */
			var stiletichetta = (etichetta.length == 1) ?
				' font-size: 21px; transform: scaleX(1.35);' : ' font-size: 17px;';
			html += '<div style="position:absolute; top: ' + topcella(0) + 'px; left: ' + pad + 'px;' +
				' width:' + wdigit + 'px; height:' + hdigit + 'px; line-height:' + hdigit + 'px;' +
				' color:#ffd700; font-family: sans-serif; font-weight: bold; text-align:center;' +
				stiletichetta + '">' +
				etichetta + '</div>';
			prima = 1;
		}
		html += stiledigit(prima, 3) + stiledigit(prima + 1, 2) + stiledigit(prima + 2, 1) + '</div>';

		$$.append("#" + contenitore, html);
	},

	/* Crea il contenitore visivo di un gruppo nella fascia indicata:
	   parnomecampo=true -> mano (metà sinistra),
	   altrimenti tris (metà destra della stessa fascia). */

	creacampo: function (nome, banda, nometris) {

		/* Un solo contenitore per fascia: la mano occupa la parte sinistra, i
		   tris sono ancorati al margine destro e crescono verso sinistra nello
		   spazio condiviso. Niente confine interno: il "chi vince" tra riordino
		   e attacco lo decide la posizione reale delle carte (cercamatch), non
		   la geometria dei rettangoli. Larghezza 860 = 12..872, la stessa somma
		   dei due vecchi contenitori (420+434 con gap). */
		$$.append("#campogioco", '<div id="' +
			nome + '" class="campo" style="top:' +
			(100 + this.altezzacampo * banda) + 'px; left: 12px; width: 860px; height:' +
			this.altezzacampo + 'px;">');

		/* Contatori verticali: mano a sinistra delle carte, tris sul bordo
		   destro con la sigla del giocatore in testa. Gli id restano
		   "punti<nome>"/"punti<nometris>" così la logica esistente (SCOPERTE,
		   fine partita) funziona invariata. */
		this.creacontatoreverticale("punti" + nome, nome, 4, 30);
		/* Sigla localizzata come le immagini del totalizzatore (getLangImg):
		   it G/A1..A3, en P/O1..O3. */
		var sigla = (nometris === "trisgiocatore") ? t('sigla_giocatore') : t('sigla_avversario') + nometris.replace("trisavversario", "");
		this.creacontatoreverticale("punti" + nometris, nome, 860 - 36, 15, sigla);
		/* Etichetta MAZZIERE sopra il contatore, mostrata solo per il
		   mazziere della mano corrente. */
		$$.append("#" + nome, '<div id="mazziere' + nometris + '" style="position:absolute; display:none;' +
			' top: 1px; left: ' + (860 - 92) + 'px; width: 88px; text-align: right;' +
			' color:#ffd700; font-family: sans-serif; font-weight: bold; font-size: 11px;' +
			' text-shadow: 1px 1px 2px #000; z-index:600;">' + t('dealer') + '</div>');
		/* Etichetta FUORI: solo per gli avversari (mai per il giocatore),
		   mostrata quando l'opzione "escludiavversariesuperano" è attiva e
		   l'avversario ha superato il limite (vedi avvescluso()/render()).
		   Grande e centrata su tutta la fascia, ben visibile sopra le carte
		   (z-index alto) dato che segnala che il campo è inattivo. */
		if (nometris !== "trisgiocatore") {
			$$.append("#" + nome, '<div id="fuori' + nometris + '" style="position:absolute; display:none;' +
				' top: ' + Math.floor((this.altezzacampo - 50) / 2) + 'px; left: 0px; width: 860px; height: 50px;' +
				' text-align: center; line-height: 50px;' +
				' color:#ff3030; font-family: sans-serif; font-weight: bold; font-size: 34px;' +
				' letter-spacing: 4px; text-shadow: 2px 2px 4px #000, 0 0 12px #000;' +
				' background-color: rgba(0,0,0,0.45); z-index:900;">' + t('excluded') + '</div>');
		}
	},

	creamazzi: function () {

		this.stock = [];

		/* Offset unici per tutte le modalità. Le mani partono a destra del
		   contatore verticale (offsetx 40) e NON si comprimono mai: se la mano
		   è molto lunga può sbordare a destra, per scelta. I tris sono ancorati
		   al margine destro (arretrato di margindx per la colonna del
		   contatore) e crescono verso sinistra invadendo lo spazio della mano;
		   oltre larghezza si comprimono. */
		var offy = Math.floor((150 - CARTAH) / 2), moffx = Math.floor((120 - CARTAW) / 2), moffy = 150 - CARTAH - 6;
		var LTRIS = 795;

		this.mazzo = new CardGroup("#mazzo", { offsetx: moffx, offsety: moffy, deltax: 0.1, deltay: 0.1, xtris: 0 });
		this.scarti = new CardGroup("#scarti", { offsetx: moffx, offsety: moffy, deltax: 0.1, deltay: 0.1, xtris: 0 });
		/* Mano e tris condividono lo stesso div di fascia: la mano parte da
		   sinistra, i tris si ancorano a destra (destra = 12+860-40 = 832,
		   identica al vecchio contenitore separato). */
		this.giocatore = new CardGroup("#giocatore", { offsetx: 46, offsety: offy, deltax: 24, deltay: 0, xtris: 80 });
		this.trisgiocatore = new CardGroup("#giocatore", { offsetx: 25, offsety: offy, deltax: 24, deltay: 0, xtris: 80, larghezza: LTRIS, ancoradx: true, margindx: 40 });
		this.trisgiocatore.manogruppo = this.giocatore;
		this.avversario1 = new CardGroup("#avversario1", { offsetx: 46, offsety: offy, deltax: 24, deltay: 0, xtris: 0 });
		this.trisavversario1 = new CardGroup("#avversario1", { offsetx: 25, offsety: offy, deltax: 24, deltay: 0, xtris: 80, larghezza: LTRIS, ancoradx: true, margindx: 40 });
		this.trisavversario1.manogruppo = this.avversario1;
		this.avversario2 = new CardGroup("#avversario2", { offsetx: 46, offsety: offy, deltax: 24, deltay: 0, xtris: 0 });
		this.trisavversario2 = new CardGroup("#avversario2", { offsetx: 25, offsety: offy, deltax: 24, deltay: 0, xtris: 80, larghezza: LTRIS, ancoradx: true, margindx: 40 });
		this.trisavversario2.manogruppo = this.avversario2;
		this.avversario3 = new CardGroup("#avversario3", { offsetx: 46, offsety: offy, deltax: 24, deltay: 0, xtris: 0 });
		this.trisavversario3 = new CardGroup("#avversario3", { offsetx: 25, offsety: offy, deltax: 24, deltay: 0, xtris: 80, larghezza: LTRIS, ancoradx: true, margindx: 40 });
		this.trisavversario3.manogruppo = this.avversario3;

		this.campiavversario = [this.avversario1, this.avversario2, this.avversario3];
		this.campitrisavversario = [this.trisavversario1, this.trisavversario2, this.trisavversario3];

		var indice = 0;
		for (var retro = 0; retro < 2; retro++) {
			for (var i = 1; i <= 13; i++) {
				this.stock[indice] = (new Card(CUORI, i, retro, indice++));
				this.stock[indice] = (new Card(QUADRI, i, retro, indice++));
				this.stock[indice] = (new Card(FIORI, i, retro, indice++));
				this.stock[indice] = (new Card(PICCHE, i, retro, indice++));
			}
			this.stock[indice] = (new Card(JOLLY, 50, retro, indice++));
			this.stock[indice] = (new Card(JOLLY, 51, retro, indice++));
		}
		for (i = 0; i < 108; i++) {
			this.mazzo.carte[i] = this.stock[i];
		}

		for (var j = 0; j < scala.numeroavversari; j++) {
			$$.hide("#puntiavversario" + (j + 1));
		}
	},

	shuffle: function () {
		var i = 108;
		while (--i) {
			var j = Math.floor(Math.random() * (i + 1));
			var tempi = this.mazzo.carte[i];
			var tempj = this.mazzo.carte[j];
			this.mazzo.carte[i] = tempj;
			this.mazzo.carte[j] = tempi;
		}
	},

	createDeckElements: function () {
		var campo = $$.one('#campogioco');
		for (var i = 0; i < 108; i++) {
			var card = this.mazzo.carte[i];
			var pos = this.mazzo.posizione(i, card);
			card.left = pos.left;
			card.top = pos.top;
			var newDivCard = document.createElement('div');
			newDivCard.className = 'card';
			$$.css(newDivCard, {
				"top": card.top, "left": card.left,
				"z-index": i, "background-position-x": -994, "background-position-y": -96 * card.retro
			});
			campo.appendChild(newDivCard);
			newDivCard.card = card;
			card.gruppo = this.mazzo;
			card.gui = newDivCard;
		}
	},

	givecards: function () {

		this.distribuendo = true;
		this.muovicarta(this.mazzo, this.scarti, "faceUp", "nopush");
		this.render();

		distribuisci.play();
		for (var i = 0; i < 13; i++) {
			window.setTimeout(function () {
				scala.muovicarta(scala.mazzo, scala.giocatore, "faceUp", "nopush");
				scala.rendicontenitore(scala.giocatore, 180);
			}, i * 400);
			window.setTimeout(function () {
				for (var j = 0; j < scala.numeroavversari; j++) {
					if (scala.avvescluso(j)) continue;
					scala.muovicarta(scala.mazzo, scala.campiavversario[j], "faceDown", "nopush");
					scala.rendicontenitore(scala.campiavversario[j], 180);
				}
			}, i * 400 + 200);
		}

		window.setTimeout(function () {
			scala.ordinacarte(scala.giocatore);

			for (var j = 0; j < scala.numeroavversari; j++) {
				scala.ordinacarte(scala.campiavversario[j]);
			}
			scala.distribuendo = false;

			/* Il primo a giocare è il successivo al mazziere: se è un
			   avversario, il turno IA parte da lui e prosegue fino
			   all'ultimo avversario, poi tocca al giocatore. Gli avversari
			   esclusi (limite superato) vengono saltati. */
			var primo = scala.mazziere + 1;
			while ((primo >= 0) && (primo < scala.numeroavversari) && scala.avvescluso(primo)) primo++;
			if (primo >= scala.numeroavversari) primo = -1;
			if (primo >= 0) {
				scala.iaimminente = true;
				window.setTimeout(function () { scala.mossaavversario(primo); }, 800);
			}

			scala.render();
			ordina.play();
		}, 5500);

		this.pescato = false;
		this.carteselezionate = [];
	},

	ordinacarte: function (gruppo) {
		gruppo.carte.sort(function (a, b) {
			if (a.numero > b.numero) return 1;
			if (a.numero < b.numero) return -1;
			if (a.seme > b.seme) return 1;
			if (a.seme < b.seme) return -1;
			if (a.id > b.id) return 1;
			if (a.id < b.id) return -1;

			return 0;
		});
	},

	ordinascale: function (gruppo) {
		gruppo.carte.sort(function (a, b) {
			if (a.seme > b.seme) return 1;
			if (a.seme < b.seme) return -1;
			if (a.numero > b.numero) return 1;
			if (a.numero < b.numero) return -1;
			if (a.id > b.id) return -1;
			if (a.id < b.id) return 1;

			return 0;
		});
	},

	ordinacoppie: function (gruppo) {
		gruppo.sort(function (a, b) {
			if (a.punticonjolly < b.punticonjolly) return 1;
			if (a.punticonjolly > b.punticonjolly) return -1;
			return 0;
		});
	},

	ordinatris: function (gruppo) {
		gruppo.sort(function (a, b) {
			var primo = scala.calcolapuntitris(a);
			var secondo = scala.calcolapuntitris(b);
			if (primo < secondo) return 1;
			if (primo > secondo) return -1;
			return 0;
		});
	},

	collegaeventi: function () {

		this.scaladown = false;
		this.scalamove = false;
		this.clickattacktentato = false;

		$$.on(document, "contextmenu", function (ev) {
			var cardEl = ev.target.closest && ev.target.closest('.card');
			if (cardEl) {
				ev.preventDefault();
				if (!scala.fmodale) return scala.cartadestro(cardEl, ev);
				return;
			}
			ev.preventDefault();
		});

		$$.on(document, "touchstart", function (ev) {
			var cardEl = ev.target.closest && ev.target.closest('.card');
			if (!cardEl) return;
			ev.preventDefault();
			if (!scala.fmodale) return scala.scalamousedown(cardEl, ev.touches[0] || ev.changedTouches[0]);
		}, { passive: false });

		$$.on(document, "mousedown", function (ev) {
			var cardEl = ev.target.closest && ev.target.closest('.card');
			if (!cardEl) return;
			/* Il drag è permesso anche durante il replay del turno IA: i rami
			   pericolosi del mouseup sono già protetti (attacco/deposito da
			   pescato, pesca/scarto da turno) e resta attivo solo il riordino
			   della mano; Snapshot.restore preserva l'ordine durante il
			   replay. */
			if ((ev.button == 0) && (!scala.fmodale)) return scala.scalamousedown(cardEl, ev);
		});

		$$.on(document, "touchend", function (ev) {
			scala.fscalauptouch = true;
			if ((!scala.fmodale)) return scala.scalamouseup(ev.touches[0] || ev.changedTouches[0]);
		});

		$$.on(document, "mouseup", function (ev) {
			if (scala.fscalauptouch) { scala.fscalauptouch = false; return; }
			if ((ev.button == 0) && (!scala.fmodale)) return scala.scalamouseup(ev);
		});

		$$.on(document, "touchmove", function (ev) {
			if ((scala.scaladown) && (!scala.fmodale)) return scala.scalamousemove(ev.touches[0] || ev.changedTouches[0]);
		});

		$$.on(document, "mousemove", function (ev) {
			if ((ev.button == 0) && (scala.scaladown) && (!scala.fmodale)) return scala.scalamousemove(ev);
		});

		$$.on("#pulsantemessaggio1", "click", function (ev) {
			return scala.clickmessaggio1();
		});

		$$.on("#pulsantemessaggio2", "click", function (ev) {
			return scala.clickmessaggio2();
		});

		$$.on("#pulsantechiudiinfo", "click", function (ev) {
			return scala.clickchiudiinfo();
		});

		$$.on("#pulsante2", "click", function (ev) {
			return scala.multiundo();
		});
		$$.on("#scoperte", "click", function (ev) {
			return scala.scoperte();
		});

		$$.on("#totalelimite", "click", function (ev) {
			return scala.totalelim();
		});

		$$.on("#bannerdeposita", "click", function (ev) {
			return scala.scartatrisgiocatore();
		});

		$$.on('.pulsantehelp', 'click', function () {
			var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
			window.open('regole-scala40' + langSuffix, '_blank');
		});

		$$.on('#opzioni', 'click', function () {
			scala.apriopzioni();
		});
		$$.on('#optjollyimmediato', 'change', function (ev) {
			scala.jollyimmediato = ev.target.checked;
			localStorage.setItem('scala40tris_jollyimmediato', ev.target.checked ? '1' : '0');
		});
		$$.on('#optscartoimmediato', 'change', function (ev) {
			scala.scartoimmediato = ev.target.checked;
			localStorage.setItem('scala40tris_scartoimmediato', ev.target.checked ? '1' : '0');
		});
		$$.on('#optnonscartareattaccanti', 'change', function (ev) {
			scala.nonscartareattaccanti = ev.target.checked;
			localStorage.setItem('scala40tris_nonscartareattaccanti', ev.target.checked ? '1' : '0');
		});
		$$.on('#optunacartabasta', 'change', function (ev) {
			scala.unacartabasta = ev.target.checked;
			localStorage.setItem('scala40tris_unacartabasta', ev.target.checked ? '1' : '0');
		});
		$$.on('#optassosingolo', 'change', function (ev) {
			scala.assosingolo = ev.target.checked;
			localStorage.setItem('scala40tris_assosingolo', ev.target.checked ? '1' : '0');
		});
		$$.on('#optescludiavversariesuperano', 'change', function (ev) {
			scala.escludiavversariesuperano = ev.target.checked;
			localStorage.setItem('scala40tris_escludiavversariesuperano', ev.target.checked ? '1' : '0');
		});
		$$.on('input[name="audiotorneo"]', 'change', function (ev) {
			if (!ev.target.checked) return;
			localStorage.setItem('scala40tris_audiotorneo', ev.target.value);
			/* pause() ferma anche i suoni Web Audio (patch in site.js) */
			thunder.pause();
			lacrimosa.pause();
			var anteprima = (ev.target.value === 'thunder') ? thunder : lacrimosa;
			anteprima.currentTime = 0;
			anteprima.play();
		});
		$$.on('#azzeratotale', 'click', function () {
			scala.azzeratotale();
		});

		$$.on('#totaleavversario1', 'click', function () {
			scala.muovicarta(scala.mazzo, scala.scarti, "faceUp", "nopush");
			scala.render();
			log(scala.mazzo.carte.length);
		});

		$$.on('.bottone1', 'click', function () {
			scala.funzbottone1();
		});
		$$.on('.bottone2', 'click', function () {
			scala.funzbottone2();
		});

		scala.funzbottone1 = (function () { });
		scala.funzbottone2 = (function () { });

		return;
	},

	clickmessaggio1: function () {
		$$.show("#ulterioriinfo");
	},
	clickmessaggio2: function () {
		// window.location.href = "mailto:postmaster@lucianomanenti.com";
	},
	clickchiudiinfo: function () {
		$$.hide("#ulterioriinfo");
	},

	pushstato: function (comm) {
		this.statostack.push(new Snapshot(comm || "nc"));
		$$.css($$.one("#pulsante2"), { "border-color": "yellow" });
	},

	/* Ripristina uno stato dallo stack. Semantica invariata rispetto alla
	   versione precedente:
	   - senza argomenti: pop dell'ultimo stato e ripristino (undo);
	   - popstato(n): ripristina lo stato n SENZA toglierlo dallo stack
	     (usato dal replay animato del turno IA);
	   - popstato(-1, true): ripristina l'ultimo stato lasciandolo sullo stack. */
	popstato: function (numerostato, lasciacopia) {

		/* 0 è un indice valido: il default -1 vale solo se l'argomento manca. */
		var miostato = (numerostato === undefined || numerostato === null) ? -1 : numerostato;

		var miacopia = lasciacopia || false;
		if (this.statostack.length == 0) return;

		var stato;
		if (miacopia) stato = this.statostack[this.statostack.length - 1];
		else {
			if (miostato != -1) stato = this.statostack[numerostato];
			else stato = this.statostack.pop();
		}

		stato.restore();

		if (this.statostack.length == 0) $$.css($$.one("#pulsante2"), { "border-color": "#888888" });
	},

	scalamousedown: function (divCard, ev) {

		this.cartadown = divCard;

		for (var i = 0; i < scala.jollymodificabili.length; i++) {
			var carta = scala.jollymodificabili[i];
			if (divCard.card.id == carta.id) {
				var ntris = carta.ntris;
				var incrementaseme = (function () {
					var vseme = valoreseme[carta.tipojolly];
					vseme++;
					if (vseme == 4) vseme = 0;
					carta.tipojolly = semevalore[vseme];
				});
				incrementaseme();
				var cartat;
				for (var j = 0; j < this.trisgiocatore.carte.length; j++) {
					cartat = this.trisgiocatore.carte[j];
					if ((cartat.ntris == ntris) && (cartat.id != carta.id) &&
						(((cartat.numero < 50) && (cartat.seme == carta.tipojolly)) ||
							((cartat.numero > 49) && (cartat.tipojolly == carta.tipojolly)))) {
						incrementaseme(); j = -1;
					}
				}
				this.render();
				return;
			}
		}

		for (i = 0; i < scala.jollyestremiswappabili.length; i++) {
			if (divCard.card.id == scala.jollyestremiswappabili[i].id) {
				this.swapestremojolly(scala.jollyestremiswappabili[i]);
				return;
			}
		}

		/* Click su una carta già in tavola (proprio tris o tris avversario):
		   se in mano è selezionata esattamente una carta, è l'alternativa al
		   trascinamento. checkcarta tenta l'aggancio solo accanto alla carta
		   indicata: per una scala serve quindi ancorarsi a un'estremità reale
		   del blocco (non alla carta cliccata, che può essere interna) perché
		   la carta si estenda correttamente oltre; quale delle due estremità
		   provare per prima dipende dal lato del blocco su cui si è cliccato
		   (utile soprattutto per un jolly, che può stare da entrambi i lati).
		   Per un tris la posizione è indifferente, resta solo il fallback. */
		if ((divCard.card.gruppo != this.giocatore) && this.pescato && (this.carteselezionate.length == 1)) {
			/* Solo i blocchi in tavola (proprio tris o tris avversari) sono
			   bersagli validi: le carte di mazzo/scarti hanno anch'esse un
			   gruppo diverso dal giocatore ma non vanno mai intercettate qui,
			   altrimenti il click su di esse (es. per scartare la carta
			   selezionata) verrebbe assorbito da un tentativo di aggancio a
			   vuoto invece di raggiungere il ramo dedicato in scalamouseup. */
			var cont = (divCard.card.gruppo == this.trisgiocatore) ? this.trisgiocatore : null;
			if (!cont && (this.calcolapuntitris(this.trisgiocatore.carte) > 39)) {
				for (var a = 0; a < scala.numeroavversari; a++) {
					if (divCard.card.gruppo == this.campitrisavversario[a]) { cont = this.campitrisavversario[a]; break; }
				}
			}
			if (cont) {
				/* Segnala a scalamouseup (che riceverà comunque il mouseup di
				   questo stesso click, con scaladown ancora false) di non
				   interpretare il rilascio come "clicca per depositare una nuova
				   combinazione": qui si è già tentato un aggancio, riuscito o no. */
				this.clickattacktentato = true;
				var cartasel = this.carteselezionate[0];
				this.cartadown = cartasel.gui;
				var ntrisclick = divCard.card.ntris;
				var indiceinizio = -1, indicefine = -1, indiceclick = -1;
				for (var i = 0; i < cont.carte.length; i++) {
					if (cont.carte[i].ntris == ntrisclick) {
						if (indiceinizio == -1) indiceinizio = i;
						indicefine = i;
						if (cont.carte[i] == divCard.card) indiceclick = i;
					}
				}
				/* Il lato del click decide quale estremità tentare per prima:
				   click sulla metà destra del blocco -> prima la coda, poi la
				   testa come ripiego (e viceversa), così un jolly cliccato a
				   destra si posiziona a destra e non salta all'altro capo. */
				var centrotris = (indiceinizio + indicefine) / 2;
				var primafine = (indiceclick != -1) && (indiceclick > centrotris);
				var attaccataclick = false;
				if (indiceinizio != -1) {
					if (primafine) {
						attaccataclick = this.checkcarta(cont, indicefine, false, ESEGUI);
						if (!attaccataclick && (indicefine != indiceinizio)) {
							attaccataclick = this.checkcarta(cont, indiceinizio, true, ESEGUI);
						}
					}
					else {
						attaccataclick = this.checkcarta(cont, indiceinizio, true, ESEGUI);
						if (!attaccataclick && (indicefine != indiceinizio)) {
							attaccataclick = this.checkcarta(cont, indicefine, false, ESEGUI);
						}
					}
				}
				if (attaccataclick) {
					this.deselezionacarta(cartasel.gui);
					this.tgoff();
					for (var j = 0; j < scala.numeroavversari; j++) this.taoff(j);
					$$.removeClassAll(".card", "cardselected");
					this.render();
				}
				return;
			}
		}

		/* Si possono trascinare solo le carte della propria mano. Il criterio
		   è l'appartenenza al gruppo, non l'area: con la mano lunga le ultime
		   carte sbordano a destra del contenitore e devono restare prendibili. */
		if (divCard.card.gruppo != this.giocatore) return;

		this.scaladown = true;
		this.scalamove = false;
		this.scaladownx = (ev.pageX - scala.offsetxx) / window.gameScale;
		this.scaladowny = (ev.pageY - scala.offsetyy) / window.gameScale;

		return;
	},

	scalamousemove: function (ev) {

		var deltax = (ev.pageX - scala.offsetxx) / window.gameScale - this.scaladownx;
		var deltay = (ev.pageY - scala.offsetyy) / window.gameScale - this.scaladowny;
		if (!this.scalamove) { if ((Math.abs(deltax) < 5) && (Math.abs(deltay) < 5)) return; }

		var divCard = this.cartadown;
		$$.css(divCard, { "z-index": 1000 });
		$$.css(this.cartadown, { "top": this.cartadown.card.top + deltay, "left": this.cartadown.card.left + deltax });
		this.scalamove = true;

		/* Anteprima degli agganci: la fascia sotto il puntatore individua il
		   bersaglio, cercamatch decide sull'impronta reale delle carte e
		   sulla validità della combinazione. Il bordo arancione si accende
		   solo se il rilascio in questo punto attaccherebbe davvero. */
		var puoattaccare = (this.pescato) && (this.giocatore.carte.length != 1);

		if (puoattaccare && this.pointerinelement(ev, "#giocatore")
			&& this.cercamatch(this.trisgiocatore, NOESEGUI)) this.tgon();
		else { this.tgoff(); this.togliselezione(this.trisgiocatore); }

		var apertura = (this.calcolapuntitris(this.trisgiocatore.carte) > 39);
		for (var j = 0; j < scala.numeroavversari; j++) {
			if (puoattaccare && apertura && this.pointerinelement(ev, "#avversario" + (j + 1))
				&& this.cercamatch(this.campitrisavversario[j], NOESEGUI)) this.taon(j);
			else { this.taoff(j); this.togliselezione(this.campitrisavversario[j]); }
		}

		return;
	},

	scalamouseup: function (ev) {

		if (!scala.scaladown) {
			if (this.clickattacktentato) { this.clickattacktentato = false; return; }
			if (this.pointerinelement(ev, "#mazzo") && (!this.pescato)) return this.cartapesca();
			/* per pescare vale l'intera fascia del giocatore */
			if (this.pointerinelement(ev, "#giocatore") && (!this.pescato)) return this.cartapesca();
			if (this.pointerinelement(ev, "#scarti")) return this.scartipesca();
			/* dopo la pesca il mazzo non serve più a pescare: click sul mazzo
			   con una carta selezionata equivale a cliccare sugli scarti,
			   comodo perché il riquadro scarti è quasi tutto coperto dalle carte */
			if (this.pointerinelement(ev, "#mazzo") && (this.pescato)) return this.scartipesca();
			/* a pesca fatta, il click sulla fascia deposita le carte selezionate */
			if (this.pointerinelement(ev, "#giocatore") && (this.pescato)) return this.scartatrisgiocatore();
			return;
		}
		this.scaladown = false;

		var divCard = this.cartadown;
		var carta = divCard.card;

		if ((!scala.scalamove) && (this.pescato)) { this.selezionacartagiocatore(divCard); this.aggiornabannerdeposita(); this.aggiornabannermovejolly(); return; }

		if (this.pointerinelement(ev, "#scarti") && (this.pescato)) return this.scarta(carta);

		/* Priorità del rilascio nella fascia: prima l'attacco (proprio tris,
		   poi tris avversari se il giocatore ha aperto), altrimenti riordino
		   della mano. cercamatch dice se l'attacco è avvenuto: decide in base
		   all'impronta reale delle carte e alla validità della combinazione,
		   quindi il riordino resta possibile anche vicino ai blocchi quando
		   la carta non si attacca. */
		var attaccata = false;
		if ((this.pescato) && (this.giocatore.carte.length != 1)) {
			if (this.pointerinelement(ev, "#giocatore")) {
				attaccata = this.cercamatch(this.trisgiocatore, ESEGUI);
			}
			if (!attaccata && (this.calcolapuntitris(this.trisgiocatore.carte) > 39)) {
				for (var j = 0; j < scala.numeroavversari; j++) {
					if (this.pointerinelement(ev, "#avversario" + (j + 1))) {
						attaccata = this.cercamatch(this.campitrisavversario[j], ESEGUI);
						break;
					}
				}
			}
		}

		if (!attaccata && this.pointerinelement(ev, "#giocatore")
			&& (carta.left > 0) && (this.scalamove) && (carta.gruppo == scala.giocatore)
			&& this.inimpronta(this.giocatore, parseInt(divCard.style.left, 10))) {
			var newindex = 0;
			var currentindex = (carta.left - (this.giocatore.left + this.giocatore.offsetx)) / this.giocatore.deltax;
			var currentleft = parseInt(divCard.style.left, 10);
			if (currentleft > (this.giocatore.left + this.giocatore.offsetx)) {
				newindex = Math.floor((currentleft - (this.giocatore.left + this.giocatore.offsetx)) / this.giocatore.deltax) + 1;
				if (newindex > (this.giocatore.carte.length)) newindex = this.giocatore.carte.length;
			}
			if (currentindex != newindex) {
				this.giocatore.carte.splice(newindex, 0, carta);
				if (newindex < currentindex) currentindex++;
				this.giocatore.carte.splice(currentindex, 1);
				ordina.play();
			}
		}

		this.tgoff();
		for (var j = 0; j < scala.numeroavversari; j++) this.taoff(j);
		$$.removeClassAll(".card", "cardselected");
		this.scalamove = false;
		this.render();
		return;
	},

	/* Toglie l'evidenziazione di anteprima dalle carte del gruppo. */
	togliselezione: function (cont) {
		for (var i = 0; i < cont.carte.length; i++) $$.removeClass(cont.carte[i].gui, "cardselected");
	},

	/* True se la carta trascinata (bordo sinistro cartaleft) si sovrappone
	   all'impronta orizzontale reale delle carte del gruppo, estesa di
	   MARGINECATTURA. Con i tris ancorati a destra che invadono lo spazio
	   della mano è la posizione delle carte, non un rettangolo contenitore,
	   a dire dove ha senso agganciare. */
	inimpronta: function (cont, cartaleft) {
		var n = cont.carte.length;
		if (n == 0) return false;
		var minx = cont.carte[0].left, maxx = cont.carte[0].left;
		for (var i = 1; i < n; i++) {
			if (cont.carte[i].left < minx) minx = cont.carte[i].left;
			if (cont.carte[i].left > maxx) maxx = cont.carte[i].left;
		}
		if (cartaleft + CARTAW < minx - MARGINECATTURA) return false;
		if (cartaleft > maxx + CARTAW + MARGINECATTURA) return false;
		return true;
	},

	/* Cerca un aggancio per la carta trascinata nel gruppo tris indicato.
	   Restituisce true se ha trovato (ed eventualmente eseguito, con ESEGUI)
	   una combinazione valida; con NOESEGUI si limita ad evidenziare la carta
	   bersaglio. */
	cercamatch: function (cont, esegui) {
		var SINISTRA = true;
		var DESTRA = false;
		var ncarte = cont.carte.length;
		this.togliselezione(cont);
		if (ncarte == 0) return false;
		var cartaleft = parseInt(this.cartadown.style.left, 10);
		if (!this.inimpronta(cont, cartaleft)) return false;

		/* L'ordine visivo non coincide più con l'ordine dell'array (i tris
		   ancorati a destra si accumulano verso sinistra): si cerca quindi la
		   carta più vicina in orizzontale alla carta trascinata. */
		var indice = 0, distanzamin = 1000000;
		for (var i = 0; i < ncarte; i++) {
			var distanza = Math.abs(cont.carte[i].left - cartaleft);
			if (distanza < distanzamin) { distanzamin = distanza; indice = i; }
		}
		if (cartaleft <= cont.carte[indice].left) return this.checkcarta(cont, indice, SINISTRA, esegui);
		return this.checkcarta(cont, indice, DESTRA, esegui);
	},

	checkcarta: function (cont, indice, left, esegui) {

		var carta = this.cartadown.card;
		var cartasel = cont.carte[indice];
		var tipotris = cartasel.tipotris;
		var ntris = cartasel.ntris;
		var tris = [];
		var indicetris = 0;

		for (var i = 0; i < cont.carte.length; i++) {
			if (cont.carte[i].ntris == ntris) {
				if (i == indice) indicetris = tris.length;
				tris.push(cont.carte[i]);
			}
		}

		/* Recupero jolly con priorità sull'attacco e su TUTTO il blocco,
		   indipendentemente dal punto di contatto: se la carta trascinata è
		   quella rappresentata da un jolly del blocco, l'unica mossa
		   ammissibile è lo scambio (il jolly vale la carta che sostituisce:
		   attaccare il suo doppione lasciandolo nel blocco creerebbe un seme
		   duplicato nel tris o una carta duplicata nella scala). */
		var esito;
		if (carta.numero < 49) {
			for (var j = 0; j < tris.length; j++) {
				var cartajolly = tris[j];
				if (cartajolly.numero < 49) continue;
				if (tipotris == TRIS) {
					if ((carta.seme == cartajolly.tipojolly) && (carta.numero == cartajolly.numerojolly)) {
						this.scambiacarte(carta, cartajolly, esegui);
						return true;
					}
				}
				else {
					tris[j] = carta;
					var scambiovalido = this.analizzatris(tris).valido;
					tris[j] = cartajolly;
					if (scambiovalido) { this.scambiacarte(carta, cartajolly, esegui); return true; }
				}
			}
		}

		/* La carta più vicina è un jolly di scala ma lo scambio (già tentato
		   sopra su tutto il blocco) non è valido: se il jolly è a un'estremità
		   prova ad allungare la scala oltre il jolly. */
		if ((cartasel.numero > 49) && (carta.numero < 49) && (tipotris == SCALA)) {
			if (indicetris == 0) {
				tris.splice(0, 0, carta);
				esito = this.analizzatris(tris);
				if (esito.valido) { this.aggiungitris(cont, indice, carta, cartasel, esegui, esito); return true; }
			}
			else if (indicetris == tris.length - 1) {
				tris.splice(tris.length, 0, carta);
				esito = this.analizzatris(tris);
				if (esito.valido) { this.aggiungitris(cont, indice + 1, carta, cartasel, esegui, esito); return true; }
			}
			return false;
		}

		/* Prova il lato indicato dalla posizione della carta trascinata; se la
		   combinazione non è valida prova l'altro lato della stessa carta. In
		   una scala i due lati non sono equivalenti (es. il 6 si attacca solo
		   a sinistra del 7): senza il tentativo simmetrico, bastava superare
		   di un pixel il bordo della prima carta del blocco perché l'attacco
		   fallisse silenziosamente. */
		if (left) {
			tris.splice(indicetris, 0, carta);
			esito = this.analizzatris(tris);
			if (esito.valido) { this.aggiungitris(cont, indice, carta, cartasel, esegui, esito); return true; }
			tris.splice(indicetris, 1);
			tris.splice(indicetris + 1, 0, carta);
			esito = this.analizzatris(tris);
			if (esito.valido) { this.aggiungitris(cont, indice + 1, carta, cartasel, esegui, esito); return true; }
		}
		else {
			tris.splice(indicetris + 1, 0, carta);
			esito = this.analizzatris(tris);
			if (esito.valido) { this.aggiungitris(cont, indice + 1, carta, cartasel, esegui, esito); return true; }
			tris.splice(indicetris + 1, 1);
			tris.splice(indicetris, 0, carta);
			esito = this.analizzatris(tris);
			if (esito.valido) { this.aggiungitris(cont, indice, carta, cartasel, esegui, esito); return true; }
		}
		return false;
	},

	scambiacarte: function (carta, cartasel, esegui) {
		$$.addClass(cartasel.gui, "cardselected");
		if (esegui) {
			scala.jollyestremiswappabili = [];
			scala.jollymodificabili = [];
			var contenitore1 = carta.gruppo;
			var posizione1 = contenitore1.carte.indexOf(carta);
			var contenitore2 = cartasel.gruppo;
			var posizione2 = contenitore2.carte.indexOf(cartasel);
			var temp = carta.tipotris;
			carta.tipotris = cartasel.tipotris;
			cartasel.tipotris = temp;
			temp = carta.faceUp;
			carta.faceUp = cartasel.faceUp;
			cartasel.faceUp = temp;
			temp = carta.ntris;
			carta.ntris = cartasel.ntris;
			cartasel.ntris = temp;
			contenitore1.replaceAt(posizione1, cartasel);
			contenitore2.replaceAt(posizione2, carta);
			cartasel.tipojolly = "J";
			/* Regola opzionale: il jolly recuperato dal giocatore va giocato
			   nello stesso turno (render lo evidenzia, scarta lo pretende). */
			if (scala.jollyimmediato && (contenitore1 === scala.giocatore)) scala.jollydarigiocare = cartasel;
			this.render();
			suona(perjolly);
			scala.pushstato("scambiajolly");
			$$.removeClass(cartasel.gui, "cardselected");
		}
	},

	/* infotris: esito di analizzatris (o oggetto {semescala, primonumero,
	   semidausare}) relativo alla combinazione di destinazione. Serve solo
	   quando la carta aggiunta è un jolly. */
	aggiungitris: function (cont, indice, carta, cartasel, esegui, infotris) {
		$$.addClass(cartasel.gui, "cardselected");
		if (esegui) {
			scala.jollyestremiswappabili = [];
			scala.jollymodificabili = [];
			carta.gruppo.remove(carta);
			carta.ntris = cartasel.ntris;
			carta.tipotris = cartasel.tipotris;
			if (carta.numero > 49) {
				if (carta.tipotris == SCALA) {
					carta.tipojolly = infotris.semescala;
					var i;
					for (i = 0; i < cont.carte.length; i++) { if (cont.carte[i].ntris == cartasel.ntris) break; }
					carta.numerojolly = infotris.primonumero + indice - i;
				}
				else {
					for (var i = 0; i < cont.carte.length; i++) {
						if ((cont.carte[i].ntris == carta.ntris) && (cont.carte[i].numero > 49)) {
							infotris.semidausare.togli(cont.carte[i].tipojolly);
						}
					}
					carta.tipojolly = infotris.semidausare.pop();
					carta.numerojolly = infotris.primonumero;
				}
			}
			carta.faceUp = true;
			cont.add(carta, indice);
			suona(slitta);
			this.pushstato("aggiungitris " + carta.shortName);

			this.render();
			$$.removeClass(cartasel.gui, "cardselected");
		}
	},

	rimuovicarta: function (carta) {
		carta.gruppo.remove(carta);
	},

	myalert: function (messaggio) {
		var el = $$.one("#testoallerta");
		if (el) el.textContent = messaggio;
		ding.play();
		scala.mydialog("allerta");
	},

	mydialog: function (form, button1, button2) {
		scala.formtohide = ("#" + form);
		scala.mostradialogo(scala.formtohide);
		scala.funzbottone1 = (button1) || (this.hidedialog);
		scala.funzbottone2 = (button2) || (this.hidedialog);
	},

	hidedialog: function () {
		$$.hide(scala.formtohide);
		$$.hide("#schermo");
		this.fmodale = false;
		var minPanel = document.getElementById('scala-minimal-win-panel');
		if (minPanel) minPanel.style.display = 'none';
	},

	scarta: function (carta) {

		/* Regola opzionale "jolly immediato": non si può scartare (chiudere
		   il turno) finché il jolly recuperato è ancora in mano. */
		if (this.jollyimmediato && this.jollydarigiocare && (this.jollydarigiocare.gruppo === this.giocatore)) {
			return this.myalert(t('jolly_first'));
		}

		/* Regola opzionale "scarto immediato": idem per la carta pescata
		   dagli scarti. */
		if (this.scartoimmediato && this.cartascartidagiocare && (this.cartascartidagiocare.gruppo === this.giocatore)) {
			return this.myalert(t('scarti_first'));
		}

		/* Regola opzionale "non scartare carte che attaccano": vietato
		   scartare una carta che si aggancerebbe a un tris/scala in tavola,
		   a meno che sia l'unica carta rimasta in mano. */
		if (this.nonscartareattaccanti && (this.giocatore.carte.length > 1) && this.cartaattaccatavolo(carta)) {
			return this.myalert(t('attacca_first'));
		}

		var annulla40 = (function () {
			while (scala.trisgiocatore.carte.length > 0) { scala.undo(); }
			while ((scala.fscartipesca) && (scala.pescato)) { scala.undo(); }
			this.hidedialog();
		});

		scala.jollymodificabili = [];
		scala.jollyestremiswappabili = [];
		var punti = this.calcolapuntitris(this.trisgiocatore.carte);
		if ((!this.f40giocatore) && ((punti > 0) || (this.fscartipesca)) && (punti < 40)) {
			ding.play();
			this.mydialog("oltre40", annulla40);
			return;
		}

		if (punti > 39) this.f40giocatore = true;
		$$.removeClassAll(".card", "cardselected");
		scarta.play();

		for (var i = 0; i < this.carteselezionate.length; i++) {
			this.carteselezionate[i].selected = false;
			$$.removeClass(this.carteselezionate[i].gui, "cardselected");
		}
		this.carteselezionate = [];
		this.pescato = false;

		this.muovicarta(carta, this.scarti, "faceUp", "scarta");

		if (this.giocatore.carte.length == 0) {
			this.cartescoperte = true;

			/* La mano si chiude qui, non necessariamente a macchina a stati
			   dell'IA "a riposo" (es. con l'opzione che esclude gli avversari
			   oltre soglia, astato può essere rimasto su un valore intermedio):
			   normalizza prima del render finale così la guardia in render()
			   non sopprime l'aggiornamento del punteggio a 0 carte. */
			this.astato = TurnState.FINETURNO;
			this.turno = -1;

			this.totalepartite++;

			var vintotorneo = this.calcolatotali();

			$$.css($$.one("#puntigiocatore"), { "z-index": "40000" });
			$$.hide("#puntitrisgiocatore");
			for (var j = 0; j < scala.numeroavversari; j++) {
				$$.show("#puntiavversario" + (j + 1));
				$$.css($$.one("#puntiavversario" + (j + 1)), { "z-index": "40000" });
				$$.hide("#puntitrisavversario" + (j + 1));
			}

			if (vintotorneo) {
				window.setTimeout(function () { applause.play(); scala.mydialog("haivintotorneo", function () { scala.azzeratotale(); scala.nuovo(); }, scala.nuovo); }, 1000);
			}
			else {
				window.setTimeout(function () { tada.play(); scala.mydialog("haivinto", scala.nuovo); }, 1000);
			}
		}
		else {
			this.iaimminente = true;
			window.setTimeout(function () { scala.mossaavversario(0); }, 1000);
		}
		this.render();
	},

	mostradialogo: function (dialogo) {
		var selector = (dialogo.indexOf('#') === 0) ? dialogo : '#' + dialogo;
		var el = $$.one(selector);
		$$.css(el, { "z-index": "50000" });
		$$.show(el);

		/* Un drag eventualmente in corso muore qui: il mouseup verrà ignorato
		   dal gate fmodale, quindi lo stato va ripulito subito (il prossimo
		   render riporterà la carta al suo posto). */
		this.scaladown = false;
		this.scalamove = false;

		$$.css($$.one("#schermo"), { "width": window.innerWidth / window.gameScale });
		$$.show("#schermo");
		this.fmodale = true;

		// Gestione Amazon Finish Banner per Scala 40
		if (window.ENABLE_BANNER_ON_FINISH && typeof setupAmazonFinishBanner === 'function') {
			var id = dialogo.replace('#', '');
			if (id === 'haivinto' || id === 'haiperso' || id === 'haivintotorneo' || id === 'haipersotorneo') {
				try {
					var modal = document.getElementById(id);
					if (modal) {
						modal.style.width = '700px';
						modal.style.height = '300px';
						modal.style.left = '50px';
						modal.style.backgroundColor = '#1a4224';
						modal.style.boxSizing = 'border-box';
						modal.style.border = '4px solid #b8860b';
						modal.style.borderRadius = '12px';
						modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';

						var sfondovittoria = '';
						if (id === 'haivinto') sfondovittoria = 'url(images/scala40/haivinto.jpg)';
						else if (id === 'haiperso') sfondovittoria = 'url(images/scala40/haiperso.jpg)';
						else if (id === 'haivintotorneo') sfondovittoria = 'url(images/scala40/haivintotorneo.jpg)';
						else if (id === 'haipersotorneo') sfondovittoria = 'url(images/scala40/haipersotorneo.jpg)';

						if (sfondovittoria) {
							modal.style.backgroundImage = sfondovittoria;
							modal.style.backgroundRepeat = 'no-repeat';
							modal.style.backgroundPosition = 'center center';
							modal.style.backgroundSize = '100% 100%';
						}

						var giocatore = document.getElementById('giocatore');
						var targetTop;
						if (giocatore) {
							targetTop = giocatore.offsetTop - (modal.offsetHeight || 300) - 5;
						} else {
							var campogioco = document.getElementById('campogioco');
							var campogiocoHeight = campogioco ? (campogioco.offsetHeight || 750) : 750;
							targetTop = campogiocoHeight - (modal.offsetHeight || 300) - 5;
						}
						modal.style.top = targetTop + 'px';
						modal.style.overflow = 'visible';

						var isEnglish = (window.currentLang === 'en');
						var btnText = isEnglish ? 'VIEW CARDS' : 'VEDI CARTE';

						var btnVedi = modal.querySelector('.btn-vedi-carte');
						if (!btnVedi) {
							btnVedi = document.createElement('button');
							btnVedi.className = 'btn-vedi-carte';
							btnVedi.type = 'button';
							btnVedi.textContent = btnText;
							btnVedi.style.position = 'absolute';
							btnVedi.style.cursor = 'pointer';

							btnVedi.onclick = function (e) {
								if (e) e.stopPropagation();

								scala.hidedialog();

								var isTorneo = (id === 'haivintotorneo' || id === 'haipersotorneo');

								var minimalPanel = document.getElementById('scala-minimal-win-panel');
								if (!minimalPanel) {
									minimalPanel = document.createElement('div');
									minimalPanel.id = 'scala-minimal-win-panel';
									minimalPanel.style.cssText = 'position: absolute; bottom: 12px; left: 430px; z-index: 10000; display: flex; gap: 15px;';

									var btn1 = document.createElement('button');
									btn1.type = 'button';
									btn1.className = 'btn-min-1';
									btn1.style.cssText = 'width: 140px; height: 36px; background-color: #ffd700; color: #000; font-weight: bold; border: 2px solid #cca300; border-radius: 10px; cursor: pointer; font-family: sans-serif; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.1s;';

									btn1.onmouseenter = function () { btn1.style.backgroundColor = '#ffea00'; };
									btn1.onmouseleave = function () { btn1.style.backgroundColor = '#ffd700'; };
									btn1.onmousedown = function () { btn1.style.transform = 'scale(0.95)'; };
									btn1.onmouseup = function () { btn1.style.transform = 'scale(1)'; };

									var btn2 = document.createElement('button');
									btn2.type = 'button';
									btn2.className = 'btn-min-2';
									btn2.style.cssText = 'width: 140px; height: 36px; background-color: #f0f0f0; color: #333; font-weight: bold; border: 2px solid #bbb; border-radius: 10px; cursor: pointer; font-family: sans-serif; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); transition: transform 0.1s;';

									btn2.onmouseenter = function () { btn2.style.backgroundColor = '#ffffff'; };
									btn2.onmouseleave = function () { btn2.style.backgroundColor = '#f0f0f0'; };
									btn2.onmousedown = function () { btn2.style.transform = 'scale(0.95)'; };
									btn2.onmouseup = function () { btn2.style.transform = 'scale(1)'; };

									minimalPanel.appendChild(btn1);
									minimalPanel.appendChild(btn2);

									var campogioco = document.getElementById('campogioco');
									if (campogioco) {
										campogioco.appendChild(minimalPanel);
									} else {
										document.body.appendChild(minimalPanel);
									}
								}

								var btn1 = minimalPanel.querySelector('.btn-min-1');
								var btn2 = minimalPanel.querySelector('.btn-min-2');

								if (isTorneo) {
									btn1.textContent = isEnglish ? 'NEW TOURNAMENT' : 'NUOVO TORNEO';
									btn1.onclick = function () {
										minimalPanel.style.display = 'none';
										scala.funzbottone1();
									};

									btn2.textContent = isEnglish ? 'PLAY AGAIN' : 'GIOCA ANCORA';
									btn2.style.display = 'block';
									btn2.onclick = function () {
										minimalPanel.style.display = 'none';
										scala.funzbottone2();
									};

									minimalPanel.style.left = '352px';
								} else {
									btn1.textContent = isEnglish ? 'NEW GAME' : 'NUOVA PARTITA';
									btn1.onclick = function () {
										minimalPanel.style.display = 'none';
										scala.nuovo();
									};

									btn2.style.display = 'none';

									minimalPanel.style.left = '430px';
								}

								minimalPanel.style.display = 'block';
							};
							modal.appendChild(btnVedi);
						} else {
							btnVedi.textContent = btnText;
						}

						var buttons = modal.querySelectorAll('button');
						var otherButtons = [];
						for (var i = 0; i < buttons.length; i++) {
							if (buttons[i] !== btnVedi) {
								otherButtons.push(buttons[i]);
							}
						}
						if (otherButtons.length === 1) {
							otherButtons[0].style.left = '190px';
							otherButtons[0].style.width = '140px';
							otherButtons[0].style.top = '245px';
							otherButtons[0].style.position = 'absolute';

							btnVedi.style.left = '370px';
							btnVedi.style.width = '140px';
							btnVedi.style.top = '245px';
							btnVedi.style.position = 'absolute';
						} else if (otherButtons.length === 2) {
							btnVedi.style.left = '60px';
							btnVedi.style.width = '140px';
							btnVedi.style.fontSize = '11px';
							btnVedi.style.top = '245px';
							btnVedi.style.position = 'absolute';

							otherButtons[0].style.left = '280px';
							otherButtons[0].style.width = '140px';
							otherButtons[0].style.fontSize = '';
							otherButtons[0].style.top = '245px';
							otherButtons[0].style.position = 'absolute';

							otherButtons[1].style.left = '500px';
							otherButtons[1].style.width = '140px';
							otherButtons[1].style.fontSize = '11px';
							otherButtons[1].style.top = '245px';
							otherButtons[1].style.position = 'absolute';
						} else if (otherButtons.length === 3) {
							btnVedi.style.left = '30px';
							btnVedi.style.width = '130px';
							btnVedi.style.fontSize = '11px';
							btnVedi.style.top = '245px';
							btnVedi.style.position = 'absolute';

							otherButtons[0].style.left = '200px';
							otherButtons[0].style.width = '130px';
							otherButtons[0].style.fontSize = '11px';
							otherButtons[0].style.top = '245px';
							otherButtons[0].style.position = 'absolute';

							otherButtons[1].style.left = '370px';
							otherButtons[1].style.width = '130px';
							otherButtons[1].style.fontSize = '11px';
							otherButtons[1].style.top = '245px';
							otherButtons[1].style.position = 'absolute';

							otherButtons[2].style.left = '540px';
							otherButtons[2].style.width = '130px';
							otherButtons[2].style.fontSize = '10px';
							otherButtons[2].style.top = '245px';
							otherButtons[2].style.position = 'absolute';
						}

						setupAmazonFinishBanner(id, {
							applyModalTop: false,
							targetTop: targetTop,
							leftOffset: 0,
							bannerHeight: targetTop - 15,
							bannerTopOffset: targetTop - 5
						});
					}
				} catch (e) {
					console.error("Errore setup Amazon Finish Banner:", e);
				}
			}
		}
	},

	totalelim: function () {
		var el = $$.one("#testoallerta");
		if (el) el.innerHTML = t('new_limit') + "<input type='number' id='limiteinput' value=" + scala.totalelimite + "><br>";
		scala.mydialog("allerta", scala.limiteOK);
	},

	limiteOK: function () {
		var inputVal = parseInt(document.getElementById("limiteinput").value, 10);
		if (inputVal === 1303) {
			localStorage.setItem('ads_disabled', '1');
			scala.hidedialog();
			var called = false;
			var proceed = function () {
				if (called) return;
				called = true;
				alert("Annunci pubblicitari disabilitati!");
				location.reload();
			};
			if (typeof gtag === 'function') {
				gtag('event', 'ads_block_activated', {
					'event_category': 'Premium_Mode',
					'event_label': '1303',
					'transport_type': 'beacon',
					'event_callback': proceed
				});
				setTimeout(proceed, 1000);
			} else {
				proceed();
			}
			return;
		}
		if (inputVal === 1304) {
			localStorage.removeItem('ads_disabled');
			scala.hidedialog();
			var called = false;
			var proceed = function () {
				if (called) return;
				called = true;
				alert("Annunci pubblicitari abilitati.");
				location.reload();
			};
			if (typeof gtag === 'function') {
				gtag('event', 'ads_block_deactivated', {
					'event_category': 'Premium_Mode',
					'event_label': '1304',
					'transport_type': 'beacon',
					'event_callback': proceed
				});
				setTimeout(proceed, 1000);
			} else {
				proceed();
			}
			return;
		}

		var valore = document.getElementById("limiteinput").value;
		if (valore > 999) { scala.myalert(t('too_high')); return; }
		if (valore < 10) { scala.myalert(t('too_low')); return; }
		scala.totalelimite = valore;
		localStorage.setItem('scala40tris_totalelimite', valore);
		scala.hidedialog();
		scala.render();
	},

	/* Apre il pannello OPZIONI sincronizzando i controlli con lo stato
	   corrente. Bottone1 = NUOVA PARTITA (nuovo3), bottone2 = CHIUDI. */
	apriopzioni: function () {
		scala.salvaavversari = scala.numeroavversari;
		var radio = document.querySelector('input[name="avversari"][value="' + scala.numeroavversari + '"]');
		if (radio) radio.checked = true;
		var check = document.getElementById('optjollyimmediato');
		if (check) check.checked = scala.jollyimmediato;
		var check2 = document.getElementById('optscartoimmediato');
		if (check2) check2.checked = scala.scartoimmediato;
		var check3 = document.getElementById('optnonscartareattaccanti');
		if (check3) check3.checked = scala.nonscartareattaccanti;
		var check4 = document.getElementById('optunacartabasta');
		if (check4) check4.checked = scala.unacartabasta;
		var check5 = document.getElementById('optassosingolo');
		if (check5) check5.checked = scala.assosingolo;
		var check6 = document.getElementById('optescludiavversariesuperano');
		if (check6) check6.checked = scala.escludiavversariesuperano;
		scala.mydialog("formopzioni", scala.nuovo3);
	},

	nuovo3: function () {
		var checked = document.querySelector('input[name="avversari"]:checked');
		var tempavversari = checked ? checked.value : scala.salvaavversari;
		scala.azzeratotale();
		this.numeroavversari = tempavversari;
		localStorage.setItem('scala40tris_numeroavversari', tempavversari);
		scala.nuovo();
	},

	nuovo: function () {
		localStorage.setItem('scala40tris_stato', JSON.stringify({
			ta: this.totaleavversario1,
			tb: this.totaleavversario2,
			tc: this.totaleavversario3,
			tg: this.totalegiocatore,
			tl: this.totalelimite,
			tp: this.totalepartite,
			na: this.numeroavversari
		}));
		location.reload();
	},

	azzeratotale: function () {
		this.totaleavversario1 = 0;
		this.totaleavversario2 = 0;
		this.totaleavversario3 = 0;
		this.totalegiocatore = 0;
		this.totalepartite = 0;
		this.render();
	},

	cartadestro: function (divCard, ev) {
		if (this.pointerinelement(ev, "#giocatore")) {
			if (this.pescato) return this.scarta(divCard.card);
		}
	},

	muovicarta: function (sorgente, destinazione, toggle, messaggio) {
		var carta;
		var mesg = "" || messaggio;

		if (sorgente == scala.mazzo) {
			if (scala.mazzo.carte.length == 0) {
				var nscarti = scala.scarti.carte.length;
				for (var i = 0; i < nscarti; i++) {
					scala.muovicarta(scala.scarti, scala.mazzo, "faceDown", "nopush");
				}
			}
		}

		if (sorgente instanceof CardGroup) { carta = sorgente.pop(); }
		else {
			carta = sorgente;
			carta.gruppo.remove(carta);
		}

		if (toggle == "toggle") carta.faceUp = !carta.faceUp;
		if (toggle == "faceUp") carta.faceUp = true;
		if (toggle == "faceDown") carta.faceUp = false;
		destinazione.add(carta);
		if (messaggio != "nopush") scala.pushstato("muovicarta " + carta.shortName + " " + messaggio);
		return carta;
	},

	scartatrisgiocatore: function () {
		if (this.carteselezionate.length == this.giocatore.carte.length) scala.myalert(t('cannot_empty'));
		else this.scartatris(this.carteselezionate);
		this.render();

		return;
	},

	scartatris: function (tris) {
		var ncarte = tris.length;
		if (ncarte < 3) return;
		var gruppo = tris[0].gruppo.carte;
		var gruppotris;
		if (gruppo == this.giocatore.carte) gruppotris = this.trisgiocatore;
		if (gruppo == this.avversario1.carte) gruppotris = this.trisavversario1;
		if (gruppo == this.avversario2.carte) gruppotris = this.trisavversario2;
		if (gruppo == this.avversario3.carte) gruppotris = this.trisavversario3;

		var ntris = 0;
		if (gruppotris.carte.length != 0) ntris = gruppotris.carte[gruppotris.carte.length - 1].ntris + 1;

		var esito = this.analizzatris(tris);
		for (var i = 0; i < ncarte; i++) {
			var carta = tris[i];
			carta.ntris = ntris;
			carta.tipotris = esito.tipotris;
			$$.removeClass(carta.gui, "cardselected");
			carta.selected = false;
			if (carta.seme == "J") {
				if (carta.tipotris == SCALA) {
					carta.tipojolly = esito.semescala;
					carta.numerojolly = esito.primonumero + i;
					if (carta.numerojolly == 14) carta.numerojolly = 1;
				}
				else {
					carta.numerojolly = esito.primonumero;
					carta.tipojolly = esito.semidausare.pop();
					if (gruppotris == this.trisgiocatore) scala.jollymodificabili.push(carta);
				}
			}

			this.muovicarta(carta, gruppotris, "faceUp", "nopush");
		}
		suona(scartatris);
		this.pushstato("scartatris");

		this.carteselezionate = [];
		return;
	},

	/* Sposta un jolly ambiguo (jollyestremiswappabili) dall'estremo in cui si
	   trova all'altro estremo della propria scala, ricalcolando tipojolly/
	   numerojolly per l'intero blocco. Non è una mossa di gioco: nessun
	   pushstato, nessun suono di calata (coerente col ciclo seme dei jolly
	   di tris in jollymodificabili, che è anch'esso solo un ritocco). */
	swapestremojolly: function (carta) {
		var blocco = [], indiceiniziale = -1;
		for (var i = 0; i < this.trisgiocatore.carte.length; i++) {
			if (this.trisgiocatore.carte[i].ntris == carta.ntris) {
				if (indiceiniziale == -1) indiceiniziale = i;
				blocco.push(this.trisgiocatore.carte[i]);
			}
		}
		var pos = blocco.indexOf(carta);
		if (pos == 0) { blocco.splice(0, 1); blocco.push(carta); }
		else if (pos == blocco.length - 1) { blocco.splice(pos, 1); blocco.unshift(carta); }
		else return;

		var esito = this.analizzatris(blocco);
		if (!esito.valido) return;

		for (i = 0; i < blocco.length; i++) {
			var c = blocco[i];
			if (c.seme != "J") continue;
			c.tipojolly = esito.semescala;
			c.numerojolly = esito.primonumero + i;
			if (c.numerojolly == 14) c.numerojolly = 1;
		}

		for (i = 0; i < blocco.length; i++) this.trisgiocatore.carte[indiceiniziale + i] = blocco[i];

		this.render();
	},

	/* Banner "deposita": visibile quando la selezione corrente in mano
	   (fatta a click, indipendente dal drag) è già una combinazione valida
	   di 3+ carte. Stessa area del banner pesca, mai insieme perché
	   richiede pescato==true. Richiamata sia da render() sia subito dopo
	   ogni click di selezione (che non passa da un render completo). */
	aggiornabannerdeposita: function () {
		var bannerdep = $$.one("#bannerdeposita");
		if (!bannerdep) return;
		var mostradeposita = (this.turno == -1) && this.pescato && (!this.fmodale)
			&& (this.carteselezionate.length >= 3)
			&& this.analizzatris(this.carteselezionate).valido;
		if (mostradeposita) $$.show(bannerdep); else $$.hide(bannerdep);
	},

	/* Centra un banner (240px) sotto il blocco di carte indicato, leggendo
	   la posizione dal modello (carta.left/.top, aggiornati sincronamente
	   da moveTo) e non dallo style DOM: quest'ultimo può essere ancora a
	   metà di un'animazione (animateEl) subito dopo un render(), dando una
	   posizione stantia per il banner. */
	posizionabanner: function (banner, blocco) {
		var minleft = Infinity, maxright = -Infinity, top = 0;
		for (var i = 0; i < blocco.length; i++) {
			var c = blocco[i];
			var left = c.left || 0;
			if (left < minleft) minleft = left;
			if (left + CARTAW > maxright) maxright = left + CARTAW;
			top = c.top || top;
		}
		var centro = (minleft + maxright) / 2;
		var bannerwidth = 240;
		banner.style.left = Math.round(centro - bannerwidth / 2) + "px";
		banner.style.top = Math.round(top + CARTAH + 4) + "px";
	},

	/* Banner "clicca sul jolly per spostarlo/cambiare seme": visibili solo
	   DOPO che il tris/scala con jolly ambiguo è stato depositato sul
	   tavolo (non durante la selezione in mano, a differenza di
	   bannerdeposita). Riposizionati dinamicamente centrati sotto il
	   blocco tris interessato. Le due ambiguità (estremità di scala in
	   jollyestremiswappabili, seme di tris in jollymodificabili) sono
	   indipendenti ma condividono la classe .jollypending sui jolly del
	   tris giocatore, quindi la puliscono/applicano insieme qui. */
	aggiornabannermovejolly: function () {
		/* La classe .jollypending va tenuta allineata agli array anche
		   quando questa funzione viene chiamata fuori da un render()
		   completo (es. dal click di selezione carte in scalamouseup),
		   altrimenti resta appiccicata al jolly di un tris precedente
		   finché non arriva il prossimo render(). */
		for (var s = 0; s < this.trisgiocatore.carte.length; s++) {
			var cartatris = this.trisgiocatore.carte[s];
			if (cartatris.seme != "J") continue;
			if ((this.jollyestremiswappabili.indexOf(cartatris) == -1) &&
				(this.jollymodificabili.indexOf(cartatris) == -1)) {
				$$.removeClass(cartatris.gui, "jollypending");
			}
		}
		for (var s = 0; s < this.jollyestremiswappabili.length; s++) {
			$$.addClass(this.jollyestremiswappabili[s].gui, "jollypending");
		}
		for (var s = 0; s < this.jollymodificabili.length; s++) {
			$$.addClass(this.jollymodificabili[s].gui, "jollypending");
		}

		var bannermj = $$.one("#bannermovejolly");
		if (bannermj) {
			var blocco1 = this.jollyestremiswappabili.length ?
				this.trisgiocatore.carte.filter(function (c) { return c.ntris == scala.jollyestremiswappabili[0].ntris; }) : [];
			if (blocco1.length == 0) $$.hide(bannermj);
			else { this.posizionabanner(bannermj, blocco1); $$.show(bannermj); }
		}

		var bannercs = $$.one("#bannerchangesuit");
		if (bannercs) {
			var blocco2 = this.jollymodificabili.length ?
				this.trisgiocatore.carte.filter(function (c) { return c.ntris == scala.jollymodificabili[0].ntris; }) : [];
			if (blocco2.length == 0) $$.hide(bannercs);
			else { this.posizionabanner(bannercs, blocco2); $$.show(bannercs); }
		}
	},

	render: function () {

		if ((scala.dopo) && ((scala.turno != -1) && scala.astato == TurnState.NEXTAVV)) return;

		if (this.cartescoperte) this.displaypunti(this.calcolapunti(this.avversario1.carte), "avversario1");
		else this.displaypunti(0, "puntiavversario1");
		this.displaypunti(this.calcolapuntitris(this.trisavversario1.carte), "trisavversario1");

		if (this.numeroavversari > 1) {
			if (this.cartescoperte) this.displaypunti(this.calcolapunti(this.avversario2.carte), "avversario2");
			else this.displaypunti(0, "puntiavversario2");
			this.displaypunti(this.calcolapuntitris(this.trisavversario2.carte), "trisavversario2");
		}

		if (this.numeroavversari > 2) {
			if (this.cartescoperte) this.displaypunti(this.calcolapunti(this.avversario3.carte), "avversario3");
			else this.displaypunti(0, "puntiavversario3");
			this.displaypunti(this.calcolapuntitris(this.trisavversario3.carte), "trisavversario3");
		}

		this.displaypunti(this.calcolapunti(this.giocatore.carte), "giocatore");
		this.displaypunti(this.calcolapuntitris(this.trisgiocatore.carte), "trisgiocatore");
		this.displaypunti(this.totaleavversario1, "totaleavversario1");
		if (this.numeroavversari > 1) this.displaypunti(this.totaleavversario2, "totaleavversario2");
		if (this.numeroavversari > 2) this.displaypunti(this.totaleavversario3, "totaleavversario3");
		this.displaypunti(this.totalegiocatore, "totalegiocatore");
		this.displaypunti(this.totalelimite, "totalelimite");
		this.displaypunti(this.totalepartite, "totalepartite");

		/* Etichetta FUORI: un avversario escluso (vedi avvescluso()) resta
		   visibile ma segnalato come uscito dal gioco. */
		for (var jf = 0; jf < this.numeroavversari; jf++) {
			if (this.avvescluso(jf)) $$.show("#fuoritrisavversario" + (jf + 1));
			else $$.hide("#fuoritrisavversario" + (jf + 1));
		}

		this.rendicontenitore(this.mazzo);
		this.rendicontenitore(this.scarti);
		this.rendicontenitore(this.giocatore);
		/* Rete di sicurezza: le carte calate in tavola devono essere sempre
		   scoperte. Qualche percorso di aggancio (in particolare lo scambio
		   jolly, che copia faceUp dalla carta uscente invece di forzarlo)
		   può in teoria lasciare faceUp=false su una carta di un blocco;
		   forzarlo qui ad ogni render evita che resti visivamente a dorso
		   coperto, indipendentemente dalla causa. */
		this.scoprigruppo(this.trisgiocatore);
		this.rendicontenitore(this.trisgiocatore);

		for (var j = 0; j < this.numeroavversari; j++) {
			this.rendicontenitore(this.campiavversario[j]);
			this.scoprigruppo(this.campitrisavversario[j]);
			this.rendicontenitore(this.campitrisavversario[j]);
		}

		/* Regola jolly immediato: il jolly recuperato pulsa finché resta in
		   mano al giocatore; appena viene giocato (o l'undo lo restituisce
		   al tavolo) evidenziazione e vincolo decadono. */
		if (this.jollydarigiocare) {
			if (this.jollydarigiocare.gruppo === this.giocatore) $$.addClass(this.jollydarigiocare.gui, "jollypending");
			else {
				$$.removeClass(this.jollydarigiocare.gui, "jollypending");
				this.jollydarigiocare = null;
			}
		}

		/* Regola scarto immediato: stessa meccanica per la carta pescata
		   dagli scarti. */
		if (this.cartascartidagiocare) {
			if (this.cartascartidagiocare.gruppo === this.giocatore) $$.addClass(this.cartascartidagiocare.gui, "jollypending");
			else {
				$$.removeClass(this.cartascartidagiocare.gui, "jollypending");
				this.cartascartidagiocare = null;
			}
		}

		/* Banner "pesca una carta": visibile solo quando tocca al giocatore,
		   non ha ancora pescato e non ci sono transizioni in corso. */
		var banner = $$.one("#bannerpesca");
		if (banner) {
			var mostrabanner = (this.turno == -1) && (!this.pescato) && (!this.cartescoperte)
				&& (!this.distribuendo) && (!this.iaimminente) && (!this.fmodale);
			if (mostrabanner) $$.show(banner); else $$.hide(banner);
		}

		this.aggiornabannerdeposita();
		this.aggiornabannermovejolly();

		/* Indicazione del turno: bordo giallo sulla fascia del giocatore di
		   turno (un solo contenitore per fascia: mano + tris). */
		var colore = (this.turno == -1) ? "yellow" : "#888888";
		$$.css($$.one("#giocatore"), { "border-color": colore });
		for (var j = 0; j < this.numeroavversari; j++) {
			colore = (j == this.turno) ? "yellow" : "#888888";
			$$.css($$.one("#avversario" + (j + 1)), { "border-color": colore });
		}
	},

	rendicontenitore: function (cont, speed) {
		var velocita = speed || 400;
		for (var i = 0; i < cont.carte.length; i++) {
			var carta = cont.carte[i];
			/* La carta in trascinamento segue il mouse: i render intermedi
			   (es. i frame del replay IA) non devono strapparla dal cursore. */
			if (this.scaladown && this.cartadown && (this.cartadown.card === carta)) continue;
			var pos = cont.posizione(i, carta);
			carta.moveTo(pos.top, pos.left, i, velocita);
			this.showcard(carta);
		}
	},

	/* Forza faceUp=true su tutte le carte di un gruppo (usata per i blocchi
	   in tavola prima del render, vedi commento in render()). */
	scoprigruppo: function (cont) {
		for (var i = 0; i < cont.carte.length; i++) cont.carte[i].faceUp = true;
	},

	cartapesca: function () {

		if (this.turno != -1) return;
		if (this.iaimminente || this.distribuendo) return;
		this.fscartipesca = false;
		this.jollyestremiswappabili = [];
		this.jollymodificabili = [];

		if (scala.statostack.length == 0) this.pushstato("iniziale");
		this.pescato = true;
		this.muovicarta(this.mazzo, this.giocatore, "faceUp", "cartapesca");
		pesca.play();

		this.render();
		return;
	},

	scartipesca: function () {
		if (this.turno != -1) return;
		if (this.iaimminente || this.distribuendo) return;
		if (scala.statostack.length == 0) this.pushstato("iniziale");
		if (this.pescato) {
			if (this.carteselezionate.length == 1) {
				this.scarta(this.carteselezionate.pop());
			}
			return;
		}

		if (!this.f40giocatore) {
			if (!this.fscartiprima40) { scala.myalert("gioco non ancora aperto"); return; }
		}
		this.fscartipesca = true;
		this.pescato = true;
		dascarti.play();
		var presa = this.muovicarta(this.scarti, this.giocatore, "faceUp", "scartipesca");

		/* Regola opzionale: la carta pescata dagli scarti va giocata nello
		   stesso turno (render la evidenzia, scarta lo pretende). */
		if (this.scartoimmediato) this.cartascartidagiocare = presa;

		this.render();
		return;
	},

	selezionacartagiocatore: function (divCard) {

		if (divCard.card.selected) {
			this.deselezionacarta(divCard);
			return;
		}
		switch (this.carteselezionate.length) {

			case 0:
				/* Nuova selezione = nuova mossa: l'evidenziazione di un
				   eventuale jolly ambiguo depositato in precedenza non è
				   più pertinente (spec: sparisce alla prima operazione
				   successiva qualsiasi). */
				this.jollyestremiswappabili = [];
				this.jollymodificabili = [];
				this.selezionacarta(divCard);
				break;

			case 1:
				if (this.check1(divCard)) this.selezionacarta(divCard);
				break;

			default:
				this.selezionacarta(divCard);

				this.ordinaperzindex(this.carteselezionate);
				var giavalida = this.analizzatris(this.carteselezionate).valido;

				/* Prova comunque il riordino canonico: se l'ordine di click
				   non era quello di una scala valida lo adotta (le carte
				   potrebbero essere state scelte fuori sequenza); se lo era
				   già, serve comunque a rilevare un jolly ambiguo a un
				   estremo (es. jolly-7-8: valido così com'è, ma il jolly
				   potrebbe stare anche dall'altra parte). */
				var smart = this.ordinascalasmart(this.carteselezionate);
				if (smart && this.analizzatris(smart.ordinata).valido) {
					if (!giavalida) this.carteselezionate = smart.ordinata;
					this.jollyestremiswappabili = smart.swappabili;
					break;
				}

				if (giavalida) break;

				this.deselezionacarta(divCard);
				break;
		}
	},

	check1: function (divCard) {
		var k = this.carteselezionate[0];
		var n = divCard.card;
		/* Due jolly di seguito: la validità reale (minimo di carte reali nel
		   blocco) si decide solo con analizzatris alla terza carta, qui si
		   lascia proseguire la selezione. */
		if (k.seme == "J") return true;
		if (n.seme == "J") return true;
		/* Stesso seme, rank diverso: potenziale scala anche fuori ordine di
		   click (es. clic sulla carta più bassa e poi la più alta, saltando
		   quella di mezzo) — la validazione vera arriva con analizzatris/
		   ordinascalasmart appena la selezione raggiunge 3 carte. */
		if ((n.seme == k.seme) && (n.numero != k.numero)) return true;
		if (n.numero == k.numero) return true;
		return false;
	},

	/* Analisi PURA di una combinazione: non ordina l'input, non modifica le
	   carte, non scrive stato condiviso. Restituisce un oggetto esito con
	   tutte le informazioni sulla combinazione (l'ex scala.trisdata):
	   { valido, tipotris, primonumero, semescala, semidausare, jollycontenuti }.
	   L'array in ingresso deve già essere nell'ordine della combinazione
	   (usare ordinaperzindex per la selezione del giocatore). */
	analizzatris: function (carte) {

		var esito = {
			valido: false,
			tipotris: 0,
			primonumero: 0,
			semescala: 0,
			semidausare: [],
			jollycontenuti: []
		};

		var ncarte = carte.length;
		if (ncarte < 3) return esito;
		if (ncarte > 13) return esito;

		var semidausare = { "C": true, "Q": true, "F": true, "P": true };

		var primonumero = 100;
		var numerojolly = 0;

		var trovatotris = true;
		var i;
		if (ncarte < 5) {
			for (i = 0; i < ncarte; i++) {
				if (carte[i].numero > 49) {
					numerojolly++;
					esito.jollycontenuti.push(carte[i]);
					continue;
				}
				if (primonumero > 49) primonumero = carte[i].numero;
				if (carte[i].numero != primonumero) { trovatotris = false; break; }
				if (!semidausare[carte[i].seme]) { trovatotris = false; break; }
				semidausare[carte[i].seme] = false;
			}
			/* Regola opzionale "una carta reale basta" (ex duejolly, ora
			   uniformata a tris e scala): con l'opzione attiva (default)
			   basta 1 sola carta reale nel blocco; disattivata, ne servono
			   almeno 2. */
			var minimocarte = this.unacartabasta ? 1 : 2;
			if ((trovatotris) && ((ncarte - numerojolly) >= minimocarte)) {
				esito.valido = true;
				esito.tipotris = TRIS;
				esito.primonumero = primonumero;
				for (var member in semidausare) { if (semidausare[member]) esito.semidausare.push(member); }
				return esito;
			}
		}

		var primonumero2 = carte[0].numero + 1;
		var primoseme = carte[0].seme;
		var oltrekappa = false;
		var numerojolly2 = 0;
		esito.jollycontenuti = [];

		trovatotris = true;
		for (i = 1; i < ncarte; i++, primonumero2++) {
			if (oltrekappa && (primonumero2 == 2)) { trovatotris = false; break; }
			if (primonumero2 == 14) { primonumero2 = 1, oltrekappa = true; }
			if (carte[i].numero > 49) {
				numerojolly2++;
				esito.jollycontenuti.push(carte[i]);
				continue;
			}
			if (primonumero2 > 49) {
				primonumero2 = carte[i].numero; primoseme = carte[i].seme;
				numerojolly2++;
				esito.jollycontenuti.splice(0, 0, carte[i]);
			}
			if (carte[i].numero != primonumero2) { trovatotris = false; break; }
			if (carte[i].seme != primoseme) { trovatotris = false; break; }
			if (primonumero2 == 13) { primonumero2 = 0, oltrekappa = true; }
		}
		/* Stessa regola opzionale "una carta reale basta" applicata alla
		   scala (prima non c'era alcun limite qui). numerojolly2 non conta
		   carte[0] (il ciclo parte da i=1): va sommato a parte. */
		var numerojollytotale = numerojolly2 + ((carte[0].numero > 49) ? 1 : 0);
		var minimocartescala = this.unacartabasta ? 1 : 2;
		if (trovatotris && ((ncarte - numerojollytotale) < minimocartescala)) trovatotris = false;
		if (trovatotris) {
			if (primonumero2 < 3) primonumero2 += 13;
			esito.valido = true;
			esito.tipotris = SCALA;
			esito.primonumero = primonumero2 - i;
			esito.semescala = primoseme;
		}
		return esito;
	},

	/* Ordina un array di carte per zindex (l'ordine visivo della selezione).
	   Prima era un side-effect nascosto di checktris. */
	ordinaperzindex: function (carte) {
		carte.sort(function (a, b) {
			if (a.zindex > b.zindex) return 1;
			if (a.zindex < b.zindex) return -1;
			return 0;
		});
	},

	/* Riordino "smart" per una selezione che potrebbe essere una scala presa
	   fuori ordine (click in un ordine qualsiasi): separa le carte reali dai
	   jolly, verifica che le carte reali condividano lo stesso seme e siano
	   tutte di rank diverso, poi le dispone in ordine di rank e riempie i
	   buchi interni con i jolly disponibili. I jolly avanzati (nessun buco
	   interno da riempire) vanno posizionati a un estremo: se la scelta
	   dell'estremo è libera (entrambe le disposizioni sarebbero valide),
	   sceglie di default l'estremo più basso e restituisce quei jolly come
	   "ambigui" (swappabili con un click, vedi jollyestremiswappabili).
	   Ritorna null se la selezione non ha la forma di una scala (semi misti,
	   rank duplicati, buchi più larghi dei jolly disponibili): in quel caso
	   la selezione resta quella cliccata dal giocatore, così com'è (utile
	   per i tris, dove l'ordine non conta già di suo). */
	ordinascalasmart: function (carte) {
		var i;
		var reali = [], jolly = [];
		for (i = 0; i < carte.length; i++) {
			if (carte[i].seme == "J") jolly.push(carte[i]); else reali.push(carte[i]);
		}
		if (reali.length < 1) return null;

		var seme = reali[0].seme;
		for (i = 1; i < reali.length; i++) if (reali[i].seme != seme) return null;

		/* L'asso può stare in fondo alla scala (basso, valore 1) o in cima
		   (alto, dopo il K): un semplice sort per numero mette sempre l'asso
		   in testa, il che spezza selezioni tipo Q-K-asso in buchi enormi
		   (12..1) invece di riconoscerle come asso-alto. Se tra le carte
		   reali c'è un asso e almeno una carta "alta" (>=10, J/Q/K), si
		   prova anche l'ordinamento con l'asso trattato come 14; si sceglie
		   quello che risulta in una scala valida (o con meno buchi da jolly
		   se entrambi lo sono), altrimenti si ricade sull'asso basso. */
		var haasso = false, haaltra10piu = false;
		for (i = 0; i < reali.length; i++) {
			if (reali[i].numero == 1) haasso = true;
			else if (reali[i].numero >= 10) haaltra10piu = true;
		}
		var provaOrdine = function (assoAlto) {
			var copia = reali.slice();
			copia.sort(function (a, b) {
				var na = (assoAlto && a.numero == 1) ? 14 : a.numero;
				var nb = (assoAlto && b.numero == 1) ? 14 : b.numero;
				return na - nb;
			});
			return copia;
		};
		reali = provaOrdine(false);
		for (i = 1; i < reali.length; i++) if (reali[i].numero == reali[i - 1].numero) return null;

		/* Valore ai soli fini del calcolo dei buchi: l'asso vale 1 se è il
		   primo dell'array (basso), 14 se è l'ultimo (alto) — la carta resta
		   la stessa istanza con numero reale 1, gestita da analizzatris
		   tramite il suo wraparound K/A. */
		var valorebuco = function (arr, indice) {
			var carta = arr[indice];
			if ((carta.numero == 1) && (indice == arr.length - 1) && (indice > 0)) return 14;
			return carta.numero;
		};
		var contabuchi = function (arr) {
			var tot = 0;
			for (var j = 1; j < arr.length; j++) tot += valorebuco(arr, j) - valorebuco(arr, j - 1) - 1;
			return tot;
		};

		if (haasso && haaltra10piu) {
			var realiAltoTest = provaOrdine(true);
			if (contabuchi(realiAltoTest) < contabuchi(reali)) reali = realiAltoTest;
		}

		/* Riempie i buchi tra carte reali consecutive con i jolly disponibili
		   (consumati dall'array jolly, ordine indifferente tra loro). */
		var ordinata = [reali[0]];
		var usati = 0;
		for (i = 1; i < reali.length; i++) {
			var buco = valorebuco(reali, i) - valorebuco(reali, i - 1) - 1;
			if (buco > jolly.length - usati) return null;
			for (var k = 0; k < buco; k++) ordinata.push(jolly[usati++]);
			ordinata.push(reali[i]);
		}

		var avanzati = jolly.length - usati;
		var swappabili = [];
		for (k = 0; k < avanzati; k++) {
			var j = jolly[usati++];
			/* Prova la disposizione in coda (estremo alto): se anche quella
			   è una scala valida secondo analizzatris, l'estremo è ambiguo. */
			var provacoda = ordinata.concat([j]);
			var provatesta = [j].concat(ordinata);
			var validacoda = this.analizzatris(provacoda).valido;
			var validatesta = this.analizzatris(provatesta).valido;
			if (validacoda && validatesta) swappabili.push(j);
			/* Default: estremo più basso (testa) se disponibile e valido,
			   altrimenti coda. */
			if (validatesta) ordinata = provatesta; else ordinata = provacoda;
		}

		return { ordinata: ordinata, swappabili: swappabili };
	},

	selezionacarta: function (divCard) {
		$$.addClass(divCard, "cardselected");
		this.carteselezionate.push(divCard.card);
		divCard.card.selected = true;
	},

	deselezionacarta: function (divCard) {
		$$.removeClass(divCard, "cardselected");
		var a = this.carteselezionate.indexOf(divCard.card);
		this.carteselezionate.splice(a, 1);

		divCard.card.selected = false;
	},

	showcard: function (carta) {

		var backx, backy, stepx = -CARTAW, stepy = -CARTAH;
		var bsx = Math.round(CARTAW * 1233 / 71), bsy = CARTAH * 4;
		if ((carta.faceUp == true) || (this.cartescoperte)) {
			if (carta.numero < 50) {
				backx = stepx * (carta.numero - 1);
				backy = stepy * (valoreseme[carta.seme]);
			}
			else {
				if (carta.tipojolly == "J") {
					backx = stepx * 13;
					backy = stepy * (carta.numero - 50);
				}
				else {
					backx = stepx * (14 + carta.numero - 50);
					backy = stepy * (valoreseme[carta.tipojolly]);
				}
			}
		}
		else {
			backx = stepx * 16;
			backy = stepy * carta.retro;
		}
		$$.css(carta.gui, { "background-position": (backx + "px " + backy + "px "), "background-size": (bsx + "px " + bsy + "px "), "width": -stepx, "height": -stepy });
		return;
	},

	pointerinelement: function (ev, element) {
		var el = $$.one(element);
		var minx, maxx, miny, maxy;
		minx = $$.getCssInt(el, "left");
		maxx = minx + $$.getCssInt(el, "width");
		miny = $$.getCssInt(el, "top");
		maxy = miny + $$.getCssInt(el, "height");
		if (((ev.pageX - scala.offsetxx) / window.gameScale) < minx) return false;
		if (((ev.pageX - scala.offsetxx) / window.gameScale) > maxx) return false;
		if (((ev.pageY - scala.offsetyy) / window.gameScale < miny)) return false;
		if (((ev.pageY - scala.offsetyy) / window.gameScale > maxy)) return false;
		return true;
	},

	/* Evidenziazione della fascia durante il trascinamento: arancione quando
	   il rilascio in questo punto produrrebbe un attacco valido, per
	   distinguerla dal giallo che indica il turno. Allo spegnimento si
	   ripristina il colore coerente con il turno corrente. */
	tgon: function (ev) {
		$$.css($$.one("#giocatore"), { "border-color": "orange" });
	},
	tgoff: function (ev) {
		$$.css($$.one("#giocatore"), { "border-color": (scala.turno == -1) ? "yellow" : "#888888" });
	},

	taon: function (avv) {
		$$.css($$.one("#avversario" + (avv + 1)), { "border-color": "orange" });
	},
	taoff: function (avv) {
		$$.css($$.one("#avversario" + (avv + 1)), { "border-color": (avv == scala.turno) ? "yellow" : "#888888" });
	},

	aggiornapunti: function (carta) {
		carta.punteggio = carta.puntitris + carta.punticoppia + carta.puntiattacca + carta.puntijollyrecuperabile;
	},

	calcolatrispossibili: function (avv) {

		var mtest = scala.campiavversario[avv].carte;
		var i, j;
		var temporaneo1 = [];
		var temporaneo2 = [];
		var semidausare = { "C": true, "Q": true, "F": true, "P": true };

		this.trispossibili = [];

		for (i = 0; i < mtest.length; i++) {
			mtest[i].puntiattacca = 0;
			scala.aggiornapunti(mtest[i]);
		}

		for (i = 1; i < 14; i++) {
			temporaneo1 = [];
			temporaneo2 = [];
			for (var xseme in semidausare) semidausare[xseme] = true;
			for (j = 0; j < mtest.length; j++) {
				if (mtest[j].numero == i) {
					if (semidausare[mtest[j].seme]) {
						semidausare[mtest[j].seme] = false;
						temporaneo1.push(mtest[j]);
					}
					else { temporaneo2.push(mtest[j]); }
				}
			}
			if (temporaneo1.length > 2) this.trispossibili.push(temporaneo1);
			if (temporaneo2.length > 2) this.trispossibili.push(temporaneo2);
		}

		this.ordinascale(this.campiavversario[avv]);

		temporaneo1 = [];
		temporaneo2 = [];
		var assi = { "C": [], "Q": [], "F": [], "P": [] };
		var contscala1 = 0, contscala2 = 0, numscala1 = 0, numscala2 = 0, shortprec = 0, seme1 = 0, seme2 = 0;
		for (i = 0; i < mtest.length; i++) {
			if (mtest[i].numero == 1) assi[mtest[i].seme].push(mtest[i]);
			if (mtest[i].shortName != shortprec) {
				shortprec = mtest[i].shortName;
				if ((contscala1 > 0) && (mtest[i].numero == numscala1 + 1) && (mtest[i].seme == seme1)) {
					contscala1++; numscala1++;
					temporaneo1.push(mtest[i]);
				}
				else {
					if ((numscala1 == 13) && (contscala1 >= 2) && (assi[seme1].length > 0)) {
						temporaneo1.push(assi[seme1][0]);
						contscala1++;
					}
					if (contscala1 >= 3) this.trispossibili.push(temporaneo1);
					temporaneo1 = []; contscala1 = 1;
					seme1 = mtest[i].seme;
					numscala1 = mtest[i].numero;
					temporaneo1.push(mtest[i]);
				}
			}
			else {
				if ((contscala2 > 0) && (mtest[i].numero == numscala2 + 1) && (mtest[i].seme == seme2)) {
					contscala2++; numscala2++;
					temporaneo2.push(mtest[i]);
				}
				else {
					if ((numscala2 == 13) && (contscala2 >= 2) && (assi[seme2].length > 1)) { temporaneo2.push(assi[seme2][1]); contscala2++; }
					if (contscala2 >= 3) this.trispossibili.push(temporaneo2);
					temporaneo2 = []; contscala2 = 1;
					seme2 = mtest[i].seme;
					numscala2 = mtest[i].numero;
					temporaneo2.push(mtest[i]);
				}
			}
		}
		if ((numscala1 == 13) && (contscala1 >= 2) && (assi[seme1].length > 0)) {
			temporaneo1.push(assi[seme1][0]);
			contscala1++;
		}
		if (contscala1 >= 3) this.trispossibili.push(temporaneo1);
		if ((numscala2 == 13) && (contscala2 >= 2) && (assi[seme2].length > 1)) { temporaneo2.push(assi[seme2][1]); contscala2++; }
		if (contscala2 >= 3) this.trispossibili.push(temporaneo2);

		for (i = 0; i < this.trispossibili.length; i++) {
			for (j = 0; j < this.trispossibili[i].length; j++) {
				this.trispossibili[i][j].intris++;
				this.trispossibili[i][j].puntitris += PUNTITRIS;
				this.aggiornapunti(this.trispossibili[i][j]);
			}
		}

		var stris = "tris:";
		for (i = 0; i < this.trispossibili.length; i++) {
			stris += (" #TRIS" + i + " (" + this.calcolapuntitris(this.trispossibili[i]) + ") : ");
			for (j = 0; j < this.trispossibili[i].length; j++) {
				stris += (this.trispossibili[i][j].shortName + ", ");
			}
		}
		log(stris);
	},

	ottimizzatris: function (option) {
		this.ordinatris(this.trispossibili);
		var nmultipli, puntamultiplo, trovato;
		if (this.trispossibili.length == 0) return;
		for (var i = 0; i < this.trispossibili.length; i++) {
			nmultipli = 0;
			for (var j = 0; j < this.trispossibili[i].length; j++) {
				if (this.trispossibili[i][j].intris > 1) { nmultipli += (this.trispossibili[i][j].intris - 1); puntamultiplo = j; }
			}
			if (nmultipli == 0) continue;
			if (nmultipli > 1) { this.eliminatris(i); i = -1; continue; }
			trovato = false;
			for (var w = i + 1; w < this.trispossibili.length; w++) {
				for (var z = 0; z < this.trispossibili[w].length; z++) {
					if (this.trispossibili[w][z].id == this.trispossibili[i][puntamultiplo].id) { trovato = true; break; }
				}
				if (trovato) break;
			}

			var checkscala = function (tris, indice) {
				if (scala.analizzatris(tris).tipotris == TRIS) return false;
				if (indice > 2) {
					for (var h = indice; h < tris.length; h++) {
						var carta = tris[h];
						carta.intris--;
						carta.puntitris -= PUNTITRIS;
						scala.aggiornapunti(carta);
					}
					tris.splice(indice, tris.length - indice);
					return true;
				}
				if ((tris.length - indice - 1) > 3) {
					for (var h = 0; h <= indice; h++) {
						var carta = tris[h];
						carta.intris--;
						carta.puntitris -= PUNTITRIS;
						scala.aggiornapunti(carta);
					}
					tris.splice(0, indice + 1);
					return true;
				}
			};

			if (checkscala(scala.trispossibili[i], puntamultiplo) || checkscala(scala.trispossibili[w], z)) { i = -1; continue; }

			if (option == "valore") {
			}
			else {
				if (this.calcolapuntitris(this.trispossibili[i]) >= this.calcolapuntitris(this.trispossibili[w])) this.eliminatris(w);
				else this.eliminatris(i);
				i = -1;
			}
		}
		var stris = "ottimitris:";
		for (i = 0; i < this.trispossibili.length; i++) {
			stris += (" #TRIS" + i + " (" + this.calcolapuntitris(this.trispossibili[i]) + ") : ");
			for (j = 0; j < this.trispossibili[i].length; j++) {
				stris += (this.trispossibili[i][j].shortName + ", ");
			}
		}
		log(stris);
	},

	eliminatris: function (ntris) {
		var carta;
		for (var k = 0; k < this.trispossibili[ntris].length; k++) {
			carta = this.trispossibili[ntris][k];
			carta.intris--;
			carta.puntitris -= PUNTITRIS;
			this.aggiornapunti(carta);
		}
		this.trispossibili.splice(ntris, 1);
	},

	multiundo: function () {
		if (this.pescato) { this.popstato(); this.popstato(-1, true); }
		else {
			while ((!this.pescato) && (scala.statostack.length > 0)) {
				this.popstato();
			}
		}
		if (scala.astato == TurnState.PLAYRENDER) {
			scala.astato = TurnState.ABORTITO;
			scala.turno = -1;
		}
		scala.iaimminente = false;
		scala.jollymodificabili = [];
		scala.jollyestremiswappabili = [];
		this.render();
	},

	undo: function () {
		this.jollymodificabili = [];
		this.jollyestremiswappabili = [];
		this.popstato();
		this.render();
	},

	/* Avvia il turno IA dall'avversario indicato (0 = avversario1). */
	mossaavversario: function (start) {
		scala.iaimminente = false;
		scala.avvinizio = start || 0;
		scala.astato = TurnState.INIZIO;
		return scala.alavorastato();
	},

	alavorastato: function () {
		scala.ritardo = 1000;
		var avv = scala.turno;

		switch (scala.astato) {

			case TurnState.INIZIO:
				scala.turno = scala.avvinizio || 0;
				avv = scala.turno;
				scala.astato = TurnState.NEXTAVV;

			case TurnState.NEXTAVV:

				/* Avversari esclusi (limite superato, opzione attiva): niente
				   turno, si passa oltre senza toccare lo stack né chiudere la
				   mano (a differenza di carte.length==0, che significa invece
				   "sceso, mano finita"). */
				while ((avv < scala.numeroavversari) && scala.avvescluso(avv)) {
					avv++;
					scala.turno = avv;
				}
				if (avv >= scala.numeroavversari) { scala.turno = -1; scala.render(); return; }

				/* A inizio mano (quando parte un avversario) lo stack è vuoto:
				   si salva lo stato iniziale, come fa la pesca del giocatore,
				   così il replay animato parte dal punto giusto. */
				if (scala.statostack.length == 0) scala.pushstato("iniziale");
				scala.avvsalvalog = scala.statostack.length;
				if (scala.campiavversario[avv].carte.length == 0) { scala.astato = TurnState.FINETURNO; break; }
				scala.apesca(avv);
				scala.alavora(avv);
				scala.ascarta(avv);
				if (scala.dopo) {
					scala.ritardo = 10;
					scala.astato = TurnState.PLAYRENDER;
					break;
				}
				scala.astato = TurnState.FINETURNO;
				break;

			case TurnState.PLAYRENDER:
				if (scala.avvsalvalog < scala.statostack.length) {
					scala.popstato(scala.avvsalvalog);
					scala.avvsalvalog++;
					if (scala.salvasuono != 0) scala.salvasuono.play();
					scala.render();

					scala.salvasuono = 0;
					scala.ritardo = 1000;
					break;
				}
				else {
					scala.astato = TurnState.FINETURNO;
				}

			case TurnState.FINETURNO:

				var finito = false;
				if (scala.campiavversario[avv].carte.length == 0) {
					finito = true;
					scala.cartescoperte = true;

					var salvapunti = scala.totalegiocatore;

					var vintotorneo = scala.calcolatotali();
					scala.render();

					$$.css($$.one("#puntigiocatore"), { "z-index": "40000" });
					$$.hide("#puntitrisgiocatore");
					for (var j = 0; j < scala.numeroavversari; j++) {
						$$.show("#puntiavversario" + (j + 1));
						$$.css($$.one("#puntiavversario" + (j + 1)), { "z-index": "40000" });
						$$.hide("#puntitrisavversario" + (j + 1));
					}

					if ((scala.totalegiocatore >= scala.totalelimite) && (salvapunti < scala.totalelimite)) {
						var suonotorneo = (localStorage.getItem('scala40tris_audiotorneo') === 'thunder') ? thunder : lacrimosa;
						suonotorneo.currentTime = 0;
						suonotorneo.play().catch(function () { });
						scala.mydialog("haipersotorneo", function () { scala.azzeratotale(); scala.nuovo(); }, scala.nuovo);
						return;
					}
					else {
						if (vintotorneo) {
							applause.play();
							scala.mydialog("haivintotorneo", function () { scala.azzeratotale(); scala.nuovo(); }, scala.nuovo);
							return;
						}
						else {
							haiperso.play();
							scala.mydialog("haiperso", scala.nuovo);
						}
						return;
					}
				}

				if ((!finito) && (avv < (scala.numeroavversari - 1))) {
					scala.astato = TurnState.NEXTAVV;
					scala.turno++;
					scala.ritardo = 10;
					break;
				}
				else {
					scala.turno = -1;
					scala.render();
					return;
				}

			case TurnState.ABORTITO:
				scala.turno = -1;
				return;

		}
		window.setTimeout(scala.alavorastato, scala.ritardo);
		return;
	},

	calcolapunti: function (gruppo) {
		var punti = 0, valore;
		/* Regola opzionale "asso singolo": se l'asso è l'unica carta
		   rimasta in mano a fine smazzata, vale 1 punto anziché 11
		   (variante diffusa, non FISCA: l'asso da solo vale sempre 11). */
		if (this.assosingolo && (gruppo.length == 1) && (gruppo[0].numero == 1)) return 1;
		for (var i = 0; i < gruppo.length; i++) {
			valore = gruppo[i].numero;
			if (valore == 1) { punti += 11; continue; }
			if (valore < 11) { punti += valore; continue; }
			if (valore < 49) { punti += 10; continue; }
			punti += 25;
		}
		return punti;
	},

	calcolapuntitris: function (gruppo) {
		var punti = 0, valore, totale;
		var ncarte = gruppo.length;
		if (ncarte == 0) return 0;
		var ntris = gruppo[ncarte - 1].ntris;
		var tris = [];

		for (var i = 0, j = 0; i <= ntris; i++) {
			tris = [];
			while ((j < ncarte) && (gruppo[j].ntris == i)) {
				tris.push(gruppo[j]); j++;
			}
			var esito = this.analizzatris(tris);
			if (esito.tipotris == TRIS) {
				valore = esito.primonumero;
				if (valore == 1) valore = 11;
				else if (valore > 10) valore = 10;
				punti += valore * tris.length;
			}
			else {
				valore = esito.primonumero;
				for (var k = 0; k < tris.length; k++, valore++) {
					if (valore < 11) { punti += valore; continue; }
					if (valore < 14) { punti += 10; continue; }
					punti += 11;
				}
			}
		}
		return punti;
	},

	displaypunti: function (punti, display) {
		var centinaia, decine, unita;
		if (punti > 999) punti = 999;
		centinaia = Math.floor(punti / 100); punti -= (centinaia * 100);
		decine = Math.floor(punti / 10); punti -= (decine * 10);
		unita = punti;

		/* Fa scorrere il rullo di una cifra fino al valore indicato; usato sia
		   per il contatore orizzontale (digit3/2/1) sia, se presente, per
		   quello verticale (vdigit3/2/1). */
		var aggiornadigit = function (digit, cifra) {
			if (!digit) return;
			var altezza = parseInt(digit.style.height, 10) || 0;
			var attuale = parseInt((digit.style.backgroundPosition || "0px 0px").split(" ")[1], 10) || 0;
			animateEl(digit, { "posizione": ((-altezza * cifra) + "px") }, 400, {
				customStart: attuale,
				step: function (now) {
					digit.style.backgroundPosition = "0px " + now + "px";
				}
			});
		};

		/* I contatori di campo hanno id "punti<display>" (mano e tris vivono
		   nello stesso div di fascia, quindi non si può più scopare per
		   contenitore); i totalizzatori hanno direttamente id <display>. */
		var contatore = $$.one("#punti" + display) || $$.one("#" + display);
		if (!contatore) return;
		aggiornadigit(contatore.querySelector("#digit3"), centinaia);
		aggiornadigit(contatore.querySelector("#digit2"), decine);
		aggiornadigit(contatore.querySelector("#digit1"), unita);
		aggiornadigit(contatore.querySelector("#vdigit3"), centinaia);
		aggiornadigit(contatore.querySelector("#vdigit2"), decine);
		aggiornadigit(contatore.querySelector("#vdigit1"), unita);
	},

	calcolacarteattaccabili: function (avv) {

		var checkattaccabili = (function (contx, carta) {

			var salvacarta = (function (indice) {
				var tempor = {};
				tempor.carta = carta;
				tempor.cont = contx;
				tempor.indice = indice;
				tempor.cartatris = tris[0];
				scala.carteattaccabili.push(tempor);
				carta.puntiattacca += PUNTIATTACCABILI; scala.aggiornapunti(carta);
				return true;
			});
			conten = contx.carte;
			if (carta.numero > 49) return true;
			var ncarte = conten.length;
			var tris = [];
			if (ncarte == 0) return false;
			var maxtris = conten[ncarte - 1].ntris;
			for (var j = 0; j <= maxtris; j++) {
				tris = [];
				var ultimacartatris = 0;
				for (var k = 0; k < ncarte; k++) {
					if (conten[k].ntris == j) {
						tris.push(conten[k]);
						ultimacartatris = k;
					}
				}
				var esito = scala.analizzatris(tris);
				if (esito.tipotris == TRIS) {
					if (esito.primonumero != carta.numero) continue;
					if (esito.semidausare.indexOf(carta.seme) < 0) continue;
					return salvacarta(ultimacartatris + 1);
				}
				else {
					if (esito.semescala != carta.seme) continue;
					if (esito.primonumero == carta.numero + 1) return salvacarta(ultimacartatris + 1 - tris.length);
					var prossimacarta = esito.primonumero + tris.length;
					if (prossimacarta == 14) prossimacarta = 1;
					if (prossimacarta == carta.numero) return salvacarta(ultimacartatris + 1);
				}
			}
			return false;
		});

		this.carteattaccabili = [];
		var cont = this.campiavversario[avv].carte;
		this.ordinacarte(this.campiavversario[avv]);
		for (var i = 0; i < cont.length; i++) {
			cont[i].puntiattacca = 0;
			this.aggiornapunti(cont[i]);
		}

		for (var i = 0; i < cont.length; i++) {
			if ((i > 0) && (cont[i].shortName == cont[i - 1].shortName)) continue;
			if (!checkattaccabili(this.trisgiocatore, cont[i])) {
				for (var j = 0; j < scala.numeroavversari; j++) {
					if (checkattaccabili(this.campitrisavversario[j], cont[i])) break;
				}
			}
		}
		return;
	},

	attaccabiliconjolly: function (avv) {

		var checkattaccabili = (function (contx, carta) {

			var salvacarta = (function (indice, flag) {
				var tempor = {};
				tempor.carta = carta;
				tempor.cont = contx;
				tempor.indice = indice;
				tempor.cartatris = tris[0];
				tempor.messeprima = flag;
				tempor.primonumero = esito.primonumero;
				scala.carteattaccabili.push(tempor);
				return true;
			});
			conten = contx.carte;
			if (carta.numero > 49) return true;
			var ncarte = conten.length;
			var tris = [];
			if (ncarte == 0) return false;
			var maxtris = conten[ncarte - 1].ntris;
			for (var j = 0; j <= maxtris; j++) {
				tris = [];
				var ultimacartatris = 0;
				for (var k = 0; k < ncarte; k++) {
					if (conten[k].ntris == j) {
						tris.push(conten[k]);
						ultimacartatris = k;
					}
				}
				var esito = scala.analizzatris(tris);
				if (esito.tipotris == TRIS) continue;
				else {
					if (esito.semescala != carta.seme) continue;
					if (esito.primonumero == carta.numero + 2) return salvacarta(ultimacartatris + 1 - tris.length, true);
					var prossimacarta = esito.primonumero + tris.length + 1;
					if (prossimacarta == 15) continue;
					if (prossimacarta == 14) prossimacarta = 1;
					if (prossimacarta == carta.numero) return salvacarta(ultimacartatris + 1, false);
				}
			}
			return false;
		});

		this.carteattaccabili = [];
		var cont = this.campiavversario[avv].carte;
		this.ordinacarte(this.campiavversario[avv]);

		for (var i = 0; i < cont.length; i++) {
			if ((i > 0) && (cont[i].shortName == cont[i - 1].shortName)) continue;
			if (!checkattaccabili(this.trisgiocatore, cont[i])) {
				for (var j = 0; j < scala.numeroavversari; j++) {
					if (checkattaccabili(this.campitrisavversario[j], cont[i])) break;
				}
			}
		}
		return;
	},

	cercajollyrecuperabili: function (cont) {
		this.jollyincampo = [];
		this.jollyrecuperabili = [];
		var cercajolly = function (conten) {
			if (conten.length == 0) return;
			for (var i = 0; i < conten.length; i++) {
				if (conten[i].numero > 49) scala.jollyincampo.push(conten[i]);
			}
		};

		for (var i = 0; i < cont.carte.length; i++) {
			cont.carte.puntijollyrecuperabile = 0;
			scala.aggiornapunti(cont.carte[i]);
		}

		cercajolly(this.trisgiocatore.carte);
		for (var j = 0; j < scala.numeroavversari; j++) {
			cercajolly(this.campitrisavversario[j].carte);
		}
		var carta, dacercare;
		for (var i = 0; i < this.jollyincampo.length; i++) {
			carta = this.jollyincampo[i];
			dacercare = carta.tipojolly + carta.numerojolly;
			for (var j = 0; j < cont.carte.length; j++) {
				if (cont.carte[j].shortName == dacercare) {
					this.jollyrecuperabili.push({ "jolly": carta, "cartagruppo": cont.carte[j] });
					cont.carte[j].puntijollyrecuperabile += JOLLYRECUPERABILE;
					scala.aggiornapunti(cont.carte[j]);
					break;
				}
			}
		}
		return this.jollyrecuperabili.length;
	},

	cercacoppie: function (avv) {

		var salvacoppia = (function (c1, c2, tipotris, punteggio, punticonjolly, posizionejolly) {

			var tempor = {};
			tempor.carta1 = cont[c1];
			tempor.carta2 = cont[c2];
			tempor.tipotris = tipotris;
			tempor.punticonjolly = punticonjolly;
			tempor.posizionejolly = posizionejolly;

			if ((cont[c1].intris > 0) && (cont[c2].intris > 0)) return;
			if ((cont[c1].intris > 0) || (cont[c2].intris > 0)) { scala.coppiecontris.push(tempor); punteggio /= 8; }
			else scala.coppie.push(tempor);
			var puntiextra = punticonjolly / 2; if (scala.f40avversario[avv]) puntiextra = 0;
			cont[c1].punticoppia += (punteggio + puntiextra); scala.aggiornapunti(cont[c1]);
			cont[c2].punticoppia += (punteggio + puntiextra); scala.aggiornapunti(cont[c2]);
		});

		cont = this.campiavversario[avv].carte;
		this.coppie = [];
		this.coppiecontris = [];
		var ncarte = cont.length;
		for (var i = 0; i < cont.length; i++) {
			cont[i].punticoppia = 0;
			scala.aggiornapunti(cont[i]);
		}

		var differenza, flagskip = 0;
		if (ncarte < 2) return;
		for (var i = 0; i < ncarte - 1; i++) {
			i += flagskip; flagskip = 0;
			if (i >= ncarte - 1) break;
			if (cont[i].numero > 49) { cont[i].punticoppia += PUNTIJOLLY; scala.aggiornapunti(cont[i]); continue; }
			if (cont[i].shortName == cont[i + 1].shortName) { cont[i + 1].punticoppia -= PUNTICARTEUGUALI; scala.aggiornapunti(cont[i + 1]); flagskip++; }

			for (var j = i + 1; j < ncarte; j++) {
				if ((cont[i].seme != cont[j].seme) && (cont[i].numero == cont[j].numero)) {
					var puntitris = cont[i].numero * 3;
					if (puntitris > 30) puntitris = 30;
					if (puntitris == 3) puntitris = 33;
					salvacoppia(i, j, TRIS, PUNTICOPPIA, puntitris, 2);
				}
				else {
					if (cont[i].seme != cont[j].seme) continue;
					differenza = cont[j].numero - cont[i].numero;
					if ((differenza < 3) && (differenza != 0)) {
						if ((differenza == 1) && (cont[i].numero != 1)) {
							var puntitris = cont[i].numero * 3 + 3;
							if (cont[i].numero == 9) puntitris = 29;
							if (cont[i].numero >= 10) puntitris = 30;
							if (cont[i].numero == 12) puntitris = 31;
							salvacoppia(i, j, SCALA, PUNTICOPPIA, puntitris, 2);
						}
						else {
							var puntitris = cont[i].numero * 3 + 3;
							if (cont[i].numero == 9) puntitris = 29;
							if (cont[i].numero >= 10) puntitris = 30;
							if ((differenza == 1) && (cont[i].numero == 1)) {
								salvacoppia(i, j, SCALA, PUNTIMEZZACOPPIA, puntitris, 2);
							}
							else {
								salvacoppia(i, j, SCALA, PUNTIMEZZACOPPIA, puntitris, 1);
							}
						}
					}
					else if ((differenza > 10) && (cont[i].numero == 1)) salvacoppia(j, i, SCALA, PUNTIMEZZACOPPIA, 31, differenza - 10);
				}
				if (j < (ncarte - 1)) { if (cont[j].shortName == cont[j + 1].shortName) j++; }
			}
		}
		if (cont[ncarte - 1].numero > 49) { cont[ncarte - 1].punticoppia += PUNTIJOLLY; scala.aggiornapunti(cont[ncarte - 1]); }
	},

	cancellapuntietris: function (avv) {
		var buf = scala.campiavversario[avv];
		for (var i = 0; i < buf.carte.length; i++) {
			buf.carte[i].puntitris = 0;
			buf.carte[i].punticoppia = 0;
			buf.carte[i].puntiattacca = 0;
			buf.carte[i].punteggio = 0;
			buf.carte[i].intris = 0;
			buf.carte[i].puntijollyrecuperabile = 0;
		}
	},

	ottimizzacoppie: function () {
		if (this.coppie.length < 2) return;
		this.ordinacoppie(this.coppie);
		var i = 0;
		var id11, id12, id21, id22;
		while (i < (this.coppie.length - 1)) {
			id11 = this.coppie[i].carta1.id;
			id12 = this.coppie[i].carta2.id;
			for (var j = i + 1; j < this.coppie.length; j++) {
				id21 = this.coppie[j].carta1.id;
				id22 = this.coppie[j].carta2.id;
				if ((id11 == id21) || (id11 == id22) || (id12 == id21) || (id12 == id22)) { this.coppie.splice(j, 1); j--; }
			}
			i++;
		}
	},

	trisconjolly: function (avv) {
		this.ordinacarte(this.campiavversario[avv]);
		var jolly = this.campiavversario[avv].carte[this.campiavversario[avv].carte.length - 1];
		var tempor = this.coppie[0];
		this.coppie.splice(0, 1);
		var tris = [];
		if (tempor.tipotris == TRIS) {
			tris.push(tempor.carta1);
			tris.push(tempor.carta2);
			tris.push(jolly);
		}
		else {
			if (tempor.carta2.numero == 1) {
				if (tempor.carta1.numero == 13) {
					tris.push(jolly);
					tris.push(tempor.carta1);
					tris.push(tempor.carta2);
				}
				else {
					tris.push(tempor.carta1);
					tris.push(jolly);
					tris.push(tempor.carta2);
				}
			}
			else {
				if ((tempor.carta2.numero - tempor.carta1.numero) == 2) {
					tris.push(tempor.carta1);
					tris.push(jolly);
					tris.push(tempor.carta2);
				}
				else {
					tris.push(tempor.carta1);
					tris.push(tempor.carta2);
					tris.push(jolly);
				}
			}
		}
		this.scartatris(tris);
	},

	jollydausare: 0,

	apesca: function (avv) {
		this.jollydausare = 0;

		if ((this.campiavversario[avv].carte.length >= 3)) {
			var scarto = this.scarti.carte[this.scarti.carte.length - 1];

			this.ordinacarte(this.campiavversario[avv]);
			this.cancellapuntietris(avv);
			this.calcolatrispossibili(avv);
			this.ottimizzatris();
			this.cercacoppie(avv);
			if (this.verifica40(avv)) this.f40avversario[avv] = true;
			var coppia, trovato = false;
			for (var i = 0; i < this.coppie.length; i++) {
				if (scarto.numero > 49) { trovato = true; break; }
				coppia = this.coppie[i];
				if (coppia.tipotris == TRIS) {
					if ((coppia.carta1.numero == scarto.numero) && (coppia.carta1.seme != scarto.seme) && (coppia.carta2.seme != scarto.seme)) {
						{ trovato = true; break; }
					}
				}
				else {
					if (coppia.carta1.seme == scarto.seme) {
						if (coppia.posizionejolly == 1) {
							if (coppia.carta1.numero == (scarto.numero - 1)) { trovato = true; break; }
						}
						else {
							if (coppia.carta1.numero == (scarto.numero + 1)) { trovato = true; break; }
							if ((coppia.carta2.numero != 1) && (coppia.carta2.numero == (scarto.numero - 1))) { trovato = true; break; }
							if ((coppia.carta2.numero == 13) && (scarto.numero == 1)) { trovato = true; break; }
						}
					}
				}
			}

			if (trovato) {
				if (this.f40avversario[avv]) {
					suona(dascarti);
					this.muovicarta(this.scarti, this.campiavversario[avv], "faceDown", "apesca");
					this.render();
					return;
				}
			}

			if ((!this.f40avversario[avv]) && (this.fscartiprima40)) {

				var salvalog = scala.statostack.length;
				suona(dascarti);

				this.muovicarta(this.scarti, this.campiavversario[avv], "faceDown", "apescanascosta");
				this.cancellapuntietris(avv);

				this.calcolatrispossibili(avv);
				this.ottimizzatris();
				this.cercacoppie(avv);
				this.ottimizzacoppie();

				if (this.verifica40(avv)) {
					this.render();
					return;
				}
				else {
					while (scala.statostack.length > salvalog) scala.popstato();
					this.popstato(-1, true);
				}
			}
		}

		suona(pesca);

		this.muovicarta(this.mazzo, this.campiavversario[avv], "faceDown", "apesca");
		this.render();
	},

	alavora: function (avv) {
		this.ordinacarte(this.campiavversario[avv]);
		this.cancellapuntietris(avv);
		if (this.campiavversario[avv].carte.length > 3) {
			this.calcolatrispossibili(avv);
			this.ottimizzatris();
			this.cercacoppie(avv);
			this.ottimizzacoppie();

			if (!this.f40avversario[avv]) { if (this.verifica40(avv)) this.f40avversario[avv] = true; }
			while ((this.f40avversario[avv]) && (this.trispossibili.length > 0)) {
				if (this.trispossibili[0].length == this.campiavversario[avv].carte.length) this.trispossibili[0].splice(0, 1);
				this.scartatris(this.trispossibili[0]);
				this.cancellapuntietris(avv);
				this.calcolatrispossibili(avv);
				this.ottimizzatris();

				this.cercacoppie(avv);
				this.ottimizzacoppie();
			}
			while ((this.f40avversario[avv]) && (this.jollydausare > 0) && (this.coppie.length > 0)) {
				this.trisconjolly(avv);
				this.jollydausare--;
			}
		}
		this.cercajollyrecuperabili(this.campiavversario[avv]);

		/* Regola jolly immediato: l'IA recupera un jolly solo se ha già
		   verificato che potrà giocarlo in questo turno (esiste almeno una
		   combinazione del tavolo disposta ad accoglierlo). I jolly
		   recuperati vengono tracciati: se il flusso normale non li usa in
		   nuove calate, la rete di sicurezza in fondo al turno li attacca. */
		var jollyrecuperati = [];
		var coppia;
		while (this.f40avversario[avv] && (this.jollyrecuperabili.length > 0)) {
			coppia = this.jollyrecuperabili.pop();
			if (scala.jollyimmediato && !this.piazzajolly(coppia["jolly"], coppia["cartagruppo"], NOESEGUI)) continue;
			this.scambiacarte(coppia["cartagruppo"], coppia["jolly"], ESEGUI);
			jollyrecuperati.push(coppia["jolly"]);
			this.cercajollyrecuperabili(this.campiavversario[avv]);
		}
		this.gestisciattaccabili(avv);

		if (this.campiavversario[avv].carte.length > 0) {

			this.ordinacarte(this.campiavversario[avv]);

			this.cercacoppie(avv);
			var stringone = "coppie: ";
			for (var i = 0; i < this.coppie.length; i++) {
				stringone += (this.coppie[i].carta1.shortName + "-" + this.coppie[i].carta2.shortName + " (" + this.coppie[i].punticonjolly + "),  ");
			}
			log(stringone);
			this.ordinacoppie(this.coppie);
			stringone = "coppie: ";
			for (var i = 0; i < this.coppie.length; i++) {
				stringone += (this.coppie[i].carta1.shortName + "-" + this.coppie[i].carta2.shortName + " (" + this.coppie[i].punticonjolly + "),  ");
			}
			log(stringone);

			this.ottimizzacoppie();
			while (this.f40avversario[avv]
				&& (this.campiavversario[avv].carte.length > 3)
				&& (this.campiavversario[avv].carte[this.campiavversario[avv].carte.length - 1].numero > 49)
				&& (this.coppie.length > 0)) {
				this.trisconjolly(avv);
				this.cercacoppie(avv);
				this.ottimizzacoppie();
			}

			this.gestisciattaccabili(avv);

			this.attaccabiliconjolly(avv);
			stringone = "attaccabiliconjolly" + avv + ": ";
			for (var i = 0; i < this.carteattaccabili.length; i++) {
				stringone += (this.carteattaccabili[i].carta.shortName + ", ");
			}
			log(stringone);

			var temp;
			var lung = this.campiavversario[avv].carte.length;
			while (this.f40avversario[avv] && (this.carteattaccabili.length > 0) && (lung > 2) && (lung < 7)
				&& (this.campiavversario[avv].carte[lung - 1].numero > 49) && (this.campiavversario[avv].carte[1].numero < 49)) {
				temp = this.carteattaccabili.pop();
				temp.carta.faceUp = true;
				var infojolly = { semescala: temp.carta.seme, primonumero: temp.primonumero };
				if (!temp.messeprima) {
					this.aggiungitris(temp.cont, temp.indice, this.campiavversario[avv].carte[lung - 1], temp.cartatris, ESEGUI, infojolly);
					this.aggiungitris(temp.cont, temp.indice + 1, temp.carta, temp.cartatris, ESEGUI, infojolly);
				}
				else {
					infojolly.primonumero -= 1;
					this.aggiungitris(temp.cont, temp.indice, this.campiavversario[avv].carte[lung - 1], temp.cartatris, ESEGUI, infojolly);
					this.aggiungitris(temp.cont, temp.indice, temp.carta, temp.cartatris, ESEGUI, infojolly);
				}
				lung = this.campiavversario[avv].carte.length;
			}

			this.ordinacarte(this.campiavversario[avv]);
			var lung2 = this.campiavversario[avv].carte.length;
			while ((lung2 < 5) && (lung2 > 1) && (this.campiavversario[avv].carte[1].numero > 49) ||
				(lung2 == 3) && (this.campiavversario[avv].carte[2].numero > 49)) {
				if (!this.attaccajolly(this.trisgiocatore, this.campiavversario[avv].carte[lung2 - 1])) {
					for (var j = 0; j < scala.numeroavversari; j++) {
						if (this.attaccajolly(this.campitrisavversario[j], this.campiavversario[avv].carte[lung2 - 1])) break;
					}
				}
				lung2 = this.campiavversario[avv].carte.length;
			}
			if ((this.campiavversario[avv].carte.length == 4) && (this.campiavversario[avv].carte[2].numero > 49)) {
				var tris = [];
				for (var i = 1; i < 4; i++) tris.push(this.campiavversario[avv].carte[i]);
				this.scartatris(tris);
			}
			if ((this.campiavversario[avv].carte.length == 5) && (this.campiavversario[avv].carte[3].numero > 49)) {
				var tris = [];
				for (var i = 2; i < 5; i++) tris.push(this.campiavversario[avv].carte[i]);
				this.scartatris(tris);
			}

			var carta;
			var nomeprecedente = this.campiavversario[avv].carte[0].shortName;

			for (var i = 1; i < this.campiavversario[avv].carte.length; i++) {
				carta = this.campiavversario[avv].carte[i];
				if (carta.shortName == nomeprecedente) {
					carta.punteggio += (this.campiavversario[avv].carte[i - 1].punteggio / 4);
				}

				nomeprecedente = carta.shortName;
			}

			stringone = "punti: ";
			for (var i = 0; i < this.campiavversario[avv].carte.length; i++) {
				carta = this.campiavversario[avv].carte[i];
				stringone += (carta.shortName + "=" + carta.puntitris + ":" + carta.puntiattacca + ":" + carta.punticoppia + ":" + carta.puntijollyrecuperabile + ":" + carta.punteggio + ",  ");
			}
			log(stringone);

			/* Rete di sicurezza della regola jolly immediato: un jolly
			   recuperato in questo turno e non ancora usato va attaccato ora
			   (la possibilità era stata verificata prima del recupero; si
			   tiene almeno una carta in mano per lo scarto). */
			if (scala.jollyimmediato) {
				for (var i = 0; i < jollyrecuperati.length; i++) {
					var jr = jollyrecuperati[i];
					if (jr.gruppo !== this.campiavversario[avv]) continue;
					if (this.campiavversario[avv].carte.length < 2) break;
					if (!this.piazzajolly(jr, null, ESEGUI)) log("jolly immediato: nessun posto per " + jr.shortName);
				}
			}

			this.render();
		}
	},

	gestisciattaccabili: function (avv) {
		this.calcolacarteattaccabili(avv);
		var stringone = "carte attaccabili" + avv + ": ";
		for (var i = 0; i < this.carteattaccabili.length; i++) {
			stringone += (this.carteattaccabili[i].carta.shortName + ", ");
		}

		log(stringone);

		var temp;
		while (this.f40avversario[avv] && (this.carteattaccabili.length > 0) && (this.campiavversario[avv].carte.length > 1)
			&& !((this.campiavversario[avv].carte.length == 4) && (this.carteattaccabili.length < 2) && (this.numeroavversari < 3))) {
			temp = this.carteattaccabili.pop();
			temp.carta.faceUp = true;
			this.aggiungitris(temp.cont, temp.indice, temp.carta, temp.cartatris, ESEGUI);
			this.calcolacarteattaccabili(avv);
		}
	},

	verifica40: function (avv) {
		var totaletris = 0;
		for (var i = 0; i < this.trispossibili.length; i++) {
			totaletris += this.calcolapuntitris(this.trispossibili[i]);
		}
		if (totaletris > 39) return true;
		else {
			this.ottimizzacoppie();
			var numerojolly = 0, totaletrisconjolly = totaletris;
			this.jollydausare = 0;
			for (var i = 0; i < this.campiavversario[avv].carte.length; i++) { if (this.campiavversario[avv].carte[i].numero > 49) numerojolly++; }
			for (var i = 0; i < numerojolly; i++) {
				if (this.coppie.length <= i) break;
				this.jollydausare++;
				totaletrisconjolly += this.coppie[i].punticonjolly;
				if (totaletrisconjolly > 39) { return true; }
			}
		}
		log("totaletris= " + totaletris + " ,con " + this.jollydausare + " jolly= " + totaletrisconjolly);
		return false;
	},

	/* Regola jolly immediato (IA): cerca una combinazione del tavolo a cui il
	   jolly può attaccarsi, validando con analizzatris (a differenza di
	   attaccajolly, che usa euristiche non controllate ai bordi).
	   - esegui=NOESEGUI: dice solo se un posto esiste (verifica preventiva
	     prima di recuperare); con "sostituta" valorizzata, nel blocco di
	     provenienza il jolly si considera già scambiato con quella carta.
	   - esegui=ESEGUI: attacca davvero il jolly nel primo posto valido
	     (rete di sicurezza a fine turno). */
	piazzajolly: function (jolly, sostituta, esegui) {
		var gruppi = [this.trisgiocatore];
		for (var j = 0; j < this.numeroavversari; j++) gruppi.push(this.campitrisavversario[j]);
		for (var g = 0; g < gruppi.length; g++) {
			var carte = gruppi[g].carte;
			var visti = {};
			for (var i = 0; i < carte.length; i++) {
				var nt = carte[i].ntris;
				if (visti[nt]) continue;
				visti[nt] = true;
				var blocco = [], posizioni = [];
				for (var k = 0; k < carte.length; k++) {
					if (carte[k].ntris !== nt) continue;
					blocco.push((carte[k] === jolly && sostituta) ? sostituta : carte[k]);
					posizioni.push(k);
				}
				/* in coda (tris: quarto seme; scala: numero successivo) */
				var esito = this.analizzatris(blocco.concat([jolly]));
				if (esito.valido) {
					if (esegui) this.aggiungitris(gruppi[g], posizioni[posizioni.length - 1] + 1, jolly, carte[posizioni[posizioni.length - 1]], ESEGUI, esito);
					return true;
				}
				/* in testa (scala: numero precedente) */
				esito = this.analizzatris([jolly].concat(blocco));
				if (esito.valido) {
					if (esegui) this.aggiungitris(gruppi[g], posizioni[0], jolly, carte[posizioni[0]], ESEGUI, esito);
					return true;
				}
			}
		}
		return false;
	},

	/* Regola opzionale "non scartare carte che attaccano": vero se "carta"
	   si potrebbe attaccare (in testa o in coda) a un tris/scala qualsiasi
	   in tavola (trisgiocatore o campi avversari), oppure se potrebbe
	   sostituire (recuperare) un jolly già presente in un blocco in tavola
	   — il regolamento FISCA non lo specifica esplicitamente, ma "attacca"
	   è inteso qui nel senso più ampio: anche il recupero di un jolly
	   modifica una combinazione in tavola, non solo l'estensione fisica.
	   Stessa logica di verifica di piazzajolly, ma su una carta normale
	   invece che su un jolly: sola lettura, nessuna modifica allo stato. */
	cartaattaccatavolo: function (carta) {
		var gruppi = [this.trisgiocatore];
		for (var j = 0; j < this.numeroavversari; j++) gruppi.push(this.campitrisavversario[j]);
		for (var g = 0; g < gruppi.length; g++) {
			var carte = gruppi[g].carte;
			var visti = {};
			for (var i = 0; i < carte.length; i++) {
				var nt = carte[i].ntris;
				if (visti[nt]) continue;
				visti[nt] = true;
				var blocco = [];
				for (var k = 0; k < carte.length; k++) {
					if (carte[k].ntris === nt) blocco.push(carte[k]);
				}
				if (this.analizzatris(blocco.concat([carta])).valido) return true;
				if (this.analizzatris([carta].concat(blocco)).valido) return true;
				for (var k = 0; k < blocco.length; k++) {
					if ((blocco[k].numero > 49) && (carta.shortName == (blocco[k].tipojolly + blocco[k].numerojolly))) return true;
				}
			}
		}
		return false;
	},

	attaccajolly: function (contx, carta) {

		conten = contx.carte;
		var ncarte = conten.length;
		var tris = [];
		if (ncarte == 0) return false;
		var maxtris = conten[ncarte - 1].ntris;
		for (var j = 0; j <= maxtris; j++) {
			tris = [];
			var ultimacartatris = 0;
			for (var k = 0; k < ncarte; k++) {
				if (conten[k].ntris == j) {
					tris.push(conten[k]);
					ultimacartatris = k;
				}
			}
			var esito = scala.analizzatris(tris);
			if (esito.tipotris == TRIS) {
				if (tris.length > 3) continue;
				this.aggiungitris(contx, ultimacartatris + 1, carta, contx.carte[ultimacartatris], ESEGUI, esito);
				return true;
			}
			else {
				if ((esito.primonumero != 1) && (tris.length < 14)) {
					esito.primonumero -= 1;
					this.aggiungitris(contx, ultimacartatris - tris.length + 1, carta, contx.carte[ultimacartatris - tris.length + 1], ESEGUI, esito);
					return true;
				}
				else {
					this.aggiungitris(contx, ultimacartatris + 1, carta, contx.carte[ultimacartatris], ESEGUI, esito);
					return true;
				}
			}
		}
		return false;
	},

	ascarta: function (avv) {

		var indiceminimo = this.campiavversario[avv].carte.length - 1, minimo = 1000;
		if (this.campiavversario[avv].carte.length < 4) {
			for (var i = 0; i < this.campiavversario[avv].carte.length; i++) {
				if (scala.campiavversario[avv].carte[i].numero < 50) {
					scala.campiavversario[avv].carte[i].puntitris = 0;
					scala.campiavversario[avv].carte[i].punticoppia = 0;
					scala.aggiornapunti(scala.campiavversario[avv].carte[i]);
				}
			}
		}

		if (this.f40avversario[avv]) {
			for (var i = this.campiavversario[avv].carte.length - 1; i >= 0; i--) {
				if ((this.campiavversario[avv].carte[i].punteggio < minimo)
					|| ((this.campiavversario[avv].carte[i].punteggio == minimo) && (this.campiavversario[avv].carte[i].numero == 1))) {
					minimo = this.campiavversario[avv].carte[i].punteggio;
					indiceminimo = i;
				}
			}
		}
		else {
			/* Regola opzionale "non scartare carte che attaccano", applicata
			   anche prima dei 40 punti: qui l'IA non può ancora calare, quindi
			   l'unica difesa è evitare di scegliere per lo scarto una carta
			   che regalerebbe punti attaccandosi a un tris/scala altrui.
			   Si esclude dal confronto di rischio minimo ogni carta attaccabile
			   (a meno che l'intera mano sia fatta solo di carte attaccabili). */
			var soloNonAttaccanti = this.nonscartareattaccanti
				&& this.campiavversario[avv].carte.some(function (c) { return !scala.cartaattaccatavolo(c); });
			for (var i = 0; i < this.campiavversario[avv].carte.length; i++) {
				if (soloNonAttaccanti && this.cartaattaccatavolo(this.campiavversario[avv].carte[i])) continue;
				if ((this.campiavversario[avv].carte[i].punteggio < minimo)
					|| ((this.campiavversario[avv].carte[i].punteggio == minimo) && (this.campiavversario[avv].carte[indiceminimo].numero == 1))) {
					minimo = this.campiavversario[avv].carte[i].punteggio;
					indiceminimo = i;
				}
			}
		}
		suona(scarta);
		this.muovicarta(this.campiavversario[avv].carte[indiceminimo], this.scarti, "faceUp", "ascarta");
	},

	/* True se l'avversario j (0-based) va escluso dalle mani successive
	   perché ha già raggiunto/superato il limite e l'opzione è attiva.
	   Il punteggio resta quello raggiunto: nessun altro stato da tracciare. */
	avvescluso: function (j) {
		if (!this.escludiavversariesuperano) return false;
		var totale = [this.totaleavversario1, this.totaleavversario2, this.totaleavversario3][j];
		return totale >= this.totalelimite;
	},

	calcolatotali: function () {

		/* Mano conclusa: il mazziere ruota al giocatore successivo
		   (varrà dalla prossima mano). */
		var prossimomazziere = this.mazziere + 1;
		if (prossimomazziere >= this.numeroavversari) prossimomazziere = -1;
		localStorage.setItem('scala40tris_mazziere', prossimomazziere);

		this.totalepartite++;

		var vintot = true;

		if ((this.totaleavversario1 >= this.totalelimite)
			&& ((this.numeroavversari < 2) || (this.totaleavversario2 >= this.totalelimite))
			&& ((this.numeroavversari < 3) || (this.totaleavversario3 >= this.totalelimite))
		) vintot = false;

		this.totalegiocatore += this.calcolapunti(this.giocatore.carte);
		this.totaleavversario1 += this.calcolapunti(this.avversario1.carte);
		if (this.numeroavversari > 1) this.totaleavversario2 += this.calcolapunti(this.avversario2.carte);
		if (this.numeroavversari > 2) this.totaleavversario3 += this.calcolapunti(this.avversario3.carte);

		if (this.totaleavversario1 < this.totalelimite) vintot = false;
		if ((this.numeroavversari > 1) && (this.totaleavversario2 < this.totalelimite)) vintot = false;
		if ((this.numeroavversari > 2) && (this.totaleavversario3 < this.totalelimite)) vintot = false;

		return vintot;
	},

	scoperte: function () {
		if (this.cartescoperte) {
			this.cartescoperte = false;
			$$.css($$.one("#scoperte"), { "border-color": "#888888" });
			for (var j = 0; j < scala.numeroavversari; j++) {
				$$.hide("#puntiavversario" + (j + 1));
			}
		}
		else {
			this.cartescoperte = true;
			$$.css($$.one("#scoperte"), { "border-color": "yellow" });
			for (var j = 0; j < scala.numeroavversari; j++) {
				$$.show("#puntiavversario" + (j + 1));
			}
		}
		this.render();
	},

}; //scala

document.addEventListener('DOMContentLoaded', function () {
	console.log("Document ready! (scala40tris)");
	function initScala40() {
		if (document.getElementById('interstitial-overlay')) {
			var checkOverlay = setInterval(function () {
				if (!document.getElementById('interstitial-overlay')) {
					clearInterval(checkOverlay);
					scala.start();
					scala.collegaeventi();
				}
			}, 100);
			return;
		}
		scala.start();
		scala.collegaeventi();
	}
	if (typeof window.waitForInterstitial === 'function') {
		window.waitForInterstitial(initScala40);
	} else {
		initScala40();
	}
});

if (window.registerLayoutResizeListener) {
	window.registerLayoutResizeListener(function (offsetLeft, offsetTop, scale) {
		if (window.scala) {
			window.scala.offsetxx = offsetLeft;
			window.scala.offsetyy = offsetTop;
		}
	});
}
