/*
 * scala40bis.js
 * Versione modernizzata di scala40codeV1.js: nessuna dipendenza da jQuery,
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
		game_saved: "partita salvata",
		turn: "TURNO DI: ",
		player: "giocatore",
		opponent: "avversario"
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
		game_saved: "game saved",
		turn: "TURN OF: ",
		player: "player",
		opponent: "opponent"
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

	var startTime = null;
	var start = {};
	var startCustom = null;

	if (opts.step) {
		// animazione a valore singolo custom (usata per i digit dei contatori)
		var key = Object.keys(props)[0];
		startCustom = opts.customStart != null ? opts.customStart : 0;
		var endCustom = parseFloat(props[key]);

		function stepCustom(ts) {
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

function applyImmediate(el, props, opts) {
	if (opts && opts.step) {
		var key = Object.keys(props)[0];
		opts.step(parseFloat(props[key]), { pos: 1 });
		return;
	}
	if ('top' in props) el.style.top = props.top + 'px';
	if ('left' in props) el.style.left = props.left + 'px';
	if ('z-index' in props) el.style.zIndex = props['z-index'];
}

var CUORI = "C", QUADRI = "Q", FIORI = "F", PICCHE = "P", JOLLY = "J";
var valoreseme = { "F": 0, "Q": 1, "C": 2, "P": 3, "J": 4 };
var semevalore = ["F", "Q", "C", "P", "J"];
var RETROROSSO = 0, RETROBLU = 1;
var TRIS = 1, SCALA = 2;
var ESEGUI = true;
var NOESEGUI = false;
var PUNTI = true;
var NOPUNTI = false;
var SORTED = true;

var PUNTITRIS = 100;
var PUNTIATTACCABILI = 50;
var PUNTICOPPIA = 40;
var PUNTIMEZZACOPPIA = 20;
var PUNTICARTEUGUALI = 30;
var PUNTIJOLLY = 200;
var JOLLYRECUPERABILE = 150;

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
var applause = document.getElementById("applause");
var distribuisci = document.getElementById("distribuisci");

/* ==========================================================================
   Card: stessa struttura dati dell'originale, notazione invariata per non
   alterare in alcun modo la logica di gioco.
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
	}
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

		var _na = parseInt(localStorage.getItem('scala40bis_numeroavversari') || '3', 10);
		var _tl = parseInt(localStorage.getItem('scala40bis_totalelimite') || '150', 10);
		this.numeroavversari = (_na > 0 && _na < 4) ? _na : 3;
		this.totalelimite = (!isNaN(_tl) && _tl > 0) ? _tl : 150;

		this.totalepartite = 0;
		this.totaleavversario1 = 0;
		this.totaleavversario2 = 0;
		this.totaleavversario3 = 0;
		this.totalegiocatore = 0;

		var _stato = null;
		try { _stato = JSON.parse(localStorage.getItem('scala40bis_stato') || 'null'); } catch (e) { }
		localStorage.removeItem('scala40bis_stato');
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
		this.duejolly = true;
		this.fscartiprima40 = true;

		this.carteselezionate = [];
		this.trisdata = {
			jollycontenuti: [],
			tipotris: 0,
			semidausare: [],
			semescala: 0,
			primonumero: 0,
		};
		this.f40avversario = [false, false, false];
		this.f40giocatore = false;
		this.fscartipesca = false;
		this.modale = false;

		this.altezzacampo = 600 / (2 + this.numeroavversari * 2);

		for (var i = 1; i <= this.numeroavversari; i++) {
			this.creacampo("avversario" + i, 2 * i - 2, true);
			this.creacampo("trisavversario" + i, 2 * i - 1);
		}
		this.creacampo("trisgiocatore", 2 * this.numeroavversari);
		this.creacampo("giocatore", 2 * this.numeroavversari + 1, true);

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

		$$.append("#" + contenitore, '<div id="' + nome + '" style="top: ' + posy + 'px; left: ' + posx + 'px;" class="contatore">' +
			'<img src="images/scala40/vassoiod.png" height="' + altezza + 'px" width="' + larghezza + 'px">'

			+ '<div id="digit3" class="digitx" style="top: ' + offsety + 'px; left: ' + offsetx + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div>'
			+ '<div id="digit2" class="digitx" style="top: ' + offsety + 'px; left: ' + Math.floor(offsetx + larghezza / 3.2) + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div>'
			+ '<div id="digit1" class="digitx" style="top: ' + offsety + 'px; left: ' + Math.floor(offsetx + larghezza / 3.2 * 2) + 'px; width:' + wdigit + 'px; height:' + hdigit + 'px;' +
			'	background-size: ' + wdigit + 'px ' + (hdigit * 10) + 'px; background-position: -0px 0px; "  > </div> </div>'
		);
	},

	creacampo: function (nome, posizione, parnomecampo) {

		$$.append("#campogioco", '<div id="' +
			nome + '" class="campo" style="top:' +
			(100 + this.altezzacampo * (posizione)) + 'px; left: 12px; width:854px;height:' +
			this.altezzacampo + 'px;">');

		this.creacontatore("punti" + nome, 100, 40, nome, 754, 2);

		var labelText = nome;
		if (labelText.indexOf('avversario') === 0) {
			labelText = t('opponent') + labelText.replace('avversario', ' ');
		} else if (labelText === 'giocatore') {
			labelText = t('player');
		}

		if (parnomecampo) $$.append("#campogioco", '<div id="et' + nome + '" class="etichetta" style="top:' +
			(60 + this.altezzacampo * (posizione + 0.5)) + 'px; left: 350px; height:50px;">&nbsp' +
			labelText + '</div>');
	},

	creamazzi: function () {

		this.stock = [];

		var offy = 25, moffx = 25, moffy = 22;
		if (this.numeroavversari > 1) offy = 4;
		if (this.numeroavversari > 2) { moffx = 35, moffy = 35 };

		this.mazzo = {
			carte: [], top: $$.getCssInt($$.one("#mazzo"), "top"),
			left: $$.getCssInt($$.one("#mazzo"), "left"), offsetx: moffx, offsety: moffy, deltax: 0.1, deltay: 0.1, xtris: 0
		};
		this.scarti = {
			carte: [], top: $$.getCssInt($$.one("#scarti"), "top"),
			left: $$.getCssInt($$.one("#scarti"), "left"), offsetx: moffx, offsety: moffy, deltax: 0.1, deltay: 0.1, xtris: 0
		};
		this.giocatore = {
			carte: [], top: $$.getCssInt($$.one("#giocatore"), "top"),
			left: $$.getCssInt($$.one("#giocatore"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 80
		};
		this.trisgiocatore = {
			carte: [], top: $$.getCssInt($$.one("#trisgiocatore"), "top"),
			left: $$.getCssInt($$.one("#trisgiocatore"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 80
		};
		this.avversario1 = {
			carte: [], top: $$.getCssInt($$.one("#avversario1"), "top"),
			left: $$.getCssInt($$.one("#avversario1"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 0
		};
		this.trisavversario1 = {
			carte: [], top: $$.getCssInt($$.one("#trisavversario1"), "top"),
			left: $$.getCssInt($$.one("#trisavversario1"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 80
		};
		this.avversario2 = {
			carte: [], top: $$.getCssInt($$.one("#avversario2"), "top"),
			left: $$.getCssInt($$.one("#avversario2"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 0
		};
		this.trisavversario2 = {
			carte: [], top: $$.getCssInt($$.one("#trisavversario2"), "top"),
			left: $$.getCssInt($$.one("#trisavversario2"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 80
		};
		this.avversario3 = {
			carte: [], top: $$.getCssInt($$.one("#avversario3"), "top"),
			left: $$.getCssInt($$.one("#avversario3"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 0
		};
		this.trisavversario3 = {
			carte: [], top: $$.getCssInt($$.one("#trisavversario3"), "top"),
			left: $$.getCssInt($$.one("#trisavversario3"), "left"), offsetx: 25, offsety: offy, deltax: 20, deltay: 0, xtris: 80
		};

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
			card.left = this.mazzo.left + this.mazzo.offsetx + Math.floor(i * this.mazzo.deltax);
			card.top = this.mazzo.top + this.mazzo.offsety + Math.floor(i * this.mazzo.deltay);
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
			if ((ev.button == 0) && (!scala.fmodale) && (scala.astato != "playrender")) return scala.scalamousedown(cardEl, ev);
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

		$$.on('.pulsantehelp', 'click', function () {
			var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
			window.open('regole-scala40' + langSuffix, '_blank');
		});

		$$.on('#nuovo', 'click', function () {
			scala.nuovo2();
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
		var commento = comm || "nc";
		var stato = {};
		stato.stock = [];
		(function (da, a) {
			for (var i = 0; i < da.length; i++) {
				a[i] = (new Card(0, 0, 0, 0));
				for (var member in da[i]) { a[i][member] = da[i][member]; }
			}
		})(scala.stock, stato.stock);

		var copia = function (da, a) {
			a.splice(0, a.length);
			for (var i = 0; i < da.length; i++) {
				a[i] = da[i];
			}
		};

		stato.commento = commento;
		stato.salvasuono = scala.salvasuono;
		stato.giocatore = []; copia(scala.giocatore.carte, stato.giocatore);
		stato.avversario1 = []; copia(scala.avversario1.carte, stato.avversario1);
		stato.avversario2 = []; copia(scala.avversario2.carte, stato.avversario2);
		stato.avversario3 = []; copia(scala.avversario3.carte, stato.avversario3);
		stato.trisgiocatore = []; copia(scala.trisgiocatore.carte, stato.trisgiocatore);
		stato.trisavversario1 = []; copia(scala.trisavversario1.carte, stato.trisavversario1);
		stato.trisavversario2 = []; copia(scala.trisavversario2.carte, stato.trisavversario2);
		stato.trisavversario3 = []; copia(scala.trisavversario3.carte, stato.trisavversario3);
		stato.mazzo = []; copia(scala.mazzo.carte, stato.mazzo);
		stato.scarti = []; copia(scala.scarti.carte, stato.scarti);
		stato.pescato = scala.pescato;
		stato.f40giocatore = scala.f40giocatore;
		stato.f40avversario = []; copia(scala.f40avversario, stato.f40avversario);
		this.statostack.push(stato);
		$$.css($$.one("#pulsante2"), { "border-color": "yellow" });
	},

	popstato: function (numerostato, lasciacopia) {

		var miostato = numerostato || -1;

		var miacopia = lasciacopia || false;
		if (this.statostack.length == 0) return;

		var stato;
		if (miacopia) stato = this.statostack[this.statostack.length - 1];
		else {
			if (miostato != -1) stato = this.statostack[numerostato];
			else stato = this.statostack.pop();
		}

		var copia = function (a, da) {
			a.splice(0, a.length);
			for (var i = 0; i < da.length; i++) {
				a[i] = da[i];
			}
		};
		copia(scala.giocatore.carte, stato.giocatore);
		copia(scala.avversario1.carte, stato.avversario1);
		copia(scala.avversario2.carte, stato.avversario2);
		copia(scala.avversario3.carte, stato.avversario3);
		copia(scala.trisgiocatore.carte, stato.trisgiocatore);
		copia(scala.trisavversario1.carte, stato.trisavversario1);
		copia(scala.trisavversario2.carte, stato.trisavversario2);
		copia(scala.trisavversario3.carte, stato.trisavversario3);
		copia(scala.mazzo.carte, stato.mazzo);
		copia(scala.scarti.carte, stato.scarti);
		scala.carteselezionate.splice(0, scala.carteselezionate.length);
		scala.pescato = stato.pescato;
		copia(scala.f40avversario, stato.f40avversario);
		scala.f40giocatore = stato.f40giocatore;
		scala.commento = stato.commento;
		scala.salvasuono = stato.salvasuono;

		$$.removeClassAll(".card", "cardselected");

		(function (a, da) {
			for (var i = 0; i < da.length; i++) {
				for (var member in da[i]) { a[i][member] = da[i][member]; a[i].selected = false; }
			}
		})(scala.stock, stato.stock);

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

		if (!this.pointerinelement(ev, "#giocatore")) return;

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
		if ((this.pointerinelement(ev, "#trisgiocatore")) && (this.pescato) && (this.trisgiocatore.carte.length > 0)) {
			this.tgon();
			this.cercamatch(this.trisgiocatore, NOESEGUI);
		}
		else this.tgoff();

		for (var j = 0; j < scala.numeroavversari; j++) {
			if ((this.pointerinelement(ev, ("#trisavversario" + (j + 1)))) && (this.pescato) && (this.campitrisavversario[j].carte.length > 0)) {
				this.taon(j);
				this.cercamatch(this.campitrisavversario[j], NOESEGUI);
			}
			else this.taoff(j);
		}

		return;
	},

	scalamouseup: function (ev) {

		if (!scala.scaladown) {
			if (this.pointerinelement(ev, "#mazzo") && (!this.pescato)) return this.cartapesca();
			if (this.pointerinelement(ev, "#giocatore") && (!this.pescato)) return this.cartapesca();
			if (this.pointerinelement(ev, "#scarti")) return this.scartipesca();
			if (this.pointerinelement(ev, "#trisgiocatore") && (this.pescato)) return this.scartatrisgiocatore();
			return;
		}
		this.scaladown = false;

		var divCard = this.cartadown;
		var carta = divCard.card;

		if ((!scala.scalamove) && (this.pescato)) { this.selezionacartagiocatore(divCard); return; }

		var newindex = 0;
		var currentindex = (carta.left - (this.giocatore.left + this.giocatore.offsetx)) / this.giocatore.deltax;

		if (this.pointerinelement(ev, "#giocatore") && (carta.left > 0) && (this.scalamove) && (carta.gruppo == scala.giocatore)) {
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
		else {
			if (this.pointerinelement(ev, "#scarti") && (this.pescato)) return this.scarta(carta);
			if ((this.pointerinelement(ev, "#trisgiocatore"))
				&& (this.pescato)
				&& (this.trisgiocatore.carte.length > 0)
				&& (this.giocatore.carte.length != 1)) {
				this.tgon();
				this.cercamatch(this.trisgiocatore, ESEGUI);
			}
			else this.tgoff();

			for (var j = 0; j < scala.numeroavversari; j++) {

				if ((this.pointerinelement(ev, ("#trisavversario" + (j + 1))))
					&& (this.pescato)
					&& (this.campitrisavversario[j].carte.length > 0)
					&& (this.giocatore.carte.length != 1)
					&& (this.calcolapuntitris(this.trisgiocatore.carte) > 39)) {
					this.taon(j);
					this.cercamatch(this.campitrisavversario[j], ESEGUI);
				}
				this.taoff(j);
				$$.removeClassAll(".card", "cardselected");
			}
		}

		this.scalamove = false;
		this.render();
		return;
	},

	cercamatch: function (cont, esegui) {
		var SINISTRA = true;
		var DESTRA = false;
		var ncarte = cont.carte.length;
		for (var i = 0; i < ncarte; i++) $$.removeClass(cont.carte[i].gui, "cardselected");
		var cartaleft = parseInt(this.cartadown.style.left, 10);

		for (var i = 0; i < ncarte; i++) {
			if (cont.carte[i].left > cartaleft) break;
		}
		if (i == 0) return this.checkcarta(cont, 0, SINISTRA, esegui);
		if (i == ncarte) return this.checkcarta(cont, ncarte - 1, DESTRA, esegui);
		if ((cartaleft - cont.carte[i - 1].left) > (2 * cont.deltax)) return this.checkcarta(cont, i, SINISTRA, esegui);
		else return this.checkcarta(cont, i - 1, DESTRA, esegui);
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

		if ((cartasel.numero > 49) && (carta.numero < 49)) {
			var salvacarta = tris[indicetris];
			if (tipotris == SCALA) {
				tris[indicetris] = carta;
				if (this.checktris(tris, SORTED)) this.scambiacarte(carta, cartasel, esegui);
				else {
					tris[indicetris] = salvacarta;
					if (indicetris == 0) {
						tris.splice(0, 0, carta);
						if (this.checktris(tris, SORTED)) this.aggiungitris(cont, indice, carta, cartasel, esegui);
					}
					else {
						if (indicetris == tris.length - 1) {
							tris.splice(tris.length, 0, carta);
							if (this.checktris(tris, SORTED)) this.aggiungitris(cont, indice + 1, carta, cartasel, esegui);
						}
					}
				}
				return;
			}
			else {
				if ((carta.seme == tris[indicetris].tipojolly) &&
					(carta.numero == tris[indicetris].numerojolly)) {
					{ this.scambiacarte(carta, cartasel, esegui); return; }
				}
			}
		}

		if (left) {
			tris.splice(indicetris, 0, carta);
			if (this.checktris(tris, SORTED)) this.aggiungitris(cont, indice, carta, cartasel, esegui);
		}
		else {
			tris.splice(indicetris + 1, 0, carta);
			if (this.checktris(tris, SORTED)) this.aggiungitris(cont, indice + 1, carta, cartasel, esegui);
		}
		return;
	},

	scambiacarte: function (carta, cartasel, esegui) {
		$$.addClass(cartasel.gui, "cardselected");
		if (esegui) {
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
			carta.gruppo = contenitore2;
			temp = carta.ntris;
			carta.ntris = cartasel.ntris;
			cartasel.ntris = temp;
			cartasel.gruppo = contenitore1;
			contenitore1.carte[posizione1] = cartasel;
			contenitore2.carte[posizione2] = carta;
			cartasel.tipojolly = "J";
			this.render();
			suona(perjolly);
			scala.pushstato("scambiajolly");
			$$.removeClass(cartasel.gui, "cardselected");
		}
	},

	aggiungitris: function (cont, indice, carta, cartasel, esegui) {
		$$.addClass(cartasel.gui, "cardselected");
		if (esegui) {
			this.rimuovicarta(carta);
			carta.gruppo = cont;
			carta.ntris = cartasel.ntris;
			carta.tipotris = cartasel.tipotris;
			if (carta.numero > 49) {
				if (carta.tipotris == SCALA) {
					carta.tipojolly = scala.trisdata.semescala;
					var i;
					for (i = 0; i < cont.carte.length; i++) { if (cont.carte[i].ntris == cartasel.ntris) break; }
					carta.numerojolly = scala.trisdata.primonumero + indice - i;
				}
				else {
					for (var i = 0; i < cont.carte.length; i++) {
						if ((cont.carte[i].ntris == carta.ntris) && (cont.carte[i].numero > 49)) {
							scala.trisdata.semidausare.togli(cont.carte[i].tipojolly);
						}
					}
					carta.tipojolly = scala.trisdata.semidausare.pop();
					carta.numerojolly = scala.trisdata.primonumero;
				}
			}
			carta.faceUp = true;
			cont.carte.splice(indice, 0, carta);
			suona(slitta);
			this.pushstato("aggiungitris " + carta.shortName);

			this.render();
			$$.removeClass(cartasel.gui, "cardselected");
		}
	},

	rimuovicarta: function (carta) {
		var cont = carta.gruppo.carte;
		var posizione = cont.indexOf(carta);
		cont.splice(posizione, 1);
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

		var annulla40 = (function () {
			while (scala.trisgiocatore.carte.length > 0) { scala.undo(); }
			while ((scala.fscartipesca) && (scala.pescato)) { scala.undo(); }
			this.hidedialog();
		});

		scala.jollymodificabili = [];
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
			window.setTimeout(function () { scala.mossaavversario(0); }, 1000);
		}
		this.render();
	},

	mostradialogo: function (dialogo) {
		var selector = (dialogo.indexOf('#') === 0) ? dialogo : '#' + dialogo;
		var el = $$.one(selector);
		$$.css(el, { "z-index": "50000" });
		$$.show(el);

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
		localStorage.setItem('scala40bis_totalelimite', valore);
		scala.hidedialog();
		scala.render();
	},

	nuovo2: function () {
		scala.salvaavversari = scala.numeroavversari;
		var radio = document.querySelector('input[name="avversari"][value="' + scala.numeroavversari + '"]');
		if (radio) radio.click();
		scala.mydialog("formnuovo", scala.nuovo3);
	},

	nuovo3: function () {
		var checked = document.querySelector('input[name="avversari"]:checked');
		var tempavversari = checked ? checked.value : scala.salvaavversari;
		if (tempavversari != scala.salvaavversari) scala.azzeratotale();
		this.numeroavversari = tempavversari;
		localStorage.setItem('scala40bis_numeroavversari', tempavversari);
		scala.nuovo();
	},

	nuovo: function () {
		localStorage.setItem('scala40bis_stato', JSON.stringify({
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

		if (typeof (sorgente.carte) != "undefined") { carta = sorgente.carte.pop(); }
		else {
			carta = sorgente;
			var posizione = sorgente.gruppo.carte.indexOf(carta);
			sorgente.gruppo.carte.splice(posizione, 1);
		}

		if (toggle == "toggle") carta.faceUp = !carta.faceUp;
		if (toggle == "faceUp") carta.faceUp = true;
		if (toggle == "faceDown") carta.faceUp = false;
		carta.gruppo = destinazione;
		destinazione.carte.push(carta);
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

		this.checktris(tris, SORTED);
		for (var i = 0; i < ncarte; i++) {
			var carta = tris[i];
			carta.ntris = ntris;
			$$.removeClass(carta.gui, "cardselected");
			carta.selected = false;
			if (carta.seme == "J") {
				if (carta.tipotris == SCALA) {
					carta.tipojolly = this.trisdata.semescala;
					carta.numerojolly = this.trisdata.primonumero + i;
					if (carta.numerojolly == 14) carta.numerojolly = 1;
				}
				else {
					carta.numerojolly = this.trisdata.primonumero;
					carta.tipojolly = (this.trisdata.semidausare).pop();
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

	render: function () {

		if ((scala.dopo) && ((scala.turno != -1) && scala.astato == "nextavv")) return;

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

		this.rendicontenitore(this.mazzo);
		this.rendicontenitore(this.scarti);
		this.rendicontenitore(this.giocatore);
		this.rendicontenitore(this.trisgiocatore);

		for (var j = 0; j < this.numeroavversari; j++) {
			this.rendicontenitore(this.campiavversario[j]);
			this.rendicontenitore(this.campitrisavversario[j]);
		}

		if (this.pescato) $$.css($$.one("#giocatore"), { "border-color": "yellow" });
		else $$.css($$.one("#giocatore"), { "border-color": "grey" });
		if (this.turno == -1) $$.css($$.one("#etgiocatore"), { "color": "yellow" });
		else $$.css($$.one("#etgiocatore"), { "color": "#888888" });
		for (var j = 0; j < this.numeroavversari; j++) {
			if (j == this.turno) $$.css($$.one("#etavversario" + (j + 1)), { "color": "yellow" });
			else $$.css($$.one("#etavversario" + (j + 1)), { "color": "#888888" });
		}
	},

	rendicontenitore: function (cont, speed) {
		var velocita = speed || 400;
		var newtop, newleft, carta, divCard;
		for (var i = 0; i < cont.carte.length; i++) {
			carta = cont.carte[i];
			divCard = carta.gui;

			newtop = cont.top + cont.offsety + Math.floor(i * cont.deltay);
			newleft = cont.left + cont.offsetx + Math.floor(i * cont.deltax) + cont.xtris * carta.ntris;

			carta.top = newtop;
			carta.left = newleft;
			carta.zindex = i;

			var currentLeft = parseInt(divCard.style.left) || 0;
			var currentTop = parseInt(divCard.style.top) || 0;
			var currentZ = parseInt(divCard.style.zIndex) || 0;

			var isPositionsSame = Math.abs(currentLeft - newleft) < 1 && Math.abs(currentTop - newtop) < 1;
			var isZIndexSame = currentZ === i;

			if (isPositionsSame && isZIndexSame) {
				this.showcard(carta);
				continue;
			}

			if (scala.immediato) {
				applyImmediate(divCard, { "top": newtop, "left": newleft, "z-index": i });
			}
			else {
				animateEl(divCard, { "top": newtop, "left": newleft, "z-index": i }, velocita);
			}
			this.showcard(carta);
		}
	},

	cartapesca: function () {

		if (this.turno != -1) return;
		this.fscartipesca = false;

		if (scala.statostack.length == 0) this.pushstato("iniziale");
		this.pescato = true;
		this.muovicarta(this.mazzo, this.giocatore, "faceUp", "cartapesca");
		pesca.play();

		this.render();
		return;
	},

	scartipesca: function () {
		if (this.turno != -1) return;
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
		this.muovicarta(this.scarti, this.giocatore, "faceUp", "scartipesca");

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
				this.selezionacarta(divCard);
				break;

			case 1:
				if (this.check1(divCard)) this.selezionacarta(divCard);
				break;

			default:
				this.selezionacarta(divCard);

				if (!this.checktris(this.carteselezionate)) this.deselezionacarta(divCard);
				break;
		}
	},

	check1: function (divCard) {
		var k = this.carteselezionate[0];
		var n = divCard.card;
		if (k.seme == "J") {
			if (n.seme != "J") return true;
			if (this.duejolly) return true;
			return false;
		}
		if (n.seme == "J") return true;
		if (n.seme == k.seme) {
			if (Math.abs(n.numero - k.numero) == 1) return true;
			if (Math.abs(n.numero - k.numero) == 12) return true;
			return false;
		}
		else if (n.numero == k.numero) return true;
		return false;
	},

	checktris: function (arraycards, nosort) {
		var ncarte = arraycards.length;
		if (ncarte < 3) return false;
		if (ncarte > 13) return false;

		var carte = arraycards;

		if (typeof (nosort) == "undefined") {
			carte.sort(function (a, b) {
				if (a.zindex > b.zindex) return 1;
				if (a.zindex < b.zindex) return -1;
				return 0;
			});
		}

		var semidausare = { "C": true, "Q": true, "F": true, "P": true };

		var primonumero = 100;
		var numerojolly = 0;
		this.trisdata.jollycontenuti = [];

		var trovatotris = true;
		var i;
		if (ncarte < 5) {
			for (i = 0; i < ncarte; i++) {
				if (carte[i].numero > 49) {
					numerojolly++;
					this.trisdata.jollycontenuti.push(carte[i]);
					continue;
				}
				if (primonumero > 49) primonumero = carte[i].numero;
				if (carte[i].numero != primonumero) { trovatotris = false; break; }
				if (!semidausare[carte[i].seme]) { trovatotris = false; break; }
				semidausare[carte[i].seme] = false;
			}
			if ((trovatotris) && (ncarte != numerojolly) && (this.duejolly || (numerojolly < 2))) {
				for (i = 0; i < ncarte; i++) {
					carte[i].tipotris = TRIS;
				}
				this.trisdata.tipotris = TRIS;
				this.trisdata.semidausare = [];
				this.trisdata.primonumero = primonumero;
				for (var member in semidausare) { if (semidausare[member]) this.trisdata.semidausare.push(member); }

				return true;
			}
		}

		var primonumero2 = carte[0].numero + 1;
		var primoseme = carte[0].seme;
		var oltrekappa = false;
		var numerojolly2 = 0;
		this.trisdata.jollycontenuti = [];

		trovatotris = true;
		for (i = 1; i < ncarte; i++, primonumero2++) {
			if (oltrekappa && (primonumero2 == 2)) { trovatotris = false; break; }
			if (primonumero2 == 14) { primonumero2 = 1, oltrekappa = true; }
			if (carte[i].numero > 49) {
				numerojolly2++;
				this.trisdata.jollycontenuti.push(carte[i]);
				continue;
			}
			if (primonumero2 > 49) {
				primonumero2 = carte[i].numero; primoseme = carte[i].seme;
				numerojolly2++;
				this.trisdata.jollycontenuti.splice(0, 0, carte[i]);
			}
			if (carte[i].numero != primonumero2) { trovatotris = false; break; }
			if (carte[i].seme != primoseme) { trovatotris = false; break; }
			if (primonumero2 == 13) { primonumero2 = 0, oltrekappa = true; }
		}
		if (trovatotris) {
			if (primonumero2 < 3) primonumero2 += 13;
			this.trisdata.primonumero = primonumero2 - i;
			for (var j = 0; j < ncarte; j++) { carte[j].tipotris = SCALA; }
			this.trisdata.tipotris = SCALA;
			this.trisdata.semescala = primoseme;
			return true;
		}
		return false;
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

		var backx, backy, stepx = -71, stepy = -96, bsx = 1233, bsy = 384;
		if (this.numeroavversari > 2) { stepx = -52, stepy = -70, bsx = 903, bsy = 280; }
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

	tgon: function (ev) {
		$$.css($$.one("#trisgiocatore"), { "border-color": "yellow" });
	},
	tgoff: function (ev) {
		$$.css($$.one("#trisgiocatore"), { "border-color": "gray" });
	},

	taon: function (avv) {
		$$.css($$.one("#trisavversario" + (avv + 1)), { "border-color": "yellow" });
	},
	taoff: function (avv) {
		$$.css($$.one("#trisavversario" + (avv + 1)), { "border-color": "gray" });
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
				scala.checktris(tris, SORTED);
				if (scala.trisdata.tipotris == TRIS) return false;
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
		if (scala.astato == "playrender") {
			scala.astato = "abortito";
			scala.turno = -1;
		}
		scala.jollymodificabili = [];
		this.render();
	},

	undo: function () {
		this.jollymodificabili = [];
		this.popstato();
		this.render();
	},

	mossaavversario: function () {
		scala.astato = 0;
		return scala.alavorastato();
	},

	alavorastato: function () {
		scala.ritardo = 1000;
		var avv = scala.turno;

		switch (scala.astato) {

			case 0:
				scala.turno = 0;
				avv = 0;
				scala.astato = "nextavv";

			case "nextavv":

				scala.avvsalvalog = scala.statostack.length;
				if (scala.campiavversario[avv].carte.length == 0) { scala.astato = "fineturno"; break; }
				scala.apesca(avv);
				scala.alavora(avv);
				scala.ascarta(avv);
				if (scala.dopo) {
					scala.ritardo = 10;
					scala.astato = "playrender";
					break;
				}
				scala.astato = "fineturno";
				break;

			case "playrender":
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
					scala.astato = "fineturno";
				}

			case "fineturno":

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
						thunder.currentTime = 0;
						thunder.play();
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
					scala.astato = "nextavv";
					scala.turno++;
					scala.ritardo = 10;
					break;
				}
				else {
					scala.turno = -1;
					scala.render();
					return;
				}

			case "abortito":
				scala.turno = -1;
				return;

		}
		window.setTimeout(scala.alavorastato, scala.ritardo);
		return;
	},

	calcolapunti: function (gruppo) {
		var punti = 0, valore;
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
			this.checktris(tris, SORTED);
			if (this.trisdata.tipotris == TRIS) {
				valore = this.trisdata.primonumero;
				if (valore == 1) valore = 11;
				else if (valore > 10) valore = 10;
				punti += valore * tris.length;
			}
			else {
				valore = this.trisdata.primonumero;
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
		var centinaia, decine, unita, altezza;
		if (punti > 999) punti = 999;
		centinaia = Math.floor(punti / 100); punti -= (centinaia * 100);
		decine = Math.floor(punti / 10); punti -= (decine * 10);
		unita = punti;

		var digit3 = $$.one("#" + display + " #digit3");
		var digit2 = $$.one("#" + display + " #digit2");
		var digit1 = $$.one("#" + display + " #digit1");

		altezza = parseInt(digit3.style.height, 10) || 0;

		var pippocentinaia = parseInt((digit3.style.backgroundPosition || "0px 0px").split(" ")[1], 10) || 0;
		animateEl(digit3, { "pippocentinaia": ((-altezza * centinaia) + "px") }, 400, {
			customStart: pippocentinaia,
			step: function (now) {
				digit3.style.backgroundPosition = "0px " + now + "px";
			}
		});

		var pippodecine = parseInt((digit2.style.backgroundPosition || "0px 0px").split(" ")[1], 10) || 0;
		animateEl(digit2, { "pippodecine": ((-altezza * decine) + "px") }, 400, {
			customStart: pippodecine,
			step: function (now) {
				digit2.style.backgroundPosition = "0px " + now + "px";
			}
		});

		var pippounita = parseInt((digit1.style.backgroundPosition || "0px 0px").split(" ")[1], 10) || 0;
		animateEl(digit1, { "pippounita": ((-altezza * unita) + "px") }, 400, {
			customStart: pippounita,
			step: function (now) {
				digit1.style.backgroundPosition = "0px " + now + "px";
			}
		});
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
				scala.checktris(tris, SORTED);
				if (scala.trisdata.tipotris == TRIS) {
					if (scala.trisdata.primonumero != carta.numero) continue;
					if (scala.trisdata.semidausare.indexOf(carta.seme) < 0) continue;
					return salvacarta(ultimacartatris + 1);
				}
				else {
					if (scala.trisdata.semescala != carta.seme) continue;
					if (scala.trisdata.primonumero == carta.numero + 1) return salvacarta(ultimacartatris + 1 - tris.length);
					var prossimacarta = scala.trisdata.primonumero + tris.length;
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
				tempor.primonumero = scala.trisdata.primonumero;
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
				scala.checktris(tris, SORTED);
				if (scala.trisdata.tipotris == TRIS) continue;
				else {
					if (scala.trisdata.semescala != carta.seme) continue;
					if (scala.trisdata.primonumero == carta.numero + 2) return salvacarta(ultimacartatris + 1 - tris.length, true);
					var prossimacarta = scala.trisdata.primonumero + tris.length + 1;
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

		var coppia;
		while (this.f40avversario[avv] && (this.jollyrecuperabili.length > 0)) {
			coppia = this.jollyrecuperabili.pop();
			this.scambiacarte(coppia["cartagruppo"], coppia["jolly"], ESEGUI);
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
				scala.trisdata.semescala = temp.carta.seme;
				scala.trisdata.primonumero = temp.primonumero;
				if (!temp.messeprima) {
					this.aggiungitris(temp.cont, temp.indice, this.campiavversario[avv].carte[lung - 1], temp.cartatris, ESEGUI);
					this.aggiungitris(temp.cont, temp.indice + 1, temp.carta, temp.cartatris, ESEGUI);
				}
				else {
					scala.trisdata.primonumero -= 1;
					this.aggiungitris(temp.cont, temp.indice, this.campiavversario[avv].carte[lung - 1], temp.cartatris, ESEGUI);
					this.aggiungitris(temp.cont, temp.indice, temp.carta, temp.cartatris, ESEGUI);
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
			scala.checktris(tris, SORTED);
			if (scala.trisdata.tipotris == TRIS) {
				if (tris.length > 3) continue;
				this.aggiungitris(contx, ultimacartatris + 1, carta, contx.carte[ultimacartatris], ESEGUI);
				return true;
			}
			else {
				if ((scala.trisdata.primonumero != 1) && (tris.length < 14)) {
					scala.trisdata.primonumero -= 1;
					this.aggiungitris(contx, ultimacartatris - tris.length + 1, carta, contx.carte[ultimacartatris - tris.length + 1], ESEGUI);
					return true;
				}
				else {
					this.aggiungitris(contx, ultimacartatris + 1, carta, contx.carte[ultimacartatris], ESEGUI);
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
			for (var i = 0; i < this.campiavversario[avv].carte.length; i++) {
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

	calcolatotali: function () {

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
	console.log("Document ready! (scala40bis)");
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
