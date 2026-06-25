window.spiderI18n = {
    'moves': { it: 'Mosse: ', en: 'Moves: ' },
    'undo': { it: 'Annulla: ', en: 'Undo: ' },
    'time': { it: 'Tempo: ', en: 'Time: ' },
    'games': { it: 'Partite: ', en: 'Games: ' },
    'best_score': { it: 'Miglior Punt.: ', en: 'Best score: ' },
    'best_time': { it: 'Miglior Tempo: ', en: 'Best Time: ' }
};
window.t = function(key) {
    var lang = document.documentElement.lang || 'it';
    return window.spiderI18n[key] ? (window.spiderI18n[key][lang] || key) : key;
};

function log(msg) {
	if (window.console && log.enabled) {
		console.log(msg);
	}
} // log  -
log.enabled = true;

//log(location.href);
log(location.search);

function suona(suono) {
	if ((scala.turno != -1) && (scala.dopo)) {
		scala.salvasuono = suono;
	}
	else {
		if (scala.currentAudio) {
			scala.currentAudio.pause();
			scala.currentAudio.currentTime = 0;
		}
		scala.currentAudio = suono;
		suono.play();
	}
}




Array.prototype.togli = function (elemento) {
	var indice = this.indexOf(elemento);
	this.splice(indice, 1);
}

var CUORI = "C", QUADRI = "Q", FIORI = "F", PICCHE = "P", JOLLY = "J";
var valoreseme = { "F": 0, "Q": 1, "C": 2, "P": 3, "J": 4 };
var semevalore = ["F", "Q", "C", "P", "J"];
var RETROROSSO = 0, RETROBLU = 1;

var scarta = document.getElementById("scarta");
var pesca = document.getElementById("pesca");
var ordina = document.getElementById("ordina");
var ding = document.getElementById("ding");
var applause = document.getElementById("applause");
var distribuisci = document.getElementById("distribuisci");
var tada = document.getElementById("tada");


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
		this.id = indice;   //id univoco per ogni carta
		this.selected = false;
		this.posdestx = 0;
		this.posdesty = 0;
		this.posrefx = 0;
		this.posrefy = 0;
		this.dragging = false;
		this.contenitore = 0;
		this.moving = false;     //la carta e' in movimento
		this.startmove = 0;      //tempo inizio movimento in ms, da performance.now();
		this.timemove = 1000;    //durata movimento in ms;



	}
}

//carte: 1-13   = 1 - RE,  50=jolly rosso, 51=jolly nero


$('#canvasgioco').mousedown(function (ev) {
	scala.giocodown(ev);
});

$('#canvasgioco').mousemove(function (ev) {
	scala.giocomove(ev);
});


$('#canvasgioco').mouseup(function (ev) {
	scala.giocoup(ev);
});

$('#campogioco').mouseup(function (ev) {    // se uno rilascia il mouse fuori da canvasgioco
	if (scala.scaladown)
		scala.giocoup(ev);
});

function touchOffset(ev) {
	var canvas = document.getElementById('canvasgioco');
	var rect = canvas.getBoundingClientRect();
	var t = (ev.touches && ev.touches.length) ? ev.touches[0] : ev.changedTouches[0];
	return {
		offsetX: (t.clientX - rect.left) * (canvas.width / rect.width),
		offsetY: (t.clientY - rect.top)  * (canvas.height / rect.height)
	};
}

$('#canvasgioco').on('touchstart', function(ev) {
	ev.preventDefault();
	scala.giocodown(touchOffset(ev.originalEvent));
});

$('#canvasgioco').on('touchmove', function(ev) {
	ev.preventDefault();
	scala.giocomove(touchOffset(ev.originalEvent));
});

$('#canvasgioco').on('touchend', function(ev) {
	ev.preventDefault();
	scala.giocoup({});
});

$('#campogioco').on('touchend', function(ev) {
	if (scala.scaladown) {
		ev.preventDefault();
		scala.giocoup({});
	}
});


$('#canvasmazzo').click(function (ev) {
	scala.mazzoclick(ev);
});

$('#autocomplete').click(function (ev) {
	scala.fautocomplete = true;
	scala.dirty = true;
});



var scala = {



	statostack: [],


	steccastepx: 100,
	steccastepy: 22,
	steccaoffsetx: 2,
	steccaoffsety: 128,
	mazzooffsetx: 802,
	mazzooffsety: 5,
	mazzostepx: 25,
	pileoffsetx: 2,
	pileoffsety: 5,
	pilestepx: 100,
	altezzacarta: 119,
	larghezzacarta: 88,

	start: function () {
		this.inizializzazioni();
		this.creamazzi();
		this.shuffle();
		this.shuffle();   //provo a mescolare 2 volte
		this.createDeckElements();
		//this.givecards(); 
		window.requestAnimationFrame(scala.refresh);
		return;
	},


	inizializzazioni: function () {

		canvasg = document.getElementById("canvasgioco");
		// richiede al canvas il contesto 2D
		ctxg = canvasg.getContext('2d');

		// canvasdati rimosso: le statistiche sono disegnate su canvasgioco

		/*    	canvasm = document.getElementById("canvasmazzo");
					// richiede al canvas il contesto 2D
					ctxm = canvasm.getContext('2d');    */


		icarte = new Image();
		icarte.onload = function() { scala.dirty = true; };
		icarte.src = "images/scala40/conjollyplus.png";

		icartesel = new Image();
		icartesel.onload = function() { scala.dirty = true; };
		icartesel.src = "images/scala40/conjollyselplus.png";

		icartescoperte = new Image();
		icartescoperte.onload = function() { scala.dirty = true; };
		icartescoperte.src = "images/scala40/conjollyselblu.png";

		tappetoscuretto = new Image();
		tappetoscuretto.onload = function() { scala.dirty = true; };
		tappetoscuretto.src = "images/scala40/tappetoverdescuretto.png";

		//ctxg.drawImage(tmmetronomo, 50, 50,250,500);

		//ctxg.fillStyle="yellow";
		//ctxg.fillRect(0,0,100,200);

		//context.drawImage(img,sx,sy,swidth,sheight,x,y,width,height);
		//ctxg.drawImage(icarte, 0, 0,100,100,10,10,50,50);



		scala.stecche = [];
		for (var i = 0; i < 10; i++) {
			scala.stecche[i] = [];
		}
		scala.pile = [];
		for (var i = 0; i < 8; i++) {
			scala.pile[i] = [];
		}

		scala.moving = false;
		scala.cartadown = {};
		scala.gruppomove = {};
		scala.speed1 = 200;      //ms velocità spostamenti
		scala.scaladown = false;
		scala.scalamove = false;
		scala.scaladownx = 0;
		scala.scaladowny = 0;
		scala.deltamovex = 0;
		scala.deltamovey = 0;

		scala.moves = 0;
		scala.numeroundo = 0;
		scala.startgioco = performance.now();
		scala.games = 1;
		scala.besttime = 0;
		scala.bestscore = 0;
		scala.compresse = [];
		scala.limitecompresse = 18;

		scala.fautocomplete = false;
		scala.dirty = true;


		//this.start();
		scala.games = parseInt(localStorage.getItem('spider_games') || '0', 10);


		this.fscalauptouch = false;
		this.fmodale = false;
		this.turno = -1;						//turno del giocatore

		this.cartescoperte = false;				//avversario e mazzo a carte scoperte

		this.modale = false;


	},


	//trasforma sec_num secondi in stringa hh:mm:ss

	totime: function (sec_num) {
		var hours = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);

		if (hours < 10) { hours = "0" + hours; }
		if (minutes < 10) { minutes = "0" + minutes; }
		if (seconds < 10) { seconds = "0" + seconds; }
		return hours + ':' + minutes + ':' + seconds;
	},


	giocodown: function (ev) {


		var puntacarta = {};
		scala.deselect();
		if (scala.trovacarta(ev.offsetX, ev.offsetY, puntacarta)) {
			scala.dirty = true;
			scala.cartadown.stecca = puntacarta.stecca;   //numero stecca
			scala.cartadown.ncarta = puntacarta.ncarta;
			scala.cartadown.carta = scala.stecche[puntacarta.stecca][puntacarta.ncarta];


			scala.scaladown = true;
			scala.scalamove = false;
			scala.scaladownx = ev.offsetX;
			scala.scaladowny = ev.offsetY;
			scala.deltamovex = 0;
			scala.deltamovey = 0;
			scala.checkgruppo(scala.cartadown);
		}
		return;
	},

	giocomove: function (ev) {

		if (!scala.scaladown) return;
		var deltax = ev.offsetX - scala.scaladownx;
		var deltay = ev.offsetY - scala.scaladowny;
		scala.deltamovex = deltax;
		scala.deltamovey = deltay;
		scala.dirty = true;


		if (!this.scalamove) { if ((Math.abs(deltax) < 5) && (Math.abs(deltay) < 5)) return; }

		scala.deselect();
		this.scalamove = true;
		//scala.gruppomove.stecca  .prima  .ncarte
		var stecca = scala.gruppomove.stecca;
		for (var i = 0; i < scala.gruppomove.ncarte; i++) {
			stecca[i + scala.gruppomove.prima].dragging = true;
		}


		//identifica la stecca dove poter attaccare le carte
		var primacarta = scala.gruppomove.stecca[scala.gruppomove.prima];
		var centrocarta = primacarta.posrefx + deltax + scala.larghezzacarta / 2;
		//la stecca più vicina è quella dove cade centrocarta
		var nsteccavicina = parseInt((centrocarta - scala.steccaoffsetx) / scala.steccastepx);
		scala.gruppomove.nsteccaattacca = 100;


		if ((nsteccavicina < 10)) {
			steccavicina = scala.stecche[nsteccavicina];

			if (steccavicina.length != 0) {
				if (steccavicina[steccavicina.length - 1].numero == (primacarta.numero + 1)) {
					steccavicina[steccavicina.length - 1].selected = true;
					scala.gruppomove.nsteccaattacca = nsteccavicina;
				}
			}
			else scala.gruppomove.nsteccaattacca = nsteccavicina;
		}
		log(nsteccavicina + " " + scala.gruppomove.nsteccaattacca);
	},


	giocoup: function (ev) {
		scala.deselect();
		scala.dirty = true;
		if (scala.scaladown) {
			scala.scaladown = false;
			if (!scala.scalamove) {
				if (!scala.checkgruppo(scala.cartadown)) return;
				//ritorna scala.gruppomove.stecca  .prima  .ncarte
				//cerca possibile destinazione

				var stecca = scala.gruppomove.stecca, carta = scala.cartadown.carta;
				var maxstessoseme = 0;   //numero massimo di carte in ordine dello stesso seme
				var minsemediverso = 100; //numero minimo di carte in ordine di seme diverso
				var steccadest = 100;  //stecca trovata di destinazione
				var ncarte;  //carte nella stecca in esame
				var nsequenza; //carte in sequenza nella stecca in esame;

				for (var i = 0; i < 10; i++) {
					if (i == stecca) continue;  // non esaminiamo la stecca con le carte da spostare
					ncarte = scala.stecche[i].length;
					if (ncarte == 0) {
						if (steccadest == 100) { //se non ha trovato altro sceglie la stecca vuota
							steccadest = i;
						}
						continue;
					}
					if (scala.stecche[i][ncarte - 1].numero != carta.numero + 1) continue; //se il numero non combacia
					if (scala.stecche[i][ncarte - 1].seme == carta.seme) { //cerca il massimo numero di carte in sequenza
						for (var j = ncarte - 2; j >= 0; j--) {
							if (!scala.stecche[i][j].faceUp) break;
							if (scala.stecche[i][j].numero != carta.numero + ncarte - j) break;
							if (scala.stecche[i][j].seme != carta.seme) break
						}
						nsequenza = ncarte - j - 1;
						if (nsequenza > maxstessoseme) {
							maxstessoseme = nsequenza;
							steccadest = i;
						}
					}
					else {
						//stecca con seme diverso
						//se già trovata una stecca con stesso seme soprassiede
						if (maxstessoseme != 0) continue;
						for (var j = ncarte - 2; j >= 0; j--) {
							if (!scala.stecche[i][j].faceUp) break;
							if (scala.stecche[i][j].numero != carta.numero + ncarte - j) break;
							if (scala.stecche[i][j].seme == carta.seme) break

						}
						nsequenza = ncarte - j - 1;
						if (nsequenza < minsemediverso) {
							minsemediverso = nsequenza;
							steccadest = i;
						}

					}
				}

				log("steccadest= " + steccadest + ", maxstessoseme= " + maxstessoseme + ", minsemediverso= " + minsemediverso);

				scala.muovigruppo(stecca, steccadest);



			} //if (!scala.scalamove)
			else {
				scala.scalamove = false;
				if (!scala.muovigruppo(scala.stecche[scala.cartadown.stecca], scala.gruppomove.nsteccaattacca)) {

				}

			}
		} //if(scala.scaladown)

	},

	muovigruppo: function (steccasource, nsteccadest) {
		if (nsteccadest == 100) return false
		scala.moves++;
		scala.pushstato();
		var mcarta, lsteccadest = scala.stecche[nsteccadest].length;
		for (var i = 0; i < scala.gruppomove.ncarte; i++) {
			mcarta = steccasource.pop();
			//	mettiinstecca: function(carta,stecca,pos,msec){
			scala.mettiinstecca(mcarta, nsteccadest, lsteccadest + scala.gruppomove.ncarte - 1 - i, 200, true);
		}

		if (steccasource.length > 0) steccasource[steccasource.length - 1].faceUp = true;
		scala.check13();
		var currenttime = parseInt((performance.now() - scala.startgioco) / 1000);
		scala.gametime = currenttime;

		if (scala.pile[7].length != 0) {  // fine gioco
			if (scala.bestscore == 0) {
				scala.bestscore = scala.moves;
				scala.besttime = currenttime;
			} else {
				if (scala.moves < scala.bestscore) scala.bestscore = scala.moves;
				if (scala.currenttime < scala.besttime) scala.besttime = scala.currenttime;
			}
			scala.mydialog("haivinto", scala.nuovo);
			suona(tada);
		}
		scala.calcolacompresse();
		suona(scarta);

		return true;
	},

	deselect: function () {
		for (var i = 0; i < 104; i++) {
			scala.stock[i].selected = false;
			scala.stock[i].dragging = false;
		}

	},

	//***check13***
	//verifica se in una stecca c'è una pila da spostare

	check13: function () {
		var stecca, seme, found13 = false;
		for (var nstecca = 0; nstecca < 10; nstecca++) {
			stecca = scala.stecche[nstecca];
			lung = stecca.length;
			if (lung < 13) continue;
			seme = stecca[lung - 1].seme;
			for (var j = 0; j < 13; j++) {
				if ((stecca[lung - j - 1].numero != (j + 1)) || (stecca[lung - j - 1].seme != seme)) break;
			}
			if (j != 13) continue;
			// trova una pila libera
			for (var pila = 0; pila < 8; pila++) {
				if (scala.pile[pila].length == 0) break;
			}
			//muove le carte nella pila libera
			found13 = true;
			var carta, x, y;
			x = scala.pileoffsetx + scala.pilestepx * pila;
			y = scala.pileoffsety;
			for (var j = 12; j >= 0; j--) {
				carta = stecca.pop();
				scala.pile[pila][j] = carta;
				carta.contenitore = scala.pile[pila];
				carta.posdestx = x + j;
				carta.posdesty = y + j;
				carta.faceUp = true;
				carta.moving = true;
				carta.startmove = performance.now() + 20 * j;
				carta.timemove = 1000;

			}
			if (stecca.length > 0) stecca[stecca.length - 1].faceUp = true;

		}

		scala.deselect();
		scala.calcolacompresse();
		// verifica se ci sono le condizioni per l'autocomplete
		if (scala.mazzo.carte.length == 0) {
			var autocomplete = true;
			var primacarta, seme, primonumero, lung, carta;
			for (nstecca = 0; nstecca < 10; nstecca++) {
				lung = scala.stecche[nstecca].length;
				if (lung == 0) continue;
				primacarta = scala.stecche[nstecca][0];
				seme = primacarta.seme;
				primonumero = primacarta.numero;
				for (var ncarta = 0; ncarta < lung; ncarta++) {
					carta = scala.stecche[nstecca][ncarta];
					if ((carta.faceUp) && (carta.seme == seme) && (carta.numero == (primonumero - ncarta))) continue;
					autocomplete = false;
					break;
				}
			}
			if (autocomplete) $("#autocomplete").show();
			else $("#autocomplete").hide();
			return found13;
		}
	},
	//verifica se la carta puntata da cartagruppo.stecca, cartagruppo.ncarta, cartagruppo.carta, è muovibile e appartiene a un gruppo
	//nel caso seleziona il gruppo e lo identifica in scala.gruppomove.stecca  .prima  .ncarte
	//.prima punta alla prima carta del gruppo, .ncarte indica quante carte.
	// se non è muovibile ritorna false e ncarte=0;

	checkgruppo: function (cartagruppo) {

		scala.gruppomove.ncarte = 0;
		var stecca = scala.stecche[cartagruppo.stecca]
		scala.gruppomove.stecca = stecca;
		var ncarte = stecca.length;
		if (ncarte == 0) return false;   //non dovrebbe succedere
		if (!cartagruppo.carta.faceUp) return false;
		scala.gruppomove.prima = cartagruppo.ncarta;
		if (cartagruppo.ncarta == ncarte - 1) {  //ultima carta. gruppo individuato con una carta
			cartagruppo.carta.selected = true;
			scala.gruppomove.ncarte = 1;
			return true;
		}
		//verifica se le carte successive sono consequenziali
		//il numero di carte rimanenti non può superare il valore della carta -1
		if ((ncarte - 1 - cartagruppo.ncarta) > (cartagruppo.carta.numero - 1)) return false;
		var seme = cartagruppo.carta.seme;
		var numero = cartagruppo.carta.numero - 1;
		for (var i = cartagruppo.ncarta + 1; i < ncarte; i++) {
			if ((stecca[i].seme) != seme) return false;
			if ((stecca[i].numero) != numero) return false;
			numero--;
		}
		// tutto ok, seleziono le carte
		for (var i = cartagruppo.ncarta; i < ncarte; i++) {
			stecca[i].selected = true;
		}
		scala.gruppomove.ncarte = ncarte - cartagruppo.ncarta;
		return true;

	},

	mazzoclick: function (ev) {
		var carta, pos;
		scala.deselect();
		scala.dirty = true;
		if (scala.mazzo.carte.length == 0) return;
		for (var i = 0; i < 10; i++) {
			if (scala.stecche[i].length == 0) {  // non ci devono essere stecche vuote
				scala.mydialog("steccavuota");
				return
			}
		}

		scala.moves++;
		scala.pushstato();
		for (var i = 0; i < 10; i++) {
			carta = scala.mazzo.carte.pop();
			pos = scala.stecche[i].length;
			scala.mettiinstecca(carta, i, pos, 200, false);
		}
		scala.calcolacompresse();
		suona(pesca);


	},

	//se move=true msposta la posizione posizione di riferimento in base ai delta di movimento

	mettiinstecca: function (carta, nstecca, pos, msec, move) {
		scala.stecche[nstecca][pos] = carta;
		carta.contenitore = scala.stecche[nstecca];
		carta.posdestx = scala.steccaoffsetx + scala.steccastepx * nstecca;
		carta.posdesty = scala.steccaoffsety + scala.steccastepy * pos;
		if (move) {
			carta.posrefx += scala.deltamovex;
			carta.posrefy += scala.deltamovey;
		}
		carta.faceUp = true;
		carta.moving = true;
		carta.startmove = performance.now();
		carta.timemove = msec;
	},

	//mette in (punta) il puntatore alla carta individuata dalla posizione xy del mouse
	//punta.stecca   //numero della stecca
	//punta.ncarta = numero della carta
	//punta.carte = quante carte in stecca


	trovacarta: function (x, y, punta) {
		var stecca = parseInt((x - scala.steccaoffsetx / 2) / scala.steccastepx);
		if ((stecca < 0) || (stecca > 9)) return false;
		var carteinstecca = scala.stecche[stecca].length;
		var k = scala.compresse[stecca] * scala.steccastepy / 2;  //offset per carte compresse
		var maxy = (carteinstecca - 1) * scala.steccastepy + scala.steccaoffsety + scala.altezzacarta - k;
		if (y > maxy) return false;
		var carta;
		if ((k == 0)) carta = Math.min(parseInt((y - scala.steccaoffsety) / scala.steccastepy), (carteinstecca - 1));
		else {
			if (y < (k + scala.steccaoffsety)) {
				carta = Math.min(parseInt((y - scala.steccaoffsety) / (scala.steccastepy / 2)), (carteinstecca - 1));
			}
			else {
				carta = Math.min(parseInt((y - scala.steccaoffsety - k) / (scala.steccastepy)) + scala.compresse[stecca], (carteinstecca - 1));
			}
		}

		punta.stecca = stecca;
		punta.carte = carteinstecca;
		punta.ncarta = carta;
		return true;
		return false;
	},
	refresh: function () {

		// Optimize: Only redraw if moving or dirty
		if (!scala.moving && !scala.dirty && !scala.scalamove) {
			window.requestAnimationFrame(scala.refresh);
			return;
		}

		ctxg.clearRect(0, 0, 1000, 700);

		// Score panel background
		var px = 280, py = 620, pw = 360, ph = 72, pr = 10;
		if (scala.bestscore != 0) { ph = 96; py -= 24; }
		ctxg.fillStyle = "rgba(0,0,0,0.45)";
		ctxg.beginPath();
		ctxg.moveTo(px + pr, py);
		ctxg.lineTo(px + pw - pr, py);
		ctxg.arcTo(px + pw, py, px + pw, py + pr, pr);
		ctxg.lineTo(px + pw, py + ph - pr);
		ctxg.arcTo(px + pw, py + ph, px + pw - pr, py + ph, pr);
		ctxg.lineTo(px + pr, py + ph);
		ctxg.arcTo(px, py + ph, px, py + ph - pr, pr);
		ctxg.lineTo(px, py + pr);
		ctxg.arcTo(px, py, px + pr, py, pr);
		ctxg.closePath();
		ctxg.fill();

		ctxg.font = "18px Arial";
		ctxg.font = "16px Arial";
		ctxg.fillStyle = "#cccccc";
		ctxg.fillText(t('games') + scala.games, px + 10, py + 26);
		ctxg.fillText(t('moves') + scala.moves,    px + 10, py + 50);
		ctxg.fillText(t('undo') + scala.numeroundo, px + 120, py + 50);
		ctxg.fillText(t('time') + scala.totime(parseInt((performance.now() - scala.startgioco) / 1000)), px + 220, py + 50);

		if (scala.bestscore != 0) {
			ctxg.fillText(t('best_score') + scala.bestscore,              px + 10,  py + 76);
			ctxg.fillText(t('best_time')  + scala.totime(scala.besttime), px + 180, py + 76);
		}

		for (var i = 0; i < 8; i++) {
			ctxg.drawImage(tappetoscuretto, scala.pileoffsetx + scala.pilestepx * i, scala.pileoffsety, scala.larghezzacarta, scala.altezzacarta);
		}



		var len;
		var carta;
		scala.moving = false;

		for (var i = 0; i < 10; i++) {   //Refresh stecche  devo fare così per mantenere l'ordine di sovrapposizione
			len = scala.stecche[i].length;
			for (var j = 0; j < len; j++) {
				carta = scala.stecche[i][j];
				if ((!carta.moving) && (!carta.dragging)) scala.showcarta(carta);		//quelle in movimento le fa alla fine;		
				else scala.moving = true;
			}
		}

		for (var i = 0; i < scala.mazzo.carte.length; i++) {			//refresh mazzo
			carta = scala.mazzo.carte[i];
			scala.showcarta(carta);
			if (carta.moving) scala.moving = true;
		}

		for (var i = 0; i < 8; i++) {   //Refresh pile
			len = scala.pile[i].length;
			for (var j = 0; j < len; j++) {
				carta = scala.pile[i][j];
				scala.showcarta(carta);
				if (carta.moving) scala.moving = true;
			}
		}

		if (scala.moving || scala.scalamove) {
			for (var i = 0; i < 10; i++) {   //Refresh stecche  ripeto carte in movimento per mantenere l'ordine di sovrapposizione
				len = scala.stecche[i].length;
				for (var j = 0; j < len; j++) {
					carta = scala.stecche[i][j];
					if ((carta.moving) || (carta.dragging)) scala.showcarta(carta);		//quelle in movimento le fa alla fine;		
				}
			}
		}

		if ((!scala.moving) && (scala.fautocomplete)) {
			var ultimacarta;
			if (scala.pile[7].length != 0) {  // fine gioco
				if (scala.bestscore == 0) {
					scala.bestscore = scala.moves;
					scala.besttime = parseInt((performance.now() - scala.startgioco) / 1000);
				} else {
					if (scala.moves < scala.bestscore) scala.bestscore = scala.moves;
					if (scala.currenttime < scala.besttime) scala.besttime = scala.currenttime;
				}
				scala.fautocomplete = false;
				scala.mydialog("haivinto", scala.nuovo);
				suona(tada);
			}

			//gestisce l'autocomplete
			if (scala.check13()) {
				scala.moving = true;
			}
			else {   // se si è formato un mazzo completo lo sposta.
				for (var i = 0; i < 10; i++) {   //altrimenti cerca una stecca che comincia con un K
					if ((scala.stecche[i].length != 0) && (scala.stecche[i][0].numero == 13)) {
						//se lo trova cerca una stecca che comincia con una carta successiva all'ultima della stecca trovata
						ultimacarta = scala.stecche[i][scala.stecche[i].length - 1];
						for (var j = 0; j < 10; j++) {
							if (scala.stecche[j].length == 0) continue;
							carta = scala.stecche[j][0];
							if ((carta.numero == ultimacarta.numero - 1) && (carta.seme == ultimacarta.seme)) {
								//trovato. trasferisce le carte della stecche j nella stecca i
								for (var k = 0; k < scala.stecche[j].length; k++) {
									carta = scala.stecche[j][k];
									carta.moving = true;
									carta.posdestx = scala.steccaoffsetx + scala.steccastepx * i;
									carta.posdesty = scala.steccaoffsety + scala.steccastepy * (scala.stecche[i].length + k);
									scala.stecche[i].push(carta);
								}
								scala.stecche[j] = [];
								scala.calcolacompresse(); //mette a posto le posizioni
								scala.moving = true;
								break;
							}
						}
						//se ha trovato una stecca da spostare esce dal ciclo per dare tempo al refresh di muovere le carte
						if (j != 10) break;
					}
				}
				if (i == 10) scala.fautocomplete = false; // non ha trovato nulla
			}
		}

		scala.dirty = false; // Reset dirty flag after draw

		window.requestAnimationFrame(scala.refresh);
	},

	showcarta: function (carta) {

		var backx, backy, stepx = -71, stepy = -96;
		//if (this.numeroavversari>2) {stepx=-52,stepy=-70,bsx=903,bsy=280}
		if ((carta.faceUp == true) || (this.cartescoperte)) {
			if (carta.numero < 50) {  //non jolly
				backx = stepx * (carta.numero - 1);
				backy = stepy * (valoreseme[carta.seme]);
			}
			else {          // jolly
				if (carta.tipojolly == "J") {   //jolly non posizionato
					backx = stepx * 13;
					backy = stepy * (carta.numero - 50);
				}
				else {
					backx = stepx * (14 + carta.numero - 50);
					backy = stepy * (valoreseme[carta.tipojolly]);
				}

			}

		}
		else {  //faccia in giu
			backx = stepx * 16;
			backy = stepy * carta.retro;
		}
		var imgcarte = icarte;
		if (carta.selected) imgcarte = icartesel;
		if ((!carta.faceUp) && scala.cartescoperte) imgcarte = icartescoperte;
		var showx, showy, tempo = performance.now(), percento;

		showx = carta.posrefx;
		showy = carta.posrefy;
		if ((carta.moving) && (tempo > carta.startmove)) {
			if (tempo < carta.startmove + carta.timemove) {
				percento = (tempo - carta.startmove) / carta.timemove;
				showx = carta.posrefx + (carta.posdestx - carta.posrefx) * percento;
				showy = carta.posrefy + (carta.posdesty - carta.posrefy) * percento;
			}
			else {
				carta.moving = false;
				carta.posrefx = carta.posdestx;
				carta.posrefy = carta.posdesty;
				showx = carta.posrefx;
				showy = carta.posrefy;

			}
		}
		if (carta.dragging) {
			showx += scala.deltamovex;
			showy += scala.deltamovey;
		}

		ctxg.drawImage(imgcarte, -backx, -backy, 71, 96,
			showx, showy, scala.larghezzacarta, scala.altezzacarta);
		return;


	},






	creamazzi: function () {

		this.stock = [];
		this.mazzo = { carte: [] };

		var indice = 0;
		for (var retro = 0; retro < 2; retro++) {     //il retro può essere ROSSO (0) o BLU (1)
			for (var i = 1; i <= 13; i++) {
				this.stock[indice] = (new Card(CUORI, i, 0, indice++));
				this.stock[indice] = (new Card(CUORI, i, 0, indice++));
				this.stock[indice] = (new Card(PICCHE, i, 0, indice++));
				this.stock[indice] = (new Card(PICCHE, i, 0, indice++));
			}
		}
	},

	shuffle: function () {
		var i = 104;
		while (--i) {
			var j = Math.floor(Math.random() * (i + 1));
			var tempi = this.stock[i];
			var tempj = this.stock[j];
			this.stock[i] = tempj;
			this.stock[j] = tempi;
		}
	},

	createDeckElements: function () {
		var ncarta = 0; var carta;
		for (; ncarta < 50; ncarta++) {
			carta = this.stock[ncarta];
			carta.contenitore = scala.mazzo.carte;
			carta.posrefx = parseInt(ncarta / 10) * scala.mazzostepx + ncarta % 10 + scala.mazzooffsetx;
			carta.posrefy = scala.mazzooffsety;
			this.mazzo.carte[ncarta] = carta;

		}
		var maxj = 6;
		for (i = 0; i < 10; i++) {
			for (var j = 0; j < maxj; j++) {
				carta = this.stock[ncarta];
				this.stecche[i][j] = carta;
				carta.contenitore = scala.stecche[i];
				carta.posrefx = scala.steccaoffsetx + scala.steccastepx * i;
				carta.posrefy = scala.steccaoffsety + scala.steccastepy * j;
				ncarta++
			}
			this.stecche[i][j - 1].faceUp = true;
			if (i == 3) maxj = 5;
		}
		scala.calcolacompresse();

	},

	// ***calcolacompresse*** per ogni stecca verifica il numero di carte presenti.
	// se supera scala.limitecompresse scrive in scala.compresse[i] il numero di carte da comprimere, pari al doppio di quelle in eccesso
	// altrimenti scrive 0
	// inoltre ricalcola la posizione delle carte
	calcolacompresse: function () {
		for (i = 0; i < 10; i++) {
			var lung = scala.stecche[i].length;
			//var ultimonumero;
			if (lung > scala.limitecompresse) {
				var j = Math.min((lung - scala.limitecompresse) * 2, scala.limitecompresse);


				/*ultimonumero=scala.stecche[i][lung-1].numero;
				for (var j=lung-2;j>0;j--){
					ultimonumero++;
					if (scala.stecche[i][j].numero!=ultimonumero) break;
				}
				j++;*/
				scala.compresse[i] = j;
				//rimette a posto posrefy
				for (var w = 0; w < j; w++) {
					//rimette a posto posrefy
					if (!scala.stecche[i][w].moving) scala.stecche[i][w].posrefy = w * scala.steccastepy / 2 + scala.steccaoffsety;
					else scala.stecche[i][w].posdesty = w * scala.steccastepy / 2 + scala.steccaoffsety;
				}
				var k = scala.steccastepy * j / 2;
				for (; w < lung; w++) {
					//rimette a posto posrefy
					if (!scala.stecche[i][w].moving) scala.stecche[i][w].posrefy = w * scala.steccastepy + scala.steccaoffsety - k;
					else scala.stecche[i][w].posdesty = w * scala.steccastepy + scala.steccaoffsety - k;
				}
			}
			else {
				scala.compresse[i] = 0;
				for (var w = 0; w < lung; w++) {
					//rimette a posto posrefy
					if (!scala.stecche[i][w].moving) scala.stecche[i][w].posrefy = (w * scala.steccastepy + scala.steccaoffsety);
					else scala.stecche[i][w].posdesty = (w * scala.steccastepy + scala.steccaoffsety);
				}
			}
		}
		log(scala.compresse);
	},

	collegaeventi: function () {

		this.scaladown = false;
		this.scalamove = false;



		$("#pulsante2").bind("click", function (ev) {
			return scala.undo();
		});
		$("#scoperte").bind("click", function (ev) {
			return scala.scoperte();
		});


		$('.pulsantehelp').click(function () {
			var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
			window.location.assign('regole-spider' + langSuffix);
		});


		$('.pulsanteaiuto').click(function () {
			var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
			window.location.assign('regole-spider' + langSuffix);
		});

		var btnNuovo = document.getElementById('nuovo');
		if (btnNuovo) {
			btnNuovo.addEventListener('click', function () {
				scala.confirmNuovo();
			});
		}

		var btnNo = document.querySelector('#confermatermina .btn-no-continua');
		if (btnNo) {
			btnNo.addEventListener('click', function () {
				scala.hidedialog();
				var box = document.getElementById('confermatermina');
				if (box) {
					box.style.width = '';
					box.style.height = ''; 
					box.style.top = ''; 
					box.style.left = '';
					box.style.background = '';
					box.style.overflow = '';
					var oldBanner = box.querySelector('.finish-banner');
					if (oldBanner) oldBanner.remove();
				}
			});
		}

		var btnSi = document.querySelector('#confermatermina .btn-si-termina');
		if (btnSi) {
			btnSi.addEventListener('click', function () {
				scala.nuovo();
			});
		}

		$('.bottone1').click(function () {
			log("bottone1 click");
			scala.funzbottone1();
		});
		$('.bottone2').click(function () {
			scala.funzbottone2();
		});



		scala.funzbottone1 = (function () { });
		scala.funzbottone2 = (function () { });


		return
	},

	pushstato: function () {
		//var commento=comm||"nc"
		var stato = {};
		stato.stock = [];
		var copiastock = (function (da, a) {
			for (var i = 0; i < da.length; i++) {
				a[i] = (new Card(0, 0, 0, 0));
				for (var member in da[i]) { a[i][member] = da[i][member] };
			}
		})(scala.stock, stato.stock);

		var copia = function (da, a) {
			a.splice(0, a.length);
			for (var i = 0; i < da.length; i++) {
				a[i] = da[i];
			}
		};

		stato.mazzo = []; copia(scala.mazzo.carte, stato.mazzo);
		stato.stecche = [];
		for (var stecca = 0; stecca < 10; stecca++) {
			stato.stecche[stecca] = []; copia(scala.stecche[stecca], stato.stecche[stecca]);
		}
		stato.pile = [];
		for (var pila = 0; pila < 8; pila++) {
			stato.pile[pila] = []; copia(scala.pile[pila], stato.pile[pila]);
		}
		scala.statostack.push(stato);
		$("#pulsante2").css({ "border-color": "yellow" });
		$("#pulsante2").html("↩");
	},

	popstato: function () {

		if (this.statostack.length == 0) return;
		scala.numeroundo++;

		var stato = this.statostack.pop();



		var copia = function (a, da) {
			a.splice(0, a.length);
			for (var i = 0; i < da.length; i++) {
				a[i] = da[i];
			}
		};
		copia(scala.mazzo.carte, stato.mazzo);
		for (var stecca = 0; stecca < 10; stecca++) {
			copia(scala.stecche[stecca], stato.stecche[stecca]);
		}
		for (var pila = 0; pila < 8; pila++) {
			copia(scala.pile[pila], stato.pile[pila]);
		}


		scala.deselect();
		scala.dirty = true;

		var copiastock = (function (a, da) {
			for (var i = 0; i < da.length; i++) {
				da[i].posdestx = da[i].posrefx;  //per eseguire animazione
				da[i].posdesty = da[i].posrefy;
				if ((a[i].posrefx != da[i].posrefx) || (a[i].posrefy != da[i].posrefy)) {
					da[i].posrefx = a[i].posrefx;
					da[i].posrefy = a[i].posrefy;
					da[i].moving = true;
					da[i].startmove = performance.now();
					da[i].timemove = 200; // Fixed undefined scala.speed1
					scala.moving = true; // Ensure loop runs


				}
				for (var member in da[i]) { a[i][member] = da[i][member]; a[i].selected = false };
			}
		})(scala.stock, stato.stock);



		if (this.statostack.length == 0) $("#pulsante2").css({ "border-color": "#888888" });
		$("#pulsante2").html("↩");
		suona(scarta);
	},



	myalert: function (messaggio) {
		$("#testoallerta").text(messaggio);
		ding.play();
		scala.mydialog("allerta");
	},


	mydialog: function (form, button1, button2) {
		log("mydialog open: " + form);
		scala.formtohide = ("#" + form)
		scala.mostradialogo(scala.formtohide);
		scala.funzbottone1 = (button1) || (this.hidedialog);
		scala.funzbottone2 = (button2) || (this.hidedialog);

	},

	hidedialog: function () {
		log("hidedialog");
		$(scala.formtohide).hide();
		$("#schermo").hide();
		this.fmodale = false;
		scala.dirty = true;
	},


	mostradialogo: function (dialogo) {
		var selector = (dialogo.indexOf('#') === 0) ? dialogo : '#' + dialogo;
		$(selector).show();

		$("#schermo").show();
		this.fmodale = true;
		scala.dirty = true;

		// Gestione Amazon Finish Banner per Spider
		if (window.ENABLE_BANNER_ON_FINISH && typeof setupAmazonFinishBanner === 'function') {
			var id = dialogo.replace('#', '');
			if (id === 'haivinto' || id === 'haiperso' || id === 'haivintotorneo' || id === 'haipersotorneo') {
				try {
					var modal = document.getElementById(id);
					if (modal) {
						var giocatore = document.getElementById('giocatore');
						var targetTop;
						if (giocatore) {
							targetTop = giocatore.offsetTop - (modal.offsetHeight || 280) - 5;
						} else {
							var campogioco = document.getElementById('campogioco');
							var campogiocoHeight = campogioco ? (campogioco.offsetHeight || 750) : 750;
							targetTop = campogiocoHeight - (modal.offsetHeight || 280) - 5;
						}
						modal.style.top = targetTop + 'px';
						modal.style.overflow = 'visible';

						var isEnglish = (window.currentLang === 'en');
						var btnText = isEnglish ? 'VIEW CARDS' : 'VEDI CARTE';

						// 1. Crea il pulsante "VEDI CARTE"
						var btnVedi = modal.querySelector('.btn-vedi-carte');
						if (!btnVedi) {
							btnVedi = document.createElement('button');
							btnVedi.className = 'btn-vedi-carte';
							btnVedi.type = 'button';
							btnVedi.textContent = btnText;
							btnVedi.style.position = 'absolute';
							btnVedi.style.cursor = 'pointer';

							var isToggled = false;
							var originalBg = '';
							var originalBorder = '';
							var originalBoxShadow = '';

							btnVedi.onclick = function (e) {
								if (e) e.stopPropagation();
								isToggled = !isToggled;
								var otherChildren = modal.children;
								var schermo = document.getElementById('schermo');

								if (isToggled) {
									originalBg = modal.style.backgroundImage || getComputedStyle(modal).backgroundImage;
									originalBorder = modal.style.border || getComputedStyle(modal).border;
									originalBoxShadow = modal.style.boxShadow || getComputedStyle(modal).boxShadow;

									if (schermo) schermo.style.display = 'none';
									modal.style.backgroundImage = 'none';
									modal.style.border = 'none';
									modal.style.boxShadow = 'none';
									modal.style.backgroundColor = 'transparent';

									for (var i = 0; i < otherChildren.length; i++) {
										var child = otherChildren[i];
										if (child !== btnVedi) {
											child.style.visibility = 'hidden';
										}
									}
									btnVedi.textContent = isEnglish ? 'BACK' : 'INDIETRO';
								} else {
									if (schermo) schermo.style.display = 'block';
									modal.style.backgroundImage = originalBg;
									modal.style.border = originalBorder;
									modal.style.boxShadow = originalBoxShadow;
									modal.style.backgroundColor = '';

									for (var i = 0; i < otherChildren.length; i++) {
										var child = otherChildren[i];
										child.style.visibility = 'visible';
									}
									btnVedi.textContent = isEnglish ? 'VIEW CARDS' : 'VEDI CARTE';
								}
							};
							modal.appendChild(btnVedi);
						} else {
							btnVedi.textContent = btnText;
						}

						// 2. Riposiziona i pulsanti presenti
						var buttons = modal.querySelectorAll('button');
						var otherButtons = [];
						for (var i = 0; i < buttons.length; i++) {
							if (buttons[i] !== btnVedi) {
								otherButtons.push(buttons[i]);
							}
						}
						if (otherButtons.length === 1) {
							otherButtons[0].style.left = '130px';
							btnVedi.style.left = '270px';
						} else if (otherButtons.length === 2) {
							otherButtons[0].style.left = '60px';
							otherButtons[1].style.left = '200px';
							btnVedi.style.left = '340px';
						}

						// 3. Chiama la funzione generica dei banner senza alterare il modale o i bottoni
						setupAmazonFinishBanner(id, {
							applyModalTop: false,
							targetTop: targetTop,
							leftOffset: -200,
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




	nuovo: function () {
		scala.games++;
		localStorage.setItem('spider_games', scala.games);
		location.reload();
	},
	confirmNuovo: function () {
		if (scala.moves === 0) {
			scala.nuovo();
			return;
		}
		var box = document.getElementById('confermatermina');
		if (!box) return;

		scala.formtohide = '#confermatermina';
		scala.mostradialogo('confermatermina');

		if (window.ENABLE_BANNER_ON_FINISH && typeof setupAmazonFinishBanner === 'function') {
			setupAmazonFinishBanner('confermatermina', {
				modalStyle: {
					width: '700px',
					height: '180px',
					left: '162px',
					background: '#2d5a4a',
					overflow: 'visible'
				},
				targetTop: 470,
				bannerHeight: 390,
				bannerTopOffset: 415,
				leftOffset: 0,
				showVediCarte: false,
				onSetupButtons: function (modal) {
					var btnNo = modal.querySelector('.btn-no-continua');
					var btnSi = modal.querySelector('.btn-si-termina');
					if (btnNo) {
						btnNo.style.top = '110px';
						btnNo.style.width = '240px';
						btnNo.style.left = '80px';
						btnNo.style.fontSize = '20px';
					}
					if (btnSi) {
						btnSi.style.top = '110px';
						btnSi.style.width = '240px';
						btnSi.style.left = '380px';
						btnSi.style.fontSize = '20px';
					}
					var msg = modal.querySelector('.confirm-message');
					if (msg) {
						msg.style.marginTop = '20px';
					}
				}
			});
		} else {
			box.style.width = '';
			box.style.height = ''; 
			box.style.top = ''; 
			box.style.left = '';
			box.style.background = '';
			box.style.overflow = '';
			var btnNo = box.querySelector('.btn-no-continua');
			var btnSi = box.querySelector('.btn-si-termina');
			if (btnNo) {
				btnNo.style.top = ''; 
				btnNo.style.width = ''; 
				btnNo.style.fontSize = ''; 
				btnNo.style.left = '110px'; 
			}
			if (btnSi) {
				btnSi.style.top = ''; 
				btnSi.style.width = ''; 
				btnSi.style.fontSize = ''; 
				btnSi.style.left = '110px'; 
			}
			var msg = box.querySelector('.confirm-message');
			if (msg) {
				msg.style.marginTop = '';
			}
		}
	},







	undo: function () {
		scala.popstato();
	},


	scoperte: function () {
		if (this.cartescoperte) {
			this.cartescoperte = false;
			$("#scoperte").css({ "border-color": "#888888" });
			/*for (var j=0;j<scala.numeroavversari;j++) {
					$("#puntiavversario"+(j+1)).hide();
			}  */

		}
		else {
			this.cartescoperte = true;
			$("#scoperte").css({ "border-color": "yellow" });
			/*for (var j=0;j<scala.numeroavversari;j++) {
			$("#puntiavversario"+(j+1)).show();
	}        */

		}
		//this.render();            
		scala.dirty = true;
	},





}  //scala


$(document).ready(function () {
	function initSpider() {
		scala.start();
		scala.collegaeventi();
	}
	if (typeof window.waitForInterstitial === 'function') {
		window.waitForInterstitial(initSpider);
	} else {
		initSpider();
	}
});


