importScripts("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js");

let SQLPromise = initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });

function readUInt32BE(view, offset){ return view.getUint32(offset, false); }
function readBE(view, offset, bytes){
  let v = 0n;
  for(let i=0;i<bytes;i++){
    v = (v << 8n) | BigInt(view.getUint8(offset+i));
  }
  return v;
}
function wordArrayToUint8Array(wordArray){
  const len = wordArray.sigBytes;
  const words = wordArray.words;
  const u8 = new Uint8Array(len);
  let index=0;
  for(let i=0;i<words.length;i++){
    let w = words[i];
    u8[index++] = (w >>> 24) & 0xFF; if(index>=len) break;
    u8[index++] = (w >>> 16) & 0xFF; if(index>=len) break;
    u8[index++] = (w >>> 8) & 0xFF;  if(index>=len) break;
    u8[index++] = (w) & 0xFF;         if(index>=len) break;
  }
  return u8;
}

function cleanRow(obj){
  const blacklist = [
    "dependency_key_rowid","provider_id_rowid","type_rowid","dependency_hash","crc","timeout",
    "chunked_transfer","redirect_limit","retry_count","asset_load_mode",
    "bundle_size","use_crc_cache","uwr_local","clear_other_cache_version",
    "primary_key_rowid"
  ];
  const copy = {};
  for(const k in obj){
    if(k === "rowid") continue;
    if(blacklist.includes(k)) continue;
    copy[k] = obj[k];
  }
  return copy;
}

