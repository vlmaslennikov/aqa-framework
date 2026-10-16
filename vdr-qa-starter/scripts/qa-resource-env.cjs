/** Import generated UUIDs only when an explicit shell/.env value is missing.
 * It intentionally ignores any key except the three LHCI resource IDs.
 */
const {readFileSync,existsSync}=require('node:fs');
const {resolve}=require('node:path');
const KEYS=['LHCI_ROOM_ID','LHCI_FOLDER_ID','LHCI_FILE_ID'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function loadQaResourceIds(env=process.env, root=process.cwd()) {
  const file=resolve(root,'.qa-resources.env');
  if (!existsSync(file)) return env;
  for(const raw of readFileSync(file,'utf8').split(/\r?\n/)) {
    const match=raw.match(/^(LHCI_ROOM_ID|LHCI_FOLDER_ID|LHCI_FILE_ID)=(.*)$/);
    if(!match) continue;
    const [,name,value]=match;
    if (!value || !UUID.test(value)) continue;
    if (!env[name]) env[name]=value;
  }
  return env;
}
module.exports={loadQaResourceIds};
