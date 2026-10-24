/* MOSCA — motor balístico de punto-masa con modelo G1 / G7
 * Unidades internas SI (m, s, kg). Entradas y salidas en métrico.
 * Integración: Runge-Kutta 4 con paso temporal fijo.
 * No modela deriva por giro (spin drift) ni efecto Coriolis.
 */
(function (root) {
  'use strict';

  // Tabla estándar G1 (Mach, Cd)
  const G1 = [
    [0.00,0.2629],[0.05,0.2558],[0.10,0.2487],[0.15,0.2413],[0.20,0.2344],[0.25,0.2278],
    [0.30,0.2214],[0.35,0.2155],[0.40,0.2104],[0.45,0.2061],[0.50,0.2032],[0.55,0.2020],
    [0.60,0.2034],[0.70,0.2165],[0.725,0.2230],[0.75,0.2313],[0.775,0.2417],[0.80,0.2546],
    [0.825,0.2706],[0.85,0.2901],[0.875,0.3136],[0.90,0.3415],[0.925,0.3734],[0.95,0.4084],
    [0.975,0.4448],[1.00,0.4805],[1.025,0.5136],[1.05,0.5427],[1.075,0.5677],[1.10,0.5883],
    [1.125,0.6053],[1.15,0.6191],[1.20,0.6393],[1.25,0.6518],[1.30,0.6589],[1.35,0.6621],
    [1.40,0.6625],[1.45,0.6607],[1.50,0.6573],[1.55,0.6528],[1.60,0.6474],[1.65,0.6413],
    [1.70,0.6347],[1.75,0.6280],[1.80,0.6210],[1.85,0.6141],[1.90,0.6072],[1.95,0.6003],
    [2.00,0.5934],[2.05,0.5867],[2.10,0.5804],[2.15,0.5743],[2.20,0.5685],[2.25,0.5630],
    [2.30,0.5577],[2.35,0.5527],[2.40,0.5481],[2.45,0.5438],[2.50,0.5397],[2.60,0.5325],
    [2.70,0.5264],[2.80,0.5211],[2.90,0.5168],[3.00,0.5133],[3.10,0.5105],[3.20,0.5084],
    [3.30,0.5067],[3.40,0.5054],[3.50,0.5040],[3.60,0.5030],[3.70,0.5022],[3.80,0.5016],
    [3.90,0.5010],[4.00,0.5006],[4.20,0.4998],[4.40,0.4995],[4.60,0.4992],[4.80,0.4990],
    [5.00,0.4988]
  ];

  // Tabla estándar G7 (Mach, Cd)
  const G7 = [
    [0.00,0.1198],[0.05,0.1197],[0.10,0.1196],[0.15,0.1194],[0.20,0.1193],[0.25,0.1194],
    [0.30,0.1194],[0.35,0.1194],[0.40,0.1193],[0.45,0.1193],[0.50,0.1194],[0.55,0.1193],
    [0.60,0.1194],[0.65,0.1197],[0.70,0.1202],[0.725,0.1207],[0.75,0.1215],[0.775,0.1226],
    [0.80,0.1242],[0.825,0.1266],[0.85,0.1306],[0.875,0.1368],[0.90,0.1464],[0.925,0.1660],
    [0.95,0.2054],[0.975,0.2993],[1.00,0.3803],[1.025,0.4015],[1.05,0.4043],[1.075,0.4034],
    [1.10,0.4014],[1.125,0.3987],[1.15,0.3955],[1.20,0.3884],[1.25,0.3810],[1.30,0.3732],
    [1.35,0.3657],[1.40,0.3580],[1.50,0.3440],[1.55,0.3376],[1.60,0.3315],[1.65,0.3260],
    [1.70,0.3209],[1.75,0.3160],[1.80,0.3117],[1.85,0.3078],[1.90,0.3042],[1.95,0.3010],
    [2.00,0.2980],[2.05,0.2951],[2.10,0.2922],[2.15,0.2892],[2.20,0.2864],[2.25,0.2835],
    [2.30,0.2807],[2.35,0.2779],[2.40,0.2752],[2.45,0.2725],[2.50,0.2697],[2.55,0.2670],
    [2.60,0.2643],[2.65,0.2615],[2.70,0.2588],[2.75,0.2561],[2.80,0.2533],[2.85,0.2506],
    [2.90,0.2479],[2.95,0.2451],[3.00,0.2424],[3.10,0.2368],[3.20,0.2313],[3.30,0.2258],
    [3.40,0.2205],[3.50,0.2154],[3.60,0.2106],[3.70,0.2060],[3.80,0.2017],[3.90,0.1975],
    [4.00,0.1935],[4.20,0.1861],[4.40,0.1793],[4.60,0.1730],[4.80,0.1672],[5.00,0.1618]
  ];

  const LBIN2_A_KGM2 = 703.0696;   // 1 lb/in² en kg/m²
  const GRAINS_A_KG = 6.479891e-5;
  const G = 9.80665;
  const MOA_RAD = Math.PI / (180 * 60);

  function cd(tabla, mach) {
    if (mach <= tabla[0][0]) return tabla[0][1];
    const n = tabla.length;
    if (mach >= tabla[n - 1][0]) return tabla[n - 1][1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tabla[mid][0] <= mach) lo = mid; else hi = mid; }
    const [m0, c0] = tabla[lo], [m1, c1] = tabla[hi];
    return c0 + (c1 - c0) * (mach - m0) / (m1 - m0);
  }

  /** Densidad del aire (kg/m³) y velocidad del sonido (m/s).
   * tempC: °C, presionHPa: presión de estación (la del lugar, no la corregida al nivel del mar),
   * humedad: 0-100 %. */
  function atmosfera(tempC, presionHPa, humedad) {
    const T = tempC + 273.15;
    const p = presionHPa * 100;
    const h = Math.max(0, Math.min(100, humedad || 0)) / 100;
    // presión de vapor de saturación (Tetens)
    const pSat = 610.78 * Math.pow(10, (7.5 * tempC) / (tempC + 237.3));
    const pv = h * pSat;
    const pd = p - pv;
    const rho = pd / (287.058 * T) + pv / (461.495 * T);
    const sonido = 331.3 * Math.sqrt(1 + tempC / 273.15);
    return { rho, sonido };
  }

  /** Presión de estación estimada a partir de la altitud (atmósfera estándar). */
  function presionPorAltitud(altM) {
    return 1013.25 * Math.pow(1 - 2.25577e-5 * altM, 5.25588);
  }

  /** Integra la trayectoria y devuelve puntos cada `paso` metros hasta `maxDist`.
   * p: { bc, modelo:'G1'|'G7', v0 (m/s), alturaMira (cm), angulo (rad, del caño respecto de la línea de mira),
   *      tempC, presionHPa, humedad, vientoMs, vientoDirReloj (1-12, 3 = de derecha a izquierda), anguloTiroGrados }
   */
  function integrar(p, maxDist, paso) {
    const tabla = p.modelo === 'G7' ? G7 : G1;
    const bcSI = p.bc * LBIN2_A_KGM2;
    const { rho, sonido } = atmosfera(p.tempC, p.presionHPa, p.humedad);
    const k = rho * Math.PI / (8 * bcSI);
    const hMira = p.alturaMira / 100;

    // viento: componente lateral (z) y de frente/cola (x). Hora 3 = viento desde la derecha.
    const dirRad = ((p.vientoDirReloj || 3) % 12) * Math.PI / 6;
    const vw = p.vientoMs || 0;
    const wz = -vw * Math.sin(dirRad);   // desde la derecha empuja hacia la izquierda (z negativa)
    const wx = -vw * Math.cos(dirRad);   // hora 12 = viento de frente

    const incl = (p.anguloTiroGrados || 0) * Math.PI / 180;
    const gx = -G * Math.sin(incl), gy = -G * Math.cos(incl);

    // estado: x (hacia el blanco, sobre la línea de mira), y (arriba), z (lateral), velocidades
    let x = 0, y = -hMira, z = 0;
    let vx = p.v0 * Math.cos(p.angulo), vy = p.v0 * Math.sin(p.angulo), vz = 0;
    let t = 0;
    const dt = 0.0005;

    function acc(vx, vy, vz) {
      const rx = vx - wx, ry = vy, rz = vz - wz;
      const v = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const a = k * cd(tabla, v / sonido) * v;
      return [-a * rx + gx, -a * ry + gy, -a * rz];
    }

    const puntos = [];
    let proximo = 0;
    let prev = { x, y, z, vx, vy, vz, t };
    while (t < 10 && proximo <= maxDist + 0.001) {
      if (x >= proximo) {
        // interpolar linealmente entre el paso anterior y el actual
        const f = x === prev.x ? 0 : (proximo - prev.x) / (x - prev.x);
        const L = (a, b) => a + (b - a) * f;
        puntos.push({
          dist: proximo,
          y: L(prev.y, y), z: L(prev.z, z),
          v: Math.sqrt(L(prev.vx, vx) ** 2 + L(prev.vy, vy) ** 2 + L(prev.vz, vz) ** 2),
          t: L(prev.t, t)
        });
        proximo += paso;
        if (proximo > maxDist + 0.001) break;
        continue;
      }
      prev = { x, y, z, vx, vy, vz, t };
      const k1 = acc(vx, vy, vz);
      const k2 = acc(vx + k1[0] * dt / 2, vy + k1[1] * dt / 2, vz + k1[2] * dt / 2);
      const k3 = acc(vx + k2[0] * dt / 2, vy + k2[1] * dt / 2, vz + k2[2] * dt / 2);
      const k4 = acc(vx + k3[0] * dt, vy + k3[1] * dt, vz + k3[2] * dt);
      const nvx = vx + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * dt / 6;
      const nvy = vy + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * dt / 6;
      const nvz = vz + (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) * dt / 6;
      x += (vx + nvx) / 2 * dt; y += (vy + nvy) / 2 * dt; z += (vz + nvz) / 2 * dt;
      vx = nvx; vy = nvy; vz = nvz; t += dt;
    }
    return puntos;
  }

  /** Busca el ángulo del caño que hace que la trayectoria corte la línea de mira en `ceroM`
   * con las condiciones en que se hizo el cero (sin viento, tiro horizontal). */
  function anguloDeCero(p) {
    const base = Object.assign({}, p, { vientoMs: 0, anguloTiroGrados: 0 });
    if (p.ceroTempC != null) base.tempC = p.ceroTempC;
    if (p.ceroPresionHPa != null) base.presionHPa = p.ceroPresionHPa;
    let lo = -0.01, hi = 0.02;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const pts = integrar(Object.assign({}, base, { angulo: mid }), p.ceroM, p.ceroM);
      const yC = pts.length ? pts[pts.length - 1].y : -1;
      if (yC > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  /** Tabla de tiro completa.
   * p: bc, modelo, v0, masaGr, alturaMira(cm), ceroM, tempC, presionHPa, humedad, vientoMs, vientoDirReloj,
   *    anguloTiroGrados, unidadClick ('MOA'|'MRAD'), valorClick (p.ej. 0.25 MOA o 0.1 MRAD)
   */
  function tablaDeTiro(p, maxDist, paso) {
    const angulo = anguloDeCero(p);
    const pts = integrar(Object.assign({}, p, { angulo }), maxDist, paso);
    const masa = (p.masaGr || 0) * GRAINS_A_KG;
    return pts.map(pt => {
      const caidaCm = pt.y * 100;
      const derivaCm = pt.z * 100;
      const angCaida = pt.dist > 0 ? Math.atan2(-pt.y, pt.dist) : 0;
      const angDeriva = pt.dist > 0 ? Math.atan2(-pt.z, pt.dist) : 0;
      const moaC = angCaida / MOA_RAD, mradC = angCaida * 1000;
      const moaD = angDeriva / MOA_RAD, mradD = angDeriva * 1000;
      const corr = p.unidadClick === 'MRAD' ? mradC : moaC;
      const corrD = p.unidadClick === 'MRAD' ? mradD : moaD;
      const vc = p.valorClick || (p.unidadClick === 'MRAD' ? 0.1 : 0.25);
      return {
        dist: pt.dist,
        caidaCm, derivaCm,
        moa: moaC, mrad: mradC, clicks: corr / vc,
        moaViento: moaD, mradViento: mradD, clicksViento: corrD / vc,
        v: pt.v, t: pt.t,
        energiaJ: masa ? 0.5 * masa * pt.v * pt.v : null
      };
    });
  }

  /** Estadística de velocidades (m/s): promedio, desvío estándar, dispersión extrema. */
  function estadisticaVelocidades(vs) {
    const a = vs.map(Number).filter(v => isFinite(v) && v > 0);
    if (!a.length) return null;
    const n = a.length, prom = a.reduce((s, v) => s + v, 0) / n;
    const sd = n > 1 ? Math.sqrt(a.reduce((s, v) => s + (v - prom) ** 2, 0) / (n - 1)) : 0;
    return { n, prom, sd, es: Math.max(...a) - Math.min(...a), min: Math.min(...a), max: Math.max(...a) };
  }

  /** Tamaño de grupo en mm a una distancia en m -> MOA y MRAD. */
  function grupoAngular(mm, distM) {
    if (!mm || !distM) return null;
    const rad = Math.atan2(mm / 1000, distM);
    return { moa: rad / MOA_RAD, mrad: rad * 1000 };
  }

  const api = { G1, G7, atmosfera, presionPorAltitud, integrar, anguloDeCero, tablaDeTiro, estadisticaVelocidades, grupoAngular };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Balistica = api;
})(typeof self !== 'undefined' ? self : this);
