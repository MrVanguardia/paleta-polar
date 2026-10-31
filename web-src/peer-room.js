/* PeerRoom — multijugador online de Paleta Polar para la app.
   Imita la parte de la API de salas que usa el juego (join, presence, peers, onPeers, leave).
   Dos caminos, el anfitrión es el centro en ambos:
   1) Directo (WebRTC con PeerJS): lo más rápido; funciona casi siempre en el mismo Wi-Fi.
   2) Servidor (MQTT sobre WebSocket, brokers públicos): respaldo cuando la conexión directa
      no se logra, por ejemplo entre redes móviles distintas. Funciona desde cualquier lugar. */
(function () {
  var PREFIX = 'paletapolar-v1-';
  var TOPIC = 'paletapolar/v2/';
  var BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  var ICE = { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ] };
  if (!window.Peer && !window.mqtt) return;

  function rid() { return Math.random().toString(36).slice(2, 10); }
  function merge(target, patch) {
    var out = Object.assign({}, target);
    for (var k in patch) { if (patch[k] === null) delete out[k]; else out[k] = patch[k]; }
    return out;
  }
  function sigOf(list) {
    return list.map(function (p) {
      var pr = p.presence || {};
      return p.peer + ':' + (pr.role || '') + ':' + (pr.nm || '') + ':' + (pr.ch || 0) + ':' + (pr.away ? 1 : 0) + ':' + JSON.stringify(pr.cfg || null);
    }).join('|');
  }
  function parse(buf) {
    try { return JSON.parse(typeof buf === 'string' ? buf : new TextDecoder().decode(buf)); } catch (e) { return null; }
  }

  /* Connect to the first public broker that answers. */
  function mqttConnect() {
    return new Promise(function (resolve, reject) {
      if (!window.mqtt) { reject('no-mqtt'); return; }
      var i = 0;
      (function next() {
        if (i >= BROKERS.length) { reject('no-broker'); return; }
        var url = BROKERS[i++], done = false, client;
        try {
          client = window.mqtt.connect(url, { clientId: 'pp_' + rid() + rid(), connectTimeout: 5000, reconnectPeriod: 2000, keepalive: 20, clean: true });
        } catch (e) { next(); return; }
        var t = setTimeout(function () { if (!done) { done = true; try { client.end(true); } catch (e) {} next(); } }, 6000);
        client.once('connect', function () { if (done) return; done = true; clearTimeout(t); resolve(client); });
        client.once('error', function () { if (done) return; done = true; clearTimeout(t); try { client.end(true); } catch (e) {} next(); });
      })();
    });
  }

  function join(name, opt) {
    var host = !!(opt && opt.host);
    var myId = host ? PREFIX + name : PREFIX + name + '-' + rid();
    var T = TOPIC + name;
    var R = {
      name: name, _me: myId, _pres: {}, _guests: new Map(), _list: [], _cache: null,
      _handlers: new Set(), _err: new Set(), _sig: '', _dirty: true, _timers: [], _alive: true,
      via: null, _peer: null, _hub: null, _mq: null, _lastList: 0
    };

    R._emit = function () {
      R._cache = null;
      var list = R.peers(), sig = sigOf(list);
      if (sig === R._sig) return;
      R._sig = sig;
      R._handlers.forEach(function (fn) { try { fn({ peers: list, joined: [], left: [], updated: [] }); } catch (e) {} });
    };
    R.peers = function () {
      if (R._cache) return R._cache;
      var mk = function (id, pres, me) {
        return { peer: id, by: null, isMe: me, sameTab: me, kind: 'viewer', guest: false, presence: pres || {}, updatedAt: Date.now() };
      };
      var out = [];
      if (host) {
        out.push(mk(R._me, R._pres, true));
        R._guests.forEach(function (g, id) { out.push(mk(id, g.pres, false)); });
      } else {
        var seenMe = false;
        R._list.forEach(function (p) {
          if (p.peer === R._me) { seenMe = true; out.push(mk(R._me, R._pres, true)); }
          else out.push(mk(p.peer, p.presence, false));
        });
        if (!seenMe) out.push(mk(R._me, R._pres, true));
      }
      R._cache = out;
      return out;
    };
    R.onPeers = function (fn, onErr) {
      R._handlers.add(fn); if (onErr) R._err.add(onErr);
      setTimeout(function () { try { fn({ peers: R.peers(), joined: R.peers(), left: [], updated: [] }); } catch (e) {} }, 0);
      return function () { R._handlers.delete(fn); if (onErr) R._err.delete(onErr); };
    };
    R.on = function () { return function () {}; };
    R.emit = function () { return Promise.resolve(); };
    R.connected = function () { return R._alive; };
    R.leave = function () {
      if (!host && R._mq && R.via === 'server') { try { R._mq.publish(T + '/h', JSON.stringify({ f: R._me, t: 'bye' })); } catch (e) {} }
      R._alive = false;
      R._timers.forEach(clearInterval);
      try { R._guests.forEach(function (g) { if (g.conn) g.conn.close(); }); } catch (e) {}
      try { R._hub && R._hub.close(); } catch (e) {}
      try { R._peer && R._peer.destroy(); } catch (e) {}
      try { R._mq && R._mq.end(true); } catch (e) {}
      return Promise.resolve();
    };

    /* ---------------- host ---------------- */
    if (host) {
      var guestFrom = function (id, via, conn) {
        var g = R._guests.get(id);
        if (!g) { g = { via: via, conn: conn || null, pres: {}, at: Date.now() }; R._guests.set(id, g); R._dirty = true; }
        else { g.at = Date.now(); if (conn) { g.conn = conn; g.via = via; } }
        return g;
      };
      var onGuestMsg = function (id, via, d, conn) {
        if (!d || typeof d !== 'object') return;
        if (d.t === 'bye') { if (R._guests.delete(id)) { R._dirty = true; R._emit(); } return; }
        var g = guestFrom(id, via, conn);
        if (d.t === 'p' && d.p && typeof d.p === 'object') {
          g.pres = merge(g.pres, d.p); R._cache = null; R._dirty = true;
          if ('nm' in d.p || 'ch' in d.p || 'role' in d.p || 'away' in d.p) R._emit();
        }
        if (d.t === 'hi') R._emit();
      };
      R.presence = function (patch) {
        R._pres = merge(R._pres, patch || {}); R._cache = null; R._dirty = true;
        if (patch && ('nm' in patch || 'ch' in patch || 'role' in patch || 'cfg' in patch)) R._emit();
        return Promise.resolve();
      };
      var lastBeat = 0;
      R._timers.push(setInterval(function () {
        if (!R._alive) return;
        var now = Date.now(), changed = false;
        R._guests.forEach(function (g, id) { if (g.via === 'server' && now - g.at > 7000) { R._guests.delete(id); changed = true; } });
        if (changed) { R._dirty = true; R._emit(); }
        if (!R._dirty && now - lastBeat < 1000) return;
        R._dirty = false; lastBeat = now;
        var list = [{ peer: R._me, presence: R._pres }];
        R._guests.forEach(function (g, id) { list.push({ peer: id, presence: g.pres }); });
        var msg = { t: 'peers', l: list }, viaServer = false;
        R._guests.forEach(function (g) {
          if (g.via === 'direct' && g.conn && g.conn.open) { try { g.conn.send(msg); } catch (e) {} }
          if (g.via === 'server') viaServer = true;
        });
        if (R._mq && R._mq.connected && (viaServer || now - lastAnnounce > 2000)) {
          lastAnnounce = now;
          try { R._mq.publish(T + '/l', JSON.stringify(msg), { qos: 0 }); } catch (e) {}
        }
      }, 50));
      var lastAnnounce = 0;

      return new Promise(function (resolve, reject) {
        var ready = false, pDone = false, mDone = false;
        var ok = function (via) { if (ready) return; ready = true; R.via = via; resolve(R); };
        var maybeFail = function (why) { if (!ready && pDone && mDone) reject({ code: 'upstream_error', message: String(why) }); };
        if (window.Peer) {
          var peer = new window.Peer(myId, { debug: 0, config: ICE });
          R._peer = peer;
          peer.on('open', function () {
            pDone = true;
            peer.on('connection', function (c) {
              c.on('open', function () { guestFrom(c.peer, 'direct', c); R._emit(); });
              c.on('data', function (d) { onGuestMsg(c.peer, 'direct', d, c); });
              var gone = function () { var g = R._guests.get(c.peer); if (g && g.via === 'direct' && g.conn === c) { R._guests.delete(c.peer); R._dirty = true; R._emit(); } };
              c.on('close', gone); c.on('error', gone);
            });
            ok('direct');
          });
          peer.on('error', function (err) { if (!ready) { pDone = true; if (err && err.type === 'unavailable-id') { ready = true; reject({ code: 'upstream_error', message: 'taken' }); return; } maybeFail(err && err.type); } });
          peer.on('disconnected', function () { if (R._alive) { try { peer.reconnect(); } catch (e) {} } });
        } else pDone = true;
        mqttConnect().then(function (client) {
          mDone = true; R._mq = client;
          client.subscribe(T + '/h', { qos: 0 });
          client.on('message', function (topic, buf) {
            var d = parse(buf); if (!d || !d.f || d.f === R._me) return;
            var g = R._guests.get(d.f);
            if (g && g.via === 'direct') return; // that guest already reached us directly
            onGuestMsg(d.f, 'server', d);
          });
          ok('server');
        }, function (e) { mDone = true; maybeFail(e); });
        setTimeout(function () { if (!ready) { pDone = mDone = true; maybeFail('timeout'); } }, 15000);
      });
    }

    /* ---------------- guest ---------------- */
    R.presence = function (patch) {
      R._pres = merge(R._pres, patch || {}); R._cache = null;
      R._send({ t: 'p', p: patch || {} });
      return Promise.resolve();
    };
    R._send = function (d) {
      if (R.via === 'direct' && R._hub && R._hub.open) { try { R._hub.send(d); } catch (e) {} }
      else if (R.via === 'server' && R._mq && R._mq.connected) { d.f = R._me; try { R._mq.publish(T + '/h', JSON.stringify(d), { qos: 0 }); } catch (e) {} }
    };
    var gotList = function (d) {
      if (d && d.t === 'peers' && Array.isArray(d.l)) { R._list = d.l; R._lastList = Date.now(); R._emit(); return true; }
      return false;
    };
    var lost = function () { if (!R._alive) return; R._list = []; R._cache = null; R._sig = ''; R._emit(); };

    return new Promise(function (resolve, reject) {
      var ready = false, directFailed = !window.Peer, serverHeard = false, mqClient = null;
      var chooseServer = function () {
        if (ready || !serverHeard || !mqClient) return;
        ready = true; R.via = 'server'; R._mq = mqClient;
        try { R._peer && R._peer.destroy(); } catch (e) {}
        R._send({ t: 'hi' }); R._send({ t: 'p', p: R._pres });
        R._timers.push(setInterval(function () {
          if (!R._alive) return;
          R._send({ t: 'p', p: R._pres }); // keep-alive with the full state, survives dropped messages
          if (R._lastList && Date.now() - R._lastList > 7000) lost();
        }, 600));
        resolve(R);
      };
      var chooseDirect = function (c) {
        if (ready) return;
        ready = true; R.via = 'direct'; R._hub = c;
        if (mqClient) { try { mqClient.end(true); } catch (e) {} mqClient = null; }
        c.on('data', function (d) { gotList(d); });
        c.on('close', lost);
        c.on('error', lost);
        resolve(R);
      };
      // server path in parallel: listen for the host's announcements
      mqttConnect().then(function (client) {
        if (ready) { try { client.end(true); } catch (e) {} return; }
        mqClient = client;
        client.subscribe(T + '/l', { qos: 0 });
        client.on('message', function (topic, buf) {
          var d = parse(buf);
          if (R.via === 'server') { gotList(d); return; }
          if (!ready && d && d.t === 'peers') { serverHeard = true; gotList(d); if (directFailed) chooseServer(); }
        });
      }, function () {});
      // direct path
      if (window.Peer) {
        var peer = new window.Peer(myId, { debug: 0, config: ICE });
        R._peer = peer;
        var dt = setTimeout(function () { directFailed = true; chooseServer(); }, 7000);
        peer.on('open', function () {
          var c = peer.connect(PREFIX + name, { reliable: true, serialization: 'json' });
          c.on('open', function () { clearTimeout(dt); chooseDirect(c); });
          c.on('error', function () { if (!ready) { directFailed = true; chooseServer(); } });
        });
        peer.on('error', function () { if (!ready) { clearTimeout(dt); directFailed = true; chooseServer(); } });
        peer.on('disconnected', function () { if (R._alive && R.via === 'direct') { try { peer.reconnect(); } catch (e) {} } });
      }
      setTimeout(function () {
        if (ready) return;
        if (serverHeard) { directFailed = true; chooseServer(); return; }
        ready = true; try { R._peer && R._peer.destroy(); } catch (e) {} try { mqClient && mqClient.end(true); } catch (e) {}
        reject({ code: 'upstream_error', message: 'not-found' });
      }, 12000);
    });
  }

  window.PeerRoom = { join: join };
})();
