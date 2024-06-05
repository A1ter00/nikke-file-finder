//Folder Reader
document.getElementById('folderInput').addEventListener('change', async function(event) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';

    let files = event.target.files;
    let tablesDiv = document.getElementById('resultContainer');
    tablesDiv.innerHTML = '';

    let results = {};

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (file.name.endsWith('.json')) {
            let content = await readFileAsync(file);
            let regex = /{([^}]*)}\\([^_]+(?:_[^_]+)*?)_([^_]+)\.bundle/g; //witchcraft
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
            }
        }
    }
    
    generateTables(results);
    highlightRows();

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

    //Generate Objects
    function generateTables(results) {
        clearSelector();
        clearExportButton();
    
        let selectorDiv = document.getElementById('selectorDiv');
        let selector = document.createElement('select');
        selector.id = 'selector';
        selector.addEventListener('change', function() {
            let selectedType = this.value;
            let tables = document.querySelectorAll('table');
        
            tables.forEach(table => {
                table.style.display = 'none';
            });
        
            tables.forEach(table => {
                let captionElement = table.querySelector('caption');
                let caption = captionElement ? captionElement.textContent : '';
                if (selectedType === 'All') {
                    table.style.display = '';
                    let searchInput = document.querySelector('#searchInputDiv input');
                    searchInput.dispatchEvent(new Event('input'));
                } else {
                    if (caption === selectedType) {
                        table.style.display = '';
                    }
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
    
        selectorDiv.appendChild(selector);
    }
    
    function clearSelector() {
        let existingSelector = document.getElementById('selector');
        if (existingSelector) {
            existingSelector.remove();
        }
    }

    function clearExportButton() {
        let existingExportButton = document.querySelector('#exportButtonDiv button');
        if (existingExportButton) {
            existingExportButton.remove();
        }
    }

    function generateExportButton() {
        clearExportButton();

        let exportButtonDiv = document.getElementById('exportButtonDiv');
        let exportButton = document.createElement('button');
        exportButton.textContent = 'Export Table';
        exportButton.addEventListener('click', exportTables);
        exportButtonDiv.appendChild(exportButton);
    }

    function exportTables() {
        let selectedType = document.getElementById('selector').value;
        if (selectedType === 'None') {
            return;
        }
    
        let tables = document.querySelectorAll('table');
        let selectedTables = [...tables].filter(table => {
            let captionElement = table.querySelector('caption');
            let caption = captionElement ? captionElement.textContent : '';
            return captionElement && (selectedType === 'All' || captionElement.textContent === selectedType);
        });
    
        let csvContent = "data:text/csv;charset=utf-8,";
        selectedTables.forEach(table => {
            let captionElement = table.querySelector('caption');
            let caption = captionElement ? captionElement.textContent : '';            
            let rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                let rowData = [caption];
                row.childNodes.forEach(cell => {
                    if (cell.textContent) {
                        rowData.push(cell.textContent.trim());
                    }
                });
                csvContent += rowData.join(',') + '\n';
            });
        });
    
        let fileName = selectedType === 'All' ? 'All(Misc)_Tables.csv' : `${selectedType}-Table.csv`;
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    generateExportButton();

    document.getElementById('selector').addEventListener('change', function() {
        let exportButton = document.querySelector('#exportButtonDiv button');
        if (this.value === 'None') {
            exportButton.disabled = true;
        } else {
            exportButton.disabled = false;
        }
    });

    function generateSearchInput() {
        let searchInputDiv = document.getElementById('searchInputDiv');
        let searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', function() {
            let searchTerm = this.value.trim().toLowerCase();
            let selectorValue = document.getElementById('selector').value;
            let tables = document.querySelectorAll('table');
            tables.forEach(table => {
                let rows = table.querySelectorAll('tbody tr');
                let rowVisible = false;
                rows.forEach(row => {
                    let groupnameCell = row.cells[0].textContent.trim().toLowerCase();
                    if (groupnameCell.includes(searchTerm)) {
                        row.style.display = '';
                        rowVisible = true;
                    } else {
                        row.style.display = 'none';
                    }
                });
    
                let emptyTable = !Array.from(rows).some(row => row.style.display !== 'none');
                if (selectorValue === 'All') {
                    table.style.display = emptyTable ? 'none' : '';
                } else {
                    table.style.display = selectorValue !== table.querySelector('caption').textContent ? 'none' : '';
                }
            });
        });
        
        searchInputDiv.appendChild(searchInput);
    }
    

    function clearSearchInput() {
        let existingSearchInput = document.querySelector('#searchInputDiv input');
        if (existingSearchInput) {
            existingSearchInput.remove();
        }
    }

    clearSearchInput();
    generateSearchInput();

    function generateClearFilterButton() {
        let clearFilterButtonDiv = document.getElementById('clearFilterButtonDiv');
        let clearFilterButton = document.createElement('button');
        clearFilterButton.textContent = 'Clear Filter';
        clearFilterButton.addEventListener('click', function() {
            let searchInput = document.querySelector('#searchInputDiv input');
            searchInput.value = '';
            let tables = document.querySelectorAll('table');
            tables.forEach(table => {
                let rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    row.style.display = '';
                });
                table.style.display = '';
            });
    
            // Show only the table that corresponds to the selector
            let selector = document.getElementById('selector');
            let selectedType = selector.value;
            if (selectedType !== 'All') {
                tables.forEach(table => {
                    let captionElement = table.querySelector('caption');
                    let caption = captionElement ? captionElement.textContent : '';
                    if (caption === selectedType) {
                        table.style.display = '';
                    } else {
                        table.style.display = 'none';
                    }
                });
            }
        });
        clearFilterButtonDiv.appendChild(clearFilterButton);
    }
    

    function clearClearFilterButton() {
        let existingClearFilterButton = document.querySelector('#clearFilterButtonDiv button');
        if (existingClearFilterButton) {
            existingClearFilterButton.remove();
        }
    }

    clearClearFilterButton();
    generateClearFilterButton();

});
