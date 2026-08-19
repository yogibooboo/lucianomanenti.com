// ============================================================================
// MOTORE AI PREDEFINITO — burraco-engine-default.js
// Dipende da: burraco-core.js (calcolaScoreOpz, varianti, generaAnalisiParallela)
// Contratto: riceve (giocatore, soloMano, verbose, fase)
//            ritorna { scenario, opzIdx, opz, score, scarto, rispettaVincolo, analisiData }
// Coefficienti: burraco-engine-default.json (fallback inline se il JSON non è disponibile)
// ============================================================================

// I coefficienti sono definiti in burraco-engine-default.coeffs.js (caricato prima tramite <script>)

function scegliBestOpzioneAI(giocatore, soloMano, verbose, fase) {
    if (!Strategia || !game) return null;

    // Logger capturante: salva sempre i log in _diagLines, li stampa in console solo se verbose
    const _diagLines = [];
    const _indent = { v: 0 };
    function _fmt(...args) {
        // Converti argomenti in stringa leggibile (salta direttive %c)
        const s = args.map(a => typeof a === 'string' ? a.replace(/%c/g, '') : String(a)).join(' ');
        return '  '.repeat(_indent.v) + s.trim();
    }
    const con = {
        group:    (...a) => { _diagLines.push(_fmt(...a)); _indent.v++; if (verbose) console.group(...a); },
        groupEnd: ()    => { _indent.v = Math.max(0, _indent.v - 1); if (verbose) console.groupEnd(); },
        log:      (...a) => { _diagLines.push(_fmt(...a)); if (verbose) console.log(...a); },
        warn:     (...a) => { _diagLines.push('⚠ ' + _fmt(...a)); if (verbose) console.warn(...a); }
    };
    const nomeC = c => Strategia.nomeCarta ? Strategia.nomeCarta(c) : (c.numero + (c.seme || ''));

    const giocatoreIdx = game.giocatori.indexOf(giocatore);
    const comboSquadra = giocatore.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
    const squadraHaBurraco = comboSquadra.some(cb => cb.isBurraco);
    const faseVincoloMano = giocatore.haPozzetto && !squadraHaBurraco;
    const origMano = r => r.origine === 'mano' || r.origine === 'scarto' || r.origine === 'mazzo';

    function _makesBurraco(mosse) {
        const lenMap = {};
        comboSquadra.forEach(cb => { lenMap[cb.id] = cb.carte.length; });
        for (const m of (mosse || [])) {
            if ((m.tipo === 'tris' || m.tipo === 'scala') && m.carte && m.carte.length >= 7) return true;
            if (m.tipo === 'calata' && m.combo) {
                lenMap[m.combo.id] = (lenMap[m.combo.id] || m.combo.carte.length) + 1;
                if (lenMap[m.combo.id] >= 7) return true;
            }
        }
        return false;
    }

    const scenariDaUsare = soloMano ? ['mano'] : ['mano', 'scarti'];
    const candidati = [];
    const _logPerOpzMap = {}; // popolato se game.debugAI: chiave 'scenario:opzIdx'

    con.group('=== ELABORA: scelta migliore OPZ ===');
    con.log('Giocatore:', giocatore.nome || ('idx=' + giocatoreIdx));
    con.log('Fase vincolo mano (post-pozzetto pre-burraco):', faseVincoloMano, '| haPozzetto:', giocatore.haPozzetto, '| squadraHaBurraco:', squadraHaBurraco, '| squadra:', giocatore.squadra);

    const _analisiDataPerScenario = {};

    for (const scenario of scenariDaUsare) {
        if (scenario === 'scarti' && game.scarti.length === 0) continue;

        const d = Strategia.generaAnalisiParallela(giocatore, scenario);
        // Salva d PRIMA delle varianti (copia shallow di opzioniScenario)
        // così _diagData.analisiDataPerScenario[scenario] è clean (solo OPZ base)
        _analisiDataPerScenario[scenario] = Object.assign({}, d, { opzioniScenario: d.opzioniScenario.slice() });

        // Imposta contesto globale per calcolaScoreOpz / calcolaScartoPer
        window._analisiData = d;
        window._analisiScenario = scenario;
        window._analisiGiocatoreIdx = giocatoreIdx;

        const totalCarteD = d.classifica.filter(origMano).length;

        // Aggiungi varianti B, M e P — mutano d.opzioniScenario in-place
        const bInfo = window._calcolaVariantiB(d, game, giocatoreIdx);
        const mInfo = window._calcolaVariantiM(d, game, giocatoreIdx);
        const pInfo = window._calcolaVariantiP(d, game, giocatoreIdx);
        const bLabelMap = bInfo ? bInfo.bLabelMap : {};
        const mLabelMap = mInfo ? mInfo.mLabelMap : {};
        const pLabelMap = pInfo ? pInfo.pLabelMap : {};

        const opzioniLen = d.opzioniScenario ? d.opzioniScenario.length : 0;
        const opzIdxList = [-1]; // OPZ0: non giocare nulla (sempre disponibile)
        for (let i = 0; i < opzioniLen; i++) opzIdxList.push(i);

        const nB = mInfo ? mInfo.mFirstIdx - bInfo.bFirstIdx : 0;
        const nM = pInfo ? pInfo.pFirstIdx - mInfo.mFirstIdx : 0;
        const nP = pInfo ? opzioniLen - pInfo.pFirstIdx : 0;
        con.group('--- Scenario: ' + scenario + ' ---');
        con.log('OPZ disponibili:', opzIdxList.length, '(di cui B:', nB, 'M:', nM, 'P:', nP + ')');

        for (const opzIdx of opzIdxList) {
            const scoreRes = window.calcolaScoreOpz(opzIdx, true);
            if (game.debugAI) {
                const _logArr = [];
                window.calcolaScoreOpz(opzIdx, true, _logArr);
                _logPerOpzMap[scenario + ':' + opzIdx] = _logArr;
            }
            const opzScore = scoreRes ? scoreRes.score : 0;  // include sc interno
            const mazzBonus = (scenario === 'mano' && window.coeffScoreOpz.premioMazzo !== undefined) ? window.coeffScoreOpz.premioMazzo : 0;
            const _scartiHaMatta = scenario === 'scarti' && game.scarti.some(function(c) { return c.isJolly || c.numero === 2; });
            const mattaBonus = _scartiHaMatta ? (window.coeffScoreOpz.premioMattaPescata || 40) : 0;
            const opzData = opzIdx === -1 ? null : (d.opzioniScenario ? d.opzioniScenario[opzIdx] : null);
            const opz = opzData || { mosse: [], carteUsate: new Set() };
            const scartoCarta = scoreRes ? scoreRes.cartaScarto : '-';

            let rispettaVincolo = true;
            let carteRim = null;
            let pozzBonus = 0;
            const _usate = opzData && opzData.carteUsate ? opzData.carteUsate.size : 0;
            const _burraco = opzData && opzData.mosse ? _makesBurraco(opzData.mosse) : false;
            // Premio pozzetto: si applica in fase pre-pozzetto (indipendentemente da faseVincoloMano)
            // scarti: rimane 1 carta in mano che viene scartata → carteRim=0
            // mano: tutte le carte usate nelle mosse → niente scarto
            if (!giocatore.haPozzetto && !_burraco) {
                const remAfterMoves = totalCarteD - _usate;
                const isPozzetto = scenario === 'scarti' ? remAfterMoves === 1 : remAfterMoves === 0;
                if (isPozzetto) pozzBonus = window.coeffScoreOpz.premioPozzetto || 0;
            }
            if (faseVincoloMano) {
                carteRim = totalCarteD - _usate - 1;
                if (scenario === 'scarti') {
                    rispettaVincolo = carteRim >= 1 || _burraco;
                } else {
                    rispettaVincolo = (totalCarteD - _usate) >= 1 || _burraco;
                }
            }
            if (verbose) {
                const rawLabel = opzIdx === -1 ? 'OPZ0' : 'OPZ' + (opzIdx + 1);
                const opzLabel = bLabelMap[rawLabel] ? bLabelMap[rawLabel] + 'B' : mLabelMap[rawLabel] ? mLabelMap[rawLabel] + 'M' : pLabelMap[rawLabel] ? pLabelMap[rawLabel] : rawLabel;
                if (faseVincoloMano) {
                    con.log(opzLabel + ' [' + scenario + '] → score=' + (opzScore + mazzBonus + mattaBonus + pozzBonus).toFixed(1) + ' (opz=' + opzScore.toFixed(1) + (mazzBonus ? ' mazzo=+' + mazzBonus : '') + (mattaBonus ? ' matta=+' + mattaBonus : '') + (pozzBonus ? ' pozzetto=+' + pozzBonus : '') + ') | scarto=' + scartoCarta + ' | rim=' + carteRim + (_burraco ? ' [BURRACO]' : '') + (pozzBonus ? ' [POZZETTO]' : '') + (rispettaVincolo ? '' : ' ⚠ viola vincolo'));
                } else {
                    con.log(opzLabel + ' → score=' + (opzScore + mazzBonus + mattaBonus + pozzBonus).toFixed(1) + ' (opz=' + opzScore.toFixed(1) + (mazzBonus ? ' mazzo=+' + mazzBonus : '') + (mattaBonus ? ' matta=+' + mattaBonus : '') + (pozzBonus ? ' pozzetto=+' + pozzBonus : '') + ') | scarto=' + scartoCarta + (_burraco ? ' [BURRACO]' : '') + (pozzBonus ? ' [POZZETTO]' : ''));
                }
            }
            const score = opzScore + mazzBonus + mattaBonus + pozzBonus;

            candidati.push({ scenario, opzIdx, opz, score, opzScore, mazzBonus, mattaBonus, pozzBonus, scarto: scoreRes?.cartaRef || null, scartoCarta, rispettaVincolo, carteRim, analisiData: d, _labelMaps: { bLabelMap, mLabelMap, pLabelMap }, _scoreRes: scoreRes });
        }
        con.groupEnd();
    }

    if (candidati.length === 0) { con.groupEnd(); return null; }

    // ===== OPZnC: sacrifica una carta per sbloccare la fase vincolata =====
    if (faseVincoloMano && !soloMano) {
        const dScarti = candidati.find(c => c.scenario === 'scarti')?.analisiData;
        if (dScarti) {
            const bestC = window._calcolaVariantiC(dScarti, game, giocatore, giocatoreIdx);
            if (bestC) {
                // Scarto reale: calcolaScartoPer su dScarti (carta sacrificata ancora candidata)
                const _cCUD = new Set();
                (dScarti.classifica || []).forEach(function(r) {
                    if (!r.cartaRef) return;
                    const oid = r.cartaRef._origineRef ? r.cartaRef._origineRef.id : r.cartaRef.id;
                    const used = (bestC.opz && bestC.opz.mosse || []).some(function(m) {
                        const refs = m.tipo === 'calata' ? [m.carta] : (m.carte || []);
                        return refs.some(function(c) { return c && (c._origineRef ? c._origineRef.id : c.id) === oid; });
                    });
                    if (used) _cCUD.add(r.cartaRef.id);
                });
                const _cVIdx = dScarti.opzioniScenario.length;
                dScarti.opzioniScenario.push({ mosse: [], carteUsate: _cCUD, descCarte: bestC.opzCLabel });
                window._analisiData = dScarti; window._analisiGiocatoreIdx = giocatoreIdx;
                const scartoC = window.calcolaScartoPer(_cVIdx, true);
                dScarti.opzioniScenario.pop();
                con.log(`[OPZnC] ${bestC.opzCLabel}: esclusa=${nomeC(bestC.cartaSacrificata)} scarto=${scartoC ? scartoC.carta : '?'} score=${bestC.score.toFixed(1)}`);
                candidati.push({
                    scenario: 'scarti',
                    opzIdx: bestC.opzIdx,
                    opz: bestC.opz,
                    score: bestC.score,
                    scartoCarta: scartoC ? scartoC.carta : nomeC(bestC.cartaSacrificata),
                    scarto: scartoC?.cartaRef || bestC.cartaSacrificata,
                    rispettaVincolo: true,
                    analisiData: dScarti,
                    isOpzC: true,
                    opzCLabel: bestC.opzCLabel
                });
            }
        }
    }

    // ===== OPZnV: pota le calate finali delle opzioni violanti per soddisfare il vincolo =====
    if (faseVincoloMano) {
        const _violantiScarti = candidati.filter(c => c.scenario === 'scarti' && !c.rispettaVincolo && c.opzIdx >= 0);
        if (_violantiScarti.length > 0) {
            const dScartiV = _violantiScarti[0].analisiData;
            const _totalCarteV = dScartiV ? dScartiV.classifica.filter(origMano).length : 0;
            window._analisiData = dScartiV;
            window._analisiScenario = 'scarti';
            window._analisiGiocatoreIdx = giocatoreIdx;
            const bestV = window._calcolaVariantiV(_violantiScarti, _totalCarteV);
            if (bestV) {
                // Calcola scarto sulla versione potata, con combo proiettate post-calata
                const _vIdx = bestV.analisiData.opzioniScenario.length;
                bestV.analisiData.opzioniScenario.push({ mosse: bestV.mosse, carteUsate: bestV.carteUsate });
                window._analisiData = bestV.analisiData; window._analisiGiocatoreIdx = giocatoreIdx;
                const _giocV = game.giocatori[giocatoreIdx];
                const _comboSqV = _giocV.squadra === 0 ? game.combinazioniNoi : game.combinazioniLoro;
                const _comboSqVProj = window._proiettaComboConCalate(_comboSqV, bestV.mosse);
                const scartoV = window.calcolaScartoPer(_vIdx, true, _comboSqVProj);
                bestV.analisiData.opzioniScenario.pop();
                const _srcLm = bestV.srcCand._labelMaps || {};
                const _srcRaw = bestV.srcCand.opzIdx === -1 ? 'OPZ0' : 'OPZ' + (bestV.srcCand.opzIdx + 1);
                const _srcLbl = (_srcLm.bLabelMap && _srcLm.bLabelMap[_srcRaw]) ? _srcLm.bLabelMap[_srcRaw] + 'B'
                    : (_srcLm.mLabelMap && _srcLm.mLabelMap[_srcRaw]) ? _srcLm.mLabelMap[_srcRaw] + 'M' : _srcRaw;
                const vLabel = _srcLbl + 'V';
                con.log('[OPZnV] ' + vLabel + ': potata da ' + _srcLbl + ' scarto=' + (scartoV ? scartoV.carta : '?') + ' score=' + bestV.score.toFixed(1) + ' rim=' + bestV.rimTrim);
                candidati.push({
                    scenario: 'scarti',
                    opzIdx: -1,
                    opz: { mosse: bestV.mosse, carteUsate: bestV.carteUsate },
                    score: bestV.score,
                    opzScore: bestV.score,
                    mazzBonus: 0,
                    pozzBonus: 0,
                    scartoCarta: scartoV ? scartoV.carta : '-',
                    scarto: scartoV ? scartoV.cartaRef : null,
                    rispettaVincolo: true,
                    carteRim: bestV.rimTrim,
                    analisiData: bestV.analisiData,
                    isOpzV: true,
                    opzVLabel: vLabel,
                    _labelMaps: {}
                });
            }
        }
    }

    candidati.sort((a, b) => b.score - a.score);
    const validati = candidati.filter(c => c.rispettaVincolo);
    const best = validati.length > 0 ? validati[0] : candidati[0];
    const usaFallback = validati.length === 0 && faseVincoloMano;

    con.log('--- TUTTI I CANDIDATI (ordinati per score) ---');
    // Risolve label display (OPZ0M, OPZ1, ecc.) per ogni candidato — usata anche in _diagData
    function _opzLabel(c, bLM, mLM, pLM) {
        if (c.opzCLabel) return c.opzCLabel;
        if (c.opzVLabel) return c.opzVLabel;
        const raw = c.opzIdx === -1 ? 'OPZ0' : 'OPZ' + (c.opzIdx + 1);
        if (bLM && bLM[raw]) return bLM[raw] + 'B';
        if (mLM && mLM[raw]) return mLM[raw] + 'M';
        if (pLM && pLM[raw]) return pLM[raw];
        return raw;
    }
    // Associa a ogni candidato le mappe label del suo scenario
    const _scenarioLabelMaps = {};
    for (const scenario of scenariDaUsare) {
        _scenarioLabelMaps[scenario] = candidati.find(c => c.scenario === scenario)?._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
    }
    candidati.forEach(c => {
        const marker = c === best ? ' ◄ MIGLIORE' : '';
        const vincTag = c.carteRim !== null && !c.rispettaVincolo ? ' ⚠' : '';
        const lm = c._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
        const lbl = _opzLabel(c, lm.bLabelMap, lm.mLabelMap, lm.pLabelMap);
        con.log('[' + c.scenario + '] ' + lbl + ' → score=' + c.score.toFixed(1) + ' (opz=' + (c.opzScore||0).toFixed(1) + (c.mazzBonus ? ' mazzo=+' + c.mazzBonus : '') + (c.pozzBonus ? ' pozzetto=+' + c.pozzBonus : '') + ') | scarto=' + (c.scartoCarta||'-') + vincTag + marker);
    });
    if (usaFallback) con.warn('Nessuna opzione lascia ≥1 carta in mano: scelto il miglior fallback disponibile.');
    if (best) {
        const bestLm = best._labelMaps || { bLabelMap: {}, mLabelMap: {}, pLabelMap: {} };
        const bestLbl = _opzLabel(best, bestLm.bLabelMap, bestLm.mLabelMap, bestLm.pLabelMap);
        con.log('→ SCELTA: [' + best.scenario + '] ' + bestLbl + ' → scarto: ' + (best.scartoCarta||'-') + ' (score=' + best.score.toFixed(1) + (best.carteRim !== null ? ', rim=' + best.carteRim : '') + ')');
    }
    con.groupEnd();

    // Lascia il contesto debug puntato sull'analisi scelta
    if (best) {
        window._analisiData = best.analisiData;
        window._analisiScenario = best.scenario;
        window._analisiGiocatoreIdx = giocatoreIdx;
    }

    // ===== Salva dati diagnostici in window._diagData =====
    const _fase = fase || (soloMano ? 'postPesca' : 'prePesca');
    window._diagData = window._diagData || {};
    window._diagData[_fase] = {
        giocatoreIdx: giocatoreIdx,
        giocatore: giocatore.nome || ('idx=' + giocatoreIdx),
        scenari: scenariDaUsare,
        candidati: candidati.map(c => {
            const lm = c._labelMaps || { bLabelMap: {}, mLabelMap: {} };
            return Object.assign({}, c, { label: _opzLabel(c, lm.bLabelMap, lm.mLabelMap) });
        }),
        best: best ? Object.assign({}, best, {
            label: _opzLabel(best, (best._labelMaps||{}).bLabelMap||{}, (best._labelMaps||{}).mLabelMap||{})
        }) : null,
        logLines: _diagLines.slice(),
        logPerOpz: _logPerOpzMap,
        analisiDataPerScenario: _analisiDataPerScenario
    };
    // Propaga ai turni precedenti non ancora salvati
    if (_fase === 'postPesca') {
        window._diagData['prePesca'] = window._diagData['prePesca'] || window._diagData['postPesca'];
    }

    return best;
}

window.scegliBestOpzioneAI = scegliBestOpzioneAI;
