/** Read-only VDR inventory, isolated from the CLI for deterministic unit tests.
 * Only /auth/login uses POST. All content enumeration uses GET.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_API = 'https://virtual-data-room-production.up.railway.app';
const MAX_PAGES = 40;
const MAX_FOLDERS = 200;
const MAX_ITEMS = 3000;

export function validateApiOrigin(raw, env = {}) {
  const value = raw || PUBLIC_API;
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('API_BASE_URL must be a bare origin (no credentials, path, query or fragment)');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (local && url.protocol === 'http:') return url.origin;
  if (url.protocol !== 'https:') throw new Error('Remote API must use HTTPS');
  if (url.origin === PUBLIC_API) return url.origin;
  if (env.QA_READONLY_ALLOW_REMOTE === '1' && env.QA_API_APPROVED_ORIGIN === url.origin) return url.origin;
  throw new Error('Unknown remote API origin: require QA_READONLY_ALLOW_REMOTE=1 and QA_API_APPROVED_ORIGIN matching the exact origin');
}

function assertPage(body, endpoint) {
  if (!body || !Array.isArray(body.items) || !('nextCursor' in body) ||
      (body.nextCursor !== null && typeof body.nextCursor !== 'string')) {
    throw new Error(`Unexpected pagination response from ${endpoint}`);
  }
}

export async function collectInventory({fetchImpl, base, email, password, roomId, roomName = 'My Data Room',
  fileName = 'Overview.pdf', folderName, maxFolders = MAX_FOLDERS, maxItems = MAX_ITEMS}) {
  if (!fetchImpl || !base || !email || !password) throw new Error('API origin and OWNER_EMAIL/OWNER_PASSWORD are required');
  if (roomId && !UUID.test(roomId)) throw new Error('QA_ROOM_ID must be a UUID');
  if (!Number.isInteger(maxFolders) || maxFolders < 1 || maxFolders > MAX_FOLDERS ||
      !Number.isInteger(maxItems) || maxItems < 1 || maxItems > MAX_ITEMS) {
    throw new Error(`Inventory caps must be integers: maxFolders<=${MAX_FOLDERS}, maxItems<=${MAX_ITEMS}`);
  }
  let requestCount = 0;
  async function api(method, path, token, body) {
    // Paths originate only in this module, never from cursor bytes or user input.
    const opts = {method, headers: {'Accept':'application/json'}};
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body) { opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(body); }
    const res = await fetchImpl(`${base}${path}`, opts);
    requestCount++;
    if (!res.ok) throw new Error(`API ${method} ${path.split('?')[0]} failed: HTTP ${res.status}`);
    return res.json();
  }
  const auth = await api('POST', '/auth/login', undefined, {email, password});
  if (!auth || typeof auth.accessToken !== 'string' || !auth.accessToken) throw new Error('Login response missing accessToken');
  const token = auth.accessToken;
  async function paginate(path) {
    const values=[]; const seen=new Set();
    let cursor = null;
    for (let n=0; n<MAX_PAGES; n++) {
      const url = `${path}${path.includes('?') ? '&':'?'}limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const body = await api('GET',url,token);
      assertPage(body,path);
      values.push(...body.items);
      if (values.length > maxItems) throw new Error(`Inventory item cap exceeded (${maxItems}); increase dedicated test cap by adjusting dataset, not scan live demo`);
      if (!body.nextCursor) return values;
      if (seen.has(body.nextCursor)) throw new Error(`Pagination cursor loop on ${path}`);
      seen.add(body.nextCursor);
      cursor=body.nextCursor;
    }
    throw new Error(`Pagination page cap exceeded (${MAX_PAGES}) on ${path}`);
  }
  const rooms = await paginate('/data-rooms');
  const matching = rooms.filter(r => roomId ? r.id === roomId : r.name === roomName);
  if (matching.length !== 1) throw new Error(`Expected exactly one owned room (${roomId || roomName}), found ${matching.length}. Set QA_ROOM_ID explicitly.`);
  const room=matching[0];
  if (!UUID.test(room.id)) throw new Error('Selected room returned invalid UUID');
  const items=[]; const queue=[{id:null,path:[]}]; const visited=new Set();
  for (let i=0; i<queue.length; i++) {
    const current=queue[i];
    const route=current.id ? `/folders/${current.id}/contents` : `/data-rooms/${room.id}/contents`;
    const children=await paginate(route);
    for (const item of children) {
      if (!item || !UUID.test(item.id) || typeof item.name !== 'string' || !['file','folder'].includes(item.type)) {
        throw new Error(`Invalid inventory item returned by ${route}`);
      }
      if (visited.has(item.id)) throw new Error(`Repeated inventory ID detected: ${item.id}`);
      visited.add(item.id);
      if (visited.size > maxItems) throw new Error('Inventory exceeds the configured item cap');
      const entry={id:item.id, type:item.type, name:item.name, parentId:current.id, path:[...current.path,item.name]};
      if (item.type==='file') {entry.size=item.size;entry.mimeType=item.mimeType;}
      items.push(entry);
      if (item.type==='folder') {
        queue.push({id:item.id,path:entry.path});
        if (queue.length-1>maxFolders) throw new Error(`Folder cap exceeded (${maxFolders}). No partial baseline was saved.`);
      }
    }
  }
  const files=items.filter(i=>i.type==='file' && i.name===fileName);
  const folders=items.filter(i=>i.type==='folder' && (!folderName || i.name===folderName));
  const warnings=[];
  if (files.length===0) warnings.push(`PDF '${fileName}' not found; file-specific E2E/Lighthouse will be skipped`);
  if (files.length>1) warnings.push(`PDF '${fileName}' is ambiguous (${files.length} matches); QA_FILE_ID left unset`);
  if (folders.length===0) warnings.push(`Folder '${folderName || '(any)'}' not found; folder checks will be skipped`);
  if (folders.length>1 && folderName) warnings.push(`Folder '${folderName}' ambiguous (${folders.length} matches); QA_FOLDER_ID left unset`);
  const selectedFile=files.length===1 ? files[0] : null;
  const selectedFolder=folders.length && (!folderName || folders.length===1)
    ? folders.sort((a,b) => a.path.join('/').localeCompare(b.path.join('/')))[0] : null;
  return {
    schemaVersion:1, source:base, fetchedAt:new Date().toISOString(), requestCount,
    room:{id:room.id,name:room.name}, items,
    counts:{folders:items.filter(i=>i.type==='folder').length,files:items.filter(i=>i.type==='file').length},
    selected:{LHCI_ROOM_ID:room.id, LHCI_FOLDER_ID:selectedFolder?.id || null, LHCI_FILE_ID:selectedFile?.id || null},
    selectedNames:{folder:selectedFolder?.path.join('/') || null,file:selectedFile?.path.join('/') || null},warnings,
    note:'Read-only inventory of objects visible to this account; no historical deletion claims can be inferred.'
  };
}

export function formatResourceEnv(selected) {
  return ['LHCI_ROOM_ID','LHCI_FOLDER_ID','LHCI_FILE_ID']
    .map(k=>`${k}=${selected[k] && UUID.test(selected[k]) ? selected[k] : ''}`).join('\n') + '\n';
}

export function compareInventories(before, after) {
  if (before?.schemaVersion!==1 || after?.schemaVersion!==1) throw new Error('Unsupported inventory schema');
  if (before.source!==after.source || before.room.id!==after.room.id) {
    throw new Error('Cannot compare different API origins or room IDs');
  }
  const old=new Map(before.items.map(x=>[x.id,x]));
  const current=new Map(after.items.map(x=>[x.id,x]));
  const added=[],removed=[],changed=[];
  for (const [id,item] of current) if (!old.has(id)) added.push(item);
  for (const [id,item] of old) if (!current.has(id)) removed.push(item);
  for (const [id,item] of current) {
    if (!old.has(id)) continue;
    const oldItem=old.get(id);
    if (['name','parentId','size','mimeType'].some(k=>item[k]!==oldItem[k])) {
      changed.push({before:oldItem,after:item});
    }
  }
  return {
    source:after.source,roomId:after.room.id,baselineAt:before.fetchedAt,latestAt:after.fetchedAt,
    summary:{added:added.length,removed:removed.length,changed:changed.length},
    added,removed,changed,
    conclusion:'Observational difference only; concurrent users, permissions and prior state are not established by this report.'
  };
}
