const fileInput = document.getElementById('fileinput');
    const dropzone = document.getElementById('dropzone');
    const droptext = document.getElementById('droptext');
    const startBtn = document.getElementById('start');
    const downloadAllBtn = document.getElementById('downloadAll');
    const fileLinks = document.getElementById('fileLinks');
  let allResults = [];
  let pendingCount = 0; 

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

      const proxiedUrl =
        "https://api.allorigins.win/raw?url=" +
        encodeURIComponent("https://us-lobby.nikke-kr.com/v1/resourcehosts2");

      const resp = await fetch(proxiedUrl, {
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

    const worker = new Worker('worker.js');
    const loadingOverlay = document.getElementById('loading-overlay');
    worker.onmessage = e => {
      if (e.data.error) {
        console.error(e.data.error, e.data.fileName);
      } else {
        const { fileName, data } = e.data;
        allResults.push({ name: fileName, data });
        const jsonBlob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
        const a = document.createElement("a");
        a.download = fileName;
        a.href = URL.createObjectURL(jsonBlob);
        a.textContent = "⬇ " + fileName;
        fileLinks.appendChild(a);
        if(allResults.length>0) downloadAllBtn.style.display='inline-block';
      }

      if (pendingCount > 0) pendingCount -= 1;
      if (pendingCount <= 0) {
        loadingOverlay.style.display = 'none';
      }
    };

    worker.onerror = e => {
      console.error('Worker error', e);
      if (pendingCount > 0) pendingCount -= 1;
      if (pendingCount <= 0) loadingOverlay.style.display = 'none';
    };

    startBtn.addEventListener('click', async () => {
      fileLinks.innerHTML = '';
      allResults = [];
      downloadAllBtn.style.display='none';
      const files = Array.from(fileInput.files || []);
      if(files.length === 0){ 
        alert('Select files first or drop them into the box.'); 
        return; 
      }

      pendingCount = files.length;
      loadingOverlay.style.display = 'block';

      let hosturl = null;
      try {
        hosturl = await fetchHostUrl();
      } catch (err) {
        console.error('Failed to fetch host url', err);
        pendingCount = 0;
        loadingOverlay.style.display = 'none';
        return;
      }

      for (const f of files){
        const ab = await f.arrayBuffer();
        worker.postMessage({ fileName: f.name, arrayBuffer: ab, hosturl }, [ab]);
      }
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