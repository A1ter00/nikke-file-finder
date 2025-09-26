const fileInput = document.getElementById('fileinput');
    const dropzone = document.getElementById('dropzone');
    const droptext = document.getElementById('droptext');
    const startBtn = document.getElementById('start');
    const downloadAllBtn = document.getElementById('downloadAll');
    const fileLinks = document.getElementById('fileLinks');
    let allResults = [];

    function updateDropText(files){
      if(!files || files.length===0){
        droptext.innerHTML = 'Drag & Drop files here<br><small>or click to select</small>';
        return;
      }
      let html = `<strong>${files.length} file${files.length>1?'s':''} selected:</strong><ul>`;
      for(const f of files) html += `<li>${f.name}</li>`;
      html += '</ul>';
      droptext.innerHTML = html;
    }

    // Drag & Drop handlers
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.style.borderColor = '#b641417c';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#aaa';
    });
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.style.borderColor = '#aaa';
      fileInput.files = e.dataTransfer.files;
      updateDropText(fileInput.files);
    });
    fileInput.addEventListener('change', () => updateDropText(fileInput.files));

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

    async function fetchHostUrl() {
      const headers = {
        "Content-Type": "application/octet-stream+protobuf",
        "Accept": "application/octet-stream+protobuf",
        "Accept-Encoding": "gzip,deflate"
      };
      const resp = await fetch("https://us-lobby.nikke-kr.com/v1/resourcehosts2", {
        method: "POST",
        headers
      });
      const text = await resp.text();
      const m = text.match(/https:\/\/(.*)\{Platform\}/);
      if (!m) {
        console.warn("Could not parse host URL from response");
        return null;
      }
      return "https://" + m[1];
    }

    async function processFile(file){
      const loadingOverlay = document.getElementById('loading-overlay');
      if (loadingOverlay) loadingOverlay.style.display = 'block';
      const ab = await file.arrayBuffer();
      const data = new Uint8Array(ab);
      const view = new DataView(ab);
      const magic = new TextDecoder().decode(data.slice(0,4));
      if(magic !== 'NKDB'){ console.error("Not a valid file"); loadingOverlay.style.display = 'none'; return; }
      const version = readUInt32BE(view, 4);
      if(version !== 1){ console.error("Unsupported version", version); loadingOverlay.style.display = 'none'; return; }

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
        } catch(e){ console.error("Decrypt/inflate error:", e); loadingOverlay.style.display = 'none'; return; }
      }
      let total = 0; for(const c of outputChunks) total += c.length;
      const outBuf = new Uint8Array(total); let off=0; for(const c of outputChunks){ outBuf.set(c, off); off += c.length; }

      const SQL = await initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` });
      let db;
      try { db = new SQL.Database(outBuf); } catch (e) { console.error("SQLite open error:", e); loadingOverlay.style.display = 'none'; return; }

      let keyEntries = [], keys = [], entries = [], entryData = [], internalIds = [];
      try { const stmt=db.prepare("SELECT * FROM key_entries"); while(stmt.step()) keyEntries.push(stmt.getAsObject()); stmt.free(); } catch(e){}
      try { const stmt=db.prepare("SELECT rowid, * FROM keys"); while(stmt.step()) keys.push(stmt.getAsObject()); stmt.free(); } catch(e){}
      try { const stmt=db.prepare("SELECT rowid, * FROM entries"); while(stmt.step()) entries.push(stmt.getAsObject()); stmt.free(); } catch(e){}
      try { const stmt=db.prepare("SELECT rowid, * FROM entry_data"); while(stmt.step()) entryData.push(stmt.getAsObject()); stmt.free(); } catch(e){}
      try { const stmt=db.prepare("SELECT rowid, * FROM internal_ids"); while(stmt.step()) internalIds.push(stmt.getAsObject()); stmt.free(); } catch(e){}

      const seen = new Set();
      const resolvedAndFlattened = [];

      const hosturl = await fetchHostUrl();

      for (const row of keyEntries) {
        const newRow = {};

        let urlValue = null;
        if (hosturl) {
          const fname = file.name;
          const base = fname.replace(/\.[^.]+$/, "");
          const parts = base.split("_");
          if (parts.length >= 2) {
            const first = parts[0];
            const second = parts[1];
            if (first.toLowerCase().includes("core")) {
              urlValue = `${hosturl}/StandaloneWindows64/${first}/${second}/key`;
            } else {
              urlValue = `${hosturl}/StandaloneWindows64/pck/${first}/${second}/key`;
            }
          }
        }
        newRow.url = urlValue;

        let keyValue;
        if (typeof row.key_rowid === 'number') {
          const ref = keys.find(r => r.rowid === row.key_rowid);
          keyValue = ref ? ref.key : row.key_rowid;
        } else keyValue = row.key_rowid;
        newRow.key = keyValue;

        let internalIdValue;

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
                newRow.hash = entryCopy[k];
                continue;
              }
              if (k === 'bundle_name') {
                newRow.container = entryCopy[k];
                continue;
              }
              newRow[k] = entryCopy[k];
            }
            if (entryCopy.data_rowid && typeof entryCopy.data_rowid === 'object') {
              for (const k in entryCopy.data_rowid) {
                if (k === 'bundle_name') newRow.container = entryCopy.data_rowid[k];
                else newRow[k] = entryCopy.data_rowid[k];
              }
            }
          }
        }

        for (const k in row) {
          if (k === 'key_rowid' || k === 'entry_rowid') continue;
          if (!(k in newRow)) newRow[k] = row[k];
        }

        const lowerKey = String(newRow.key).toLowerCase();
        const idKey = newRow.key + '|' + (internalIdValue ?? '');
        if (newRow.key === internalIdValue) continue;
        if (/_hd$/i.test(newRow.key) || /_sd$/i.test(newRow.key)) continue;
        if (!(lowerKey.includes('spine/') || lowerKey.includes('.bundle'))) continue;
        if (seen.has(idKey)) continue;
        seen.add(idKey);

        resolvedAndFlattened.push(newRow);
      }

      allResults.push({ name: file.name + ".json", data: resolvedAndFlattened });
      const jsonBlob = new Blob([JSON.stringify(resolvedAndFlattened,null,2)], {type:"application/json"});
      const a = document.createElement("a");
      a.download = file.name + ".json";
      a.href = URL.createObjectURL(jsonBlob);
      a.textContent = "⬇ " + file.name;
      fileLinks.appendChild(a);
      loadingOverlay.style.display = 'none';
    }

    startBtn.addEventListener('click', async () => {
      fileLinks.innerHTML = '';
      allResults = [];
      downloadAllBtn.style.display='none';
      const files = Array.from(fileInput.files || []);
      if(files.length === 0){ alert('Select files first or drop them into the box.'); return; }
      for(const f of files){ await processFile(f); }
      if(allResults.length>0) downloadAllBtn.style.display='inline-block';
    });

    // Download all as zip
    downloadAllBtn.addEventListener('click', async () => {
      const zip = new JSZip();
      for (const item of allResults) {
        let base = item.name.replace(/\.json$/i, '');
        const jsonStr = JSON.stringify(item.data, null, 2);
        zip.file(base + ".json", jsonStr);
      }
      const blob = await zip.generateAsync({ type: "blob" });

      const d = new Date();
      const dateStr = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");

      const a = document.createElement('a');
      a.download = `NIKKE_CATALOG_${dateStr}.zip`;
      a.href = URL.createObjectURL(blob);
      a.click();
    });