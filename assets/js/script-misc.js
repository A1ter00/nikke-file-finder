document.getElementById('folderInput').addEventListener('change', async function(event) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    
    let files = event.target.files;
    let tablesDiv = document.getElementById('resultContainer');
    let textArea = document.getElementById('textArea');
    
    tablesDiv.innerHTML = '';
    textArea.value = '';

    let results = {};
    let extractedData = [];

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.name.endsWith('.json')) {
            let content = await readFileAsync(file);
            let regex = /"key":\s*"([^_-]+)[_-]([^"]+)_([^"].*?)\.bundle"/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                let type = match[1];
                let groupname = match[2];
                let hash = match[3];

                if (!/^[a-zA-Z0-9]{32}$/.test(hash)) {
                    groupname += `_${hash}`;
                    hash = '';
                }

                if (!results[type]) {
                    results[type] = [];
                }
                results[type].push({ groupname, hash });
                extractedData.push(`Type: ${type}, Group: ${groupname}, Hash: ${hash}`);
            }
        }
    }
    
    textArea.value = extractedData.join('\n');
    generateTables(results);
    highlightRows();
    updateSelectorState();
    loadingOverlay.style.display = 'none';

    async function readFileAsync(file) {
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = function() {
                resolve(reader.result);
            };
            reader.onerror = function() {
                reject(reader.error);
            };
            reader.readAsText(file);
        });
    }
    
    function updateSelectorState(){
        let elements = ["selector", "exportButton", "applyButton", "clearButton", "idFilter"];
        elements.forEach(id => {
        document.getElementById(id).disabled = false;
        });
    }
    
    function generateTables(results) {
        let selector = document.getElementById('selector');
        selector.innerHTML = '';
        selector.addEventListener('change', function() {
            let selectedType = this.value;
            let tables = document.querySelectorAll('table');
            
            tables.forEach(table => table.style.display = 'none');
            
            tables.forEach(table => {
                let captionElement = table.querySelector('caption');
                let caption = captionElement ? captionElement.textContent : '';
                if (selectedType === 'All' || caption === selectedType) {
                    table.style.display = '';
                }
            });
        });
        
        let allOption = document.createElement('option');
        allOption.textContent = 'All';
        selector.appendChild(allOption);
    
        for (let type in results) {
            if (results.hasOwnProperty(type)) {
                let table = document.createElement('table');
                let caption = document.createElement('caption');
                caption.textContent = type;
                table.appendChild(caption);
    
                let tbody = table.createTBody();
                results[type].forEach(result => {
                    let row = tbody.insertRow();
                    let groupnameCell = row.insertCell();
                    groupnameCell.textContent = result.groupname;
                    let hashCell = row.insertCell();
                    hashCell.textContent = result.hash;
                });
    
                tablesDiv.appendChild(table);
    
                let option = document.createElement('option');
                option.textContent = type;
                selector.appendChild(option);
            }
        }
    
        let noneOption = document.createElement('option');
        noneOption.textContent = 'None';
        selector.appendChild(noneOption);
    }
});