onmessage = async e => {
  const { fileName, arrayBuffer, hosturl } = e.data;
  const data = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);

  const magic = new TextDecoder().decode(data.slice(0,4));
  if(magic !== 'NKDB'){ postMessage({error:'Not a valid file', fileName}); return; }

  const version = readUInt32BE(view, 4);
  if(version !== 1){ postMessage({error:`Unsupported version ${version}`, fileName}); return; }

  const aesKey = data.slice(8, 24);
  const segmentSize = readUInt32BE(view, 24);
  const segmentCount = readUInt32BE(view, 28);
  const product = BigInt(segmentSize) * BigInt(segmentCount);
  const lengthByteCount = product > 0xFFFFFFFFn ? 5 : 4;

  let pos = 32;
  const offsets = [];
  const firstOffset = Number(readBE(view, pos, lengthByteCount)); pos += lengthByteCount;
  let currentOffset = firstOffset;
  for(let i=0;i<segmentCount;i++){
    const nextOffset = Number(readBE(view, pos, lengthByteCount)); pos += lengthByteCount;
    offsets.push({ offset: currentOffset, length: nextOffset - currentOffset, index: i });
    currentOffset = nextOffset;
  }

  const outputChunks = [];
  for(const seg of offsets){
    if(seg.length <= 0) continue;
    if(seg.offset + seg.length > data.length) continue;

    const encrypted = data.slice(seg.offset, seg.offset + seg.length);
    const ivBuf = new ArrayBuffer(16); const ivView = new DataView(ivBuf);
    ivView.setInt32(0, seg.index, true);
    ivView.setInt32(4, seg.offset | 0, true);

    const keyWA = CryptoJS.lib.WordArray.create(aesKey);
    const ivWA  = CryptoJS.lib.WordArray.create(new Uint8Array(ivBuf));
    const ctWA  = CryptoJS.lib.WordArray.create(encrypted, encrypted.length);

    try{
      const dec = CryptoJS.AES.decrypt({ ciphertext: ctWA }, keyWA, { iv: ivWA, mode: CryptoJS.mode.OFB, padding: CryptoJS.pad.NoPadding });
      const decBytes = wordArrayToUint8Array(dec);
      const inflated = pako.inflate(decBytes);
      outputChunks.push(inflated);
    } catch(e){ postMessage({error:"Decrypt/inflate error", fileName}); return; }
  }
  let total = 0; for(const c of outputChunks) total += c.length;
  const outBuf = new Uint8Array(total); let off=0; for(const c of outputChunks){ outBuf.set(c, off); off += c.length; }

  const SQL = await SQLPromise;
  let db;
  try { db = new SQL.Database(outBuf); } catch (e) { postMessage({error:"SQLite open error", fileName}); return; }

  let keyEntries = [], keys = [], entries = [], entryData = [], internalIds = [];
  try { const stmt=db.prepare("SELECT * FROM key_entries"); while(stmt.step()) keyEntries.push(stmt.getAsObject()); stmt.free(); } catch(e){}
  try { const stmt=db.prepare("SELECT rowid, * FROM keys"); while(stmt.step()) keys.push(stmt.getAsObject()); stmt.free(); } catch(e){}
  try { const stmt=db.prepare("SELECT rowid, * FROM entries"); while(stmt.step()) entries.push(stmt.getAsObject()); stmt.free(); } catch(e){}
  try { const stmt=db.prepare("SELECT rowid, * FROM entry_data"); while(stmt.step()) entryData.push(stmt.getAsObject()); stmt.free(); } catch(e){}
  try { const stmt=db.prepare("SELECT rowid, * FROM internal_ids"); while(stmt.step()) internalIds.push(stmt.getAsObject()); stmt.free(); } catch(e){}

  const seen = new Set();
  const resolvedAndFlattened = [];

  for (const row of keyEntries) {
    const tempRow = {};

    let keyValue;
    if (typeof row.key_rowid === 'number') {
      const ref = keys.find(r => r.rowid === row.key_rowid);
      keyValue = ref ? ref.key : row.key_rowid;
    } else {
      keyValue = row.key_rowid;
    }

    let internalIdValue;
    let hashVal, containerVal;

    if (typeof row.entry_rowid === 'number') {
      const entryRef = entries.find(r => r.rowid === row.entry_rowid);
      if (entryRef) {
        const entryCopy = cleanRow(entryRef);

        if (typeof entryCopy.data_rowid === 'number') {
          const dataRef = entryData.find(d => d.rowid === entryCopy.data_rowid);
          if (dataRef) entryCopy.data_rowid = cleanRow(dataRef);
        }

        if (typeof entryCopy.internal_id_rowid === 'number') {
          const intRef = internalIds.find(i => i.rowid === entryCopy.internal_id_rowid);
          if (intRef) entryCopy.internal_id_rowid = intRef.internal_id;
        }

        internalIdValue = entryCopy.internal_id_rowid;

        for (const k in entryCopy) {
          if (k === 'data_rowid') continue;

          if (k === 'internal_id_rowid' && String(keyValue).toLowerCase().includes('.bundle')) {
            continue;
          }
          if (k === 'internal_id_rowid') {
            hashVal = entryCopy[k];
            continue;
          }
          if (k === 'bundle_name') {
            containerVal = entryCopy[k];
            continue;
          }
          tempRow[k] = entryCopy[k];
        }
        if (entryCopy.data_rowid && typeof entryCopy.data_rowid === 'object') {
          for (const k in entryCopy.data_rowid) {
            if (k === 'bundle_name') containerVal = entryCopy.data_rowid[k];
            else tempRow[k] = entryCopy.data_rowid[k];
          }
        }
      }
    }

    for (const k in row) {
      if (k === 'key_rowid' || k === 'entry_rowid') continue;
      if (!(k in tempRow)) tempRow[k] = row[k];
    }

    const lowerKey = String(keyValue).toLowerCase();
    const idKey = keyValue + '|' + (internalIdValue ?? '');
    if (keyValue === internalIdValue) continue;
    if (/_hd$/i.test(keyValue) || /_sd$/i.test(keyValue)) continue;
    if (!(lowerKey.includes('spine/') || lowerKey.includes('.bundle'))) continue;
    if (seen.has(idKey)) continue;
    seen.add(idKey);

    let urlVal = null;
    if (hosturl && containerVal) {
      const parts = fileName.replace(/\.[^.]+$/, "").split("_");
      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];
        if (first.toLowerCase().includes("core")) {
          urlVal = `${hosturl}StandaloneWindows64/${first}/${second}/${keyValue}`;
        } else if (first.toLowerCase().includes("dp")) {
          urlVal = `${hosturl}StandaloneWindows64/pck/${first}/${second}/${keyValue}`;
        }
      }
    }

    const newRow = {};
    if (urlVal) newRow.url = urlVal;
    newRow.key = keyValue;
    if (hashVal) newRow.hash = hashVal;

    for (const k in tempRow) {
      if (k === 'container' || k === 'bundle_name') continue;
      if (!(k in newRow)) newRow[k] = tempRow[k];
    }

    resolvedAndFlattened.push(newRow);
  }

  postMessage({ fileName: fileName + ".json", data: resolvedAndFlattened });
};

