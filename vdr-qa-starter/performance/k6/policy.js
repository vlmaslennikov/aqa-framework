/** Shared pure safety rules for Node self-checks and the k6 runtime. */
export const ACK = 'I_OWN_THIS_DISPOSABLE_QA_STACK';
export const HEAVY_ACK = 'I_ACCEPT_QA_LOAD';
export const PROFILES = Object.freeze(['smoke', 'load', 'stress', 'spike', 'soak', 'volume', 'scalability']);
export const HEAVY = Object.freeze(['stress', 'spike', 'soak', 'volume', 'scalability']);

export function validateLocalTarget(raw) {
  if (typeof raw !== 'string' || !raw) throw new Error('K6_BASE_URL is required');
  // Strict text parser rather than URL(): portable across Node and all supported k6 JS runtimes.
  // Full-string anchoring rules out userinfo (@), confusing host suffixes, paths and queries.
  const match = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):([0-9]{1,5})$/.exec(raw);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 65535) {
    throw new Error('k6 is restricted to an explicit local http://127.0.0.1:PORT origin without credentials or paths');
  }
  return raw;
}

export function validateProfile(profile, env) {
  if (!PROFILES.includes(profile)) throw new Error('Unsupported k6 profile');
  if (env.K6_LOCAL_QA_ACK !== ACK) throw new Error('Missing K6_LOCAL_QA_ACK; refusing any performance test');
  if (HEAVY.includes(profile) && env.K6_HEAVY_ACK !== HEAVY_ACK) {
    throw new Error('Heavy profile requires explicit K6_HEAVY_ACK');
  }
  return profile;
}

export function validateFixture(state) {
  if (!state || state.schemaVersion !== 1 || typeof state.runId !== 'string' ||
      !/^vdr-perf-[\w-]+@example\.invalid$/.test(state.email || '') ||
      typeof state.password !== 'string' || state.password.length < 20 ||
      !isUuid(state.ownerId) || !isUuid(state.roomId) ||
      !isUuid(state.folderId) || !isUuid(state.fileId)) {
    throw new Error('Missing or malformed local perf fixture; run qa:perf:seed first');
  }
  return state;
}
function isUuid(s) { return typeof s === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s); }

export function chooseEndpoint(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random value must be [0,1)');
  if (value < .10) return 'health';
  if (value < .23) return 'rooms';
  if (value < .38) return 'room-contents';
  if (value < .48) return 'room-page-2';
  if (value < .63) return 'folder-contents';
  if (value < .76) return 'folder-page-2';
  if (value < .88) return 'breadcrumbs';
  return 'file-metadata';
}

export function profileOptions(profile) {
  const common = {
    discardResponseBodies: false,
    noConnectionReuse: false,
    noVUConnectionReuse: false,
    maxRedirects: 0,
    thresholds: {
      'http_req_failed': ['rate<0.02'],
      'http_req_duration': ['p(95)<1200'],
      'qa_contract_errors': ['rate<0.02'],
      'checks': ['rate>0.98'],
    },
  };
  const spec = {
    smoke: { vus: 1, duration: '10s' },
    load: { stages: [{ duration: '15s', target: 5 }, { duration: '30s', target: 10 }, { duration: '15s', target: 0 }] },
    stress: { stages: [{ duration: '15s', target: 5 }, { duration: '30s', target: 15 }, { duration: '30s', target: 30 }, { duration: '15s', target: 0 }] },
    spike: { stages: [{ duration: '10s', target: 3 }, { duration: '5s', target: 30 }, { duration: '15s', target: 3 }, { duration: '5s', target: 0 }] },
    soak: { vus: 5, duration: '10m' },
    volume: { vus: 8, duration: '60s' },
    scalability: { vus: 10, duration: '60s' },
  };
  return { ...common, ...spec[profile], tags: { qa_profile: profile } };
}
