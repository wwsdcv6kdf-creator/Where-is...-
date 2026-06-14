/* Where is…? — Geografie-Quiz
 * 5 Runden: Flagge (1 Pkt) · Hauptstadt (1 Pkt) · Lage per Stecknadel (max. 3 Pkt)
 */
(function () {
  "use strict";

  var COUNTRIES = window.COUNTRIES || [];
  var ROUNDS = 5;
  var MAX_SCORE = ROUNDS * 5; // 1 + 1 + 3

  // ---------- Hilfsfunktionen ----------
  function $(id) { return document.getElementById(id); }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // n verschiedene Zufallselemente aus pool, optional unter Ausschluss
  function sampleDistinct(pool, n, keyFn, excludeKeys) {
    var seen = excludeKeys ? excludeKeys.slice() : [];
    var result = [];
    var bag = shuffle(pool);
    for (var i = 0; i < bag.length && result.length < n; i++) {
      var k = keyFn(bag[i]);
      if (seen.indexOf(k) === -1) { seen.push(k); result.push(bag[i]); }
    }
    return result;
  }

  // Entfernung in km (Haversine)
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var toRad = function (d) { return d * Math.PI / 180; };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Punkte für die Stecknadel-Entfernung
  function distancePoints(km) {
    if (km <= 50) return 3;
    if (km <= 200) return 2;
    if (km <= 300) return 1;
    return 0;
  }

  function fmtKm(km) {
    return km >= 1000
      ? Math.round(km).toLocaleString("de-DE") + " km"
      : Math.round(km) + " km";
  }

  // ---------- Spielzustand ----------
  var state = null;

  function newGame() {
    var picks = sampleDistinct(COUNTRIES, ROUNDS, function (c) { return c.name; });
    state = {
      rounds: picks,
      index: 0,
      score: 0,
      results: [], // { country, flagPts, capPts, mapPts, capGuess, distance }
    };
  }

  // ---------- Bildschirm-Wechsel ----------
  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    $(id).classList.add("active");
    window.scrollTo(0, 0);
  }

  // ===================================================================
  //  RUNDE
  // ===================================================================
  function startRound() {
    var r = state.rounds[state.index];
    state.current = { country: r, flagPts: 0, capPts: 0, mapPts: 0, capGuess: null, distance: null };

    $("round-num").textContent = state.index + 1;
    $("score-num").textContent = state.score;

    // Phasen zurücksetzen
    $("phase-flag").hidden = false;
    $("phase-capital").hidden = true;
    $("phase-map").hidden = true;
    $("feedback").hidden = true;

    showScreen("screen-game");
    buildFlagPhase(r);
  }

  // ---------- Phase 1: Flagge -> Land ----------
  function buildFlagPhase(country) {
    $("flag-display").textContent = country.flag;
    var distractors = sampleDistinct(
      COUNTRIES, 3,
      function (c) { return c.name; },
      [country.name]
    );
    var options = shuffle([country].concat(distractors));
    renderChoiceOptions("flag-options", options, country, function (c) { return c.name; },
      function (chosen) {
        var correct = chosen.name === country.name;
        if (correct) { state.current.flagPts = 1; state.score += 1; updateScore(); }
        showFeedback(
          correct ? "✅ Richtig! +1 Punkt" : "❌ Leider falsch. Richtig: " + country.name,
          goToCapitalPhase
        );
      });
  }

  // ---------- Phase 2: Hauptstadt ----------
  function goToCapitalPhase() {
    var country = state.current.country;
    $("phase-flag").hidden = true;
    $("feedback").hidden = true;
    $("phase-capital").hidden = false;

    $("capital-country-flag").textContent = country.flag;
    $("capital-country-name").textContent = country.name;

    var distractors = sampleDistinct(
      COUNTRIES, 3,
      function (c) { return c.capital; },
      [country.capital]
    );
    var options = shuffle([country].concat(distractors));
    renderChoiceOptions("capital-options", options, country, function (c) { return c.capital; },
      function (chosen) {
        var correct = chosen.capital === country.capital;
        state.current.capGuess = chosen.capital;
        if (correct) { state.current.capPts = 1; state.score += 1; updateScore(); }
        showFeedback(
          correct ? "✅ Richtig! +1 Punkt" : "❌ Leider falsch. Richtig: " + country.capital,
          goToMapPhase
        );
      });
  }

  // ---------- Phase 3: Karte / Stecknadel ----------
  function goToMapPhase() {
    var country = state.current.country;
    $("phase-capital").hidden = true;
    $("feedback").hidden = true;
    $("phase-map").hidden = false;

    $("map-flag").textContent = country.flag;
    $("map-country").textContent = country.name;
    $("map-capital").textContent = country.capital;
    $("map-result").hidden = true;
    $("map-result").innerHTML = "";
    $("btn-confirm").hidden = false;
    $("btn-confirm").disabled = true;
    $("btn-next").hidden = true;

    initMap();
    resetMapForRound();
  }

  // ---------- Optionen rendern (Multiple Choice) ----------
  function renderChoiceOptions(containerId, options, correctObj, labelFn, onPick) {
    var box = $(containerId);
    box.innerHTML = "";
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.textContent = labelFn(opt);
      btn.addEventListener("click", function () {
        // alle sperren + Feedback einfärben
        var all = box.querySelectorAll(".option");
        for (var i = 0; i < all.length; i++) {
          all[i].disabled = true;
          if (all[i].textContent === labelFn(correctObj)) all[i].classList.add("correct");
        }
        if (labelFn(opt) !== labelFn(correctObj)) btn.classList.add("wrong");
        onPick(opt);
      });
      box.appendChild(btn);
    });
  }

  function showFeedback(text, onContinue) {
    $("feedback-text").textContent = text;
    $("feedback").hidden = false;
    var btn = $("btn-continue");
    btn.onclick = function () { onContinue(); };
  }

  function updateScore() { $("score-num").textContent = state.score; }

  // ===================================================================
  //  KARTE (Leaflet, ohne Grenzen/Beschriftung)
  // ===================================================================
  var map = null, pinMarker = null, capMarker = null, lineLayer = null, locked = false;

  function initMap() {
    if (map) { map.invalidateSize(); return; }

    map = L.map("map", {
      attributionControl: false,
      zoomControl: true,
      worldCopyJump: false,
      minZoom: 1,
      maxZoom: 7,
      maxBounds: [[-85, -185], [85, 185]],
      maxBoundsViscosity: 0.9,
      tap: true,
    });
    map.setView([20, 0], 1);

    // Nur Landmassen – keine Ländergrenzen, keine Labels
    L.geoJSON(window.LAND_GEOJSON, {
      interactive: false,
      style: { color: "#cfc7b0", weight: 0.5, fillColor: "#e7e0cf", fillOpacity: 1 },
    }).addTo(map);

    map.on("click", function (e) {
      if (locked) return;
      placePin(e.latlng);
    });
  }

  var pinIcon = null, capIcon = null;
  function getPinIcon() {
    if (!pinIcon) pinIcon = L.divIcon({
      className: "", html: '<div class="pin-icon">📍</div>',
      iconSize: [30, 30], iconAnchor: [15, 28],
    });
    return pinIcon;
  }
  function getCapIcon() {
    if (!capIcon) capIcon = L.divIcon({
      className: "", html: '<div class="capital-icon">⭐</div>',
      iconSize: [26, 26], iconAnchor: [13, 13],
    });
    return capIcon;
  }

  function placePin(latlng) {
    if (!pinMarker) {
      pinMarker = L.marker(latlng, { icon: getPinIcon(), draggable: true });
      pinMarker.on("dragend", function () { /* Position übernommen */ });
      pinMarker.addTo(map);
    } else {
      pinMarker.setLatLng(latlng);
    }
    $("btn-confirm").disabled = false;
  }

  function resetMapForRound() {
    locked = false;
    if (pinMarker) { map.removeLayer(pinMarker); pinMarker = null; }
    if (capMarker) { map.removeLayer(capMarker); capMarker = null; }
    if (lineLayer) { map.removeLayer(lineLayer); lineLayer = null; }
    map.setView([20, 0], 1);
    // Leaflet braucht nach dem Sichtbarwerden eine Größen-Neuberechnung
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function confirmPin() {
    if (!pinMarker || locked) return;
    locked = true;
    $("btn-confirm").hidden = true;

    var country = state.current.country;
    var p = pinMarker.getLatLng();
    var km = haversine(p.lat, p.lng, country.lat, country.lng);
    var pts = distancePoints(km);

    state.current.distance = km;
    state.current.mapPts = pts;
    state.score += pts;
    updateScore();

    // echte Hauptstadt + Verbindungslinie zeigen
    capMarker = L.marker([country.lat, country.lng], { icon: getCapIcon() })
      .addTo(map)
      .bindPopup("<b>" + country.capital + "</b><br>" + country.name)
      .openPopup();
    lineLayer = L.polyline([[p.lat, p.lng], [country.lat, country.lng]],
      { color: "#e8632f", weight: 3, dashArray: "6 6" }).addTo(map);
    map.fitBounds(lineLayer.getBounds().pad(0.4), { maxZoom: 6 });

    $("map-result").innerHTML =
      '<div class="dist">' + fmtKm(km) + ' entfernt</div>' +
      '<div class="pts p' + pts + '">' + (pts > 0 ? "+" + pts + (pts === 1 ? " Punkt" : " Punkte") : "0 Punkte") + '</div>' +
      '<div class="truth">⭐ ' + country.capital + " liegt hier</div>";
    $("map-result").hidden = false;

    $("btn-next").hidden = false;
    $("btn-next").textContent = (state.index + 1 < ROUNDS) ? "Nächste Runde" : "Auswertung anzeigen";
  }

  function nextRound() {
    state.results.push(state.current);
    state.index++;
    if (state.index < ROUNDS) {
      startRound();
    } else {
      showResults();
    }
  }

  // ===================================================================
  //  ERGEBNIS
  // ===================================================================
  function gradeFor(score) {
    var pct = score / MAX_SCORE;
    if (pct >= 0.92) return "🌍 Weltklasse-Geograf!";
    if (pct >= 0.72) return "🧭 Starke Orientierung!";
    if (pct >= 0.48) return "🙂 Solide gespielt!";
    if (pct >= 0.24) return "📚 Da geht noch was.";
    return "🐣 Aller Anfang ist schwer.";
  }

  function showResults() {
    $("total-num").textContent = state.score;
    $("total-grade").textContent = gradeFor(state.score);

    var bd = $("breakdown");
    bd.innerHTML = "";
    state.results.forEach(function (res, i) {
      var c = res.country;
      var roundTotal = res.flagPts + res.capPts + res.mapPts;
      var row = document.createElement("div");
      row.className = "bd-row";
      row.innerHTML =
        '<div class="bd-country">' + (i + 1) + '. ' + c.flag + " " + c.name + '</div>' +
        '<div class="bd-total">' + roundTotal + " / 5</div>" +
        '<div class="bd-detail">' +
          'Flagge: ' + mark(res.flagPts === 1) + ' · ' +
          'Hauptstadt: ' + mark(res.capPts === 1) + ' (' + c.capital + ') · ' +
          'Lage: <b>' + res.mapPts + '/3</b> (' + fmtKm(res.distance) + ')' +
        '</div>';
      bd.appendChild(row);
    });

    saveBest(state.score);
    showScreen("screen-results");
  }

  function mark(ok) {
    return ok ? '<span class="ok">✓</span>' : '<span class="no">✗</span>';
  }

  // ---------- Bestleistung (localStorage) ----------
  function saveBest(score) {
    try {
      var best = parseInt(localStorage.getItem("whereis_best") || "0", 10);
      if (score > best) localStorage.setItem("whereis_best", String(score));
    } catch (e) { /* ignore */ }
  }
  function showBest() {
    try {
      var best = parseInt(localStorage.getItem("whereis_best") || "0", 10);
      if (best > 0) {
        $("best-line").textContent = "Deine Bestleistung: " + best + " / " + MAX_SCORE + " Punkte";
        $("best-line").hidden = false;
      }
    } catch (e) { /* ignore */ }
  }

  // ===================================================================
  //  EVENTS
  // ===================================================================
  function begin() { newGame(); startRound(); }

  document.addEventListener("DOMContentLoaded", function () {
    if (!COUNTRIES.length) {
      $("btn-start").textContent = "Fehler: Länderdaten fehlen";
      $("btn-start").disabled = true;
      return;
    }
    showBest();
    $("btn-start").addEventListener("click", begin);
    $("btn-replay").addEventListener("click", function () { showBest(); begin(); });
    $("btn-confirm").addEventListener("click", confirmPin);
    $("btn-next").addEventListener("click", nextRound);

    // Service Worker (offline) – nur bei http(s)
    if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  });
})();
