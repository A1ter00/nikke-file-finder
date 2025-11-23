document.addEventListener('DOMContentLoaded', function() {
    fetchData(); 

    var applyButton = document.getElementById("applyButton");
    var uploadFolder = document.getElementById('uploadFolder');
    var folderInput = document.getElementById('folderInput');

    if (uploadFolder && folderInput) {
        uploadFolder.addEventListener('click', function() {
            folderInput.click();
        });
    }

    var checkboxes = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length > 0) {
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateTableVisibility);
        });
    }

    if (applyButton) {
        document.addEventListener("keypress", function(event) {
            if (event.keyCode === 13) { 
                applyButton.click();
            }
        });
    }
});

// Fetch Nikke IDs
let nikkeNameID = {};
function fetchData() {
    const localStorageData = localStorage.getItem('textIDData');
    let localData = null;

    if (localStorageData) {
        localData = JSON.parse(localStorageData);
        const processedLocal = processFetchedData(localData);
        displayData(processedLocal);
        setupSearch();
    }

    fetch('https://nkas-l2d.pages.dev/characters.json') // https://api.dotgg.gg/nikke/characters/id https://nkas-l2d.pages.dev/characters.json
        .then(response => response.json())
        .then(fetchedData => {
            const storedString = JSON.stringify(localData);
            const fetchedString = JSON.stringify(fetchedData);

            if (storedString !== fetchedString) {
                localStorage.setItem('textIDData', fetchedString);
                const processedFetched = processFetchedData(fetchedData);
                displayData(processedFetched);
                setupSearch();
            }
        })
}

function processFetchedData(data) {
    const processedData = {};
    for (const [rawKey, name] of Object.entries(data)) {
        const key = String(rawKey).replace(/^c/, '');
        const parts = key.split('_');
        const numPart = parts[0];
        const variantPart = parts[1];
        if (!/^\d+$/.test(numPart)) {
            processedData[key] = name;
            continue;
        }
        const baseId = String(numPart);
        const id = variantPart ? `${baseId}_${variantPart}` : baseId;
        processedData[id] = name;
    }
    nikkeNameID = processedData;
    return processedData;
}


function displayData(data) {
    const tableBody = document.querySelector('#charactersTable tbody');
    if (tableBody) {
        tableBody.innerHTML = ''; 

        if (data && typeof data === 'object') { 
            for (const id in data) {
                if (data.hasOwnProperty(id)) {
                    const base = getFirstPartOfChar(String(id));
                    const ver = getVariantFromChar(String(id));
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${base}</td>
                        <td>${ver}</td>
                        <td>${data[id]}</td>
                    `;
                    row.dataset.id = id;
                    row.dataset.base = base;
                    row.dataset.ver = ver;
                    row.dataset.name = data[id].toLowerCase();
                    tableBody.appendChild(row);
                }
            }
        } else {
            console.error('Invalid data format');
        }
    } 
}

// Search for nikke ID
function setupSearch() {
    if (document.getElementById('nikkeSearchInput')) return;

    const searchInput = document.createElement('input');
    searchInput.id = 'nikkeSearchInput';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search by Name or ID';
    searchInput.style.color = 'black';
    searchInput.style.marginBottom = '10px';

    const table = document.querySelector('#charactersTable');
    if (table) {
        table.parentNode.insertBefore(searchInput, table);
    }

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#charactersTable tbody tr');
        const visibleRows = [];

        rows.forEach(row => {
            const id = row.dataset.id || '';
            const base = row.dataset.base || '';
            const ver = row.dataset.ver || '';
            const name = row.dataset.name || '';
            let match = false;
            if (id.includes(searchTerm) || base.includes(searchTerm) || ver.includes(searchTerm) || name.includes(searchTerm)) {
                match = true;
            } else {
                if (/^\d+$/.test(searchTerm) && id.startsWith(searchTerm + '_')) {
                    match = true;
                }
            }
            if (match) {
                row.style.display = '';
                visibleRows.push(row);
            } else {
                row.style.display = 'none';
            }
        });
        rows.forEach(row => {
            row.classList.remove('force-odd', 'force-even');
        });
        visibleRows.forEach((row, index) => {
            if (index % 2 === 0) {
                row.classList.add('force-odd');
            } else {
                row.classList.add('force-even');
            }
        });
    });
}

function loadPage(page) {
    document.getElementById('maincontent').src = page;
}

function handleClick(clickedId, pageName) {
    const linkElement = document.getElementById(clickedId);
    if (linkElement) {
        document.querySelectorAll('.topnav a').forEach(link => {
            link.classList.remove('active');
        });
        linkElement.classList.add('active');
        loadPage(pageName);
    }
}

//Export Function
function exportTable() {
    const selector = document.getElementById("selector").value;
    const resultContainer = document.getElementById("resultContainer");
    const resultTables = resultContainer.querySelectorAll("table");
    let exportData = [];
    const filename = window.location.pathname.split('/').pop().split('.')[0];
    
    resultTables.forEach((table, tableIndex) => {
        const tableData = [];
        const startCol = tableIndex * 6;
        const tableTitle = table.querySelector("caption") ? table.querySelector("caption").textContent : "No Title";
        tableData.push([tableTitle]);
        const headers = table.querySelectorAll("thead th");
        const headerData = Array.from(headers).map(header => header.textContent);
        tableData.push(headerData);
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach(row => {
            const columns = row.querySelectorAll("td");
            const rowData = Array.from(columns).map(column => column.textContent);
            tableData.push(rowData);
        });
        tableData.forEach((row, rowIndex) => {
            if (!exportData[rowIndex]) {
                exportData[rowIndex] = [];
            }
            while (exportData[rowIndex].length < startCol) {
                exportData[rowIndex].push("");
            }
            exportData[rowIndex] = exportData[rowIndex].concat(row);
        });
    });

    let customName = selector === 'All' ? `All(${filename})` : selector;
    const csvContent = exportData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${customName}_Table.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Search Function
function applyFilter() {
    let idFilter = document.getElementById("idFilter").value.trim().toLowerCase();

    if (!idFilter) {
        updateTableVisibility();
        closeFilteredResultsPopup();
        return;
    }

    const cMatch = idFilter.match(/^c(\d+)(?:_(\d+))?$/);
    if (cMatch) {
        idFilter = cMatch[1];
    } else if (idFilter.includes('_')) {
        idFilter = getFirstPartOfChar(idFilter);
    }

    let idsToSearch = new Set();
    for (const [id, name] of Object.entries(nikkeNameID)) {
        const baseId = getFirstPartOfChar(String(id)).toLowerCase();
        if (baseId.includes(idFilter) || name.toLowerCase().includes(idFilter)) {
            idsToSearch.add(baseId);
        }
    }

    const resultTables = document.querySelectorAll(".table-container table");
    resultTables.forEach(table => {
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach(row => {
            const idColumn = row.querySelector("td:first-child");
            const rawIdValue = idColumn ? idColumn.textContent.trim().toLowerCase() : '';
            const baseIdValue = getFirstPartOfChar(rawIdValue).toLowerCase();
            const isMatch = [...idsToSearch].some(idToSearch => baseIdValue.includes(idToSearch));
            if (isMatch || baseIdValue.includes(idFilter)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });

    updateTableVisibility();
    showFilteredResultsPopup([...idsToSearch]);
}

// Filtered Result Popup
function showFilteredResultsPopup(filteredIds) {
    const existingPopup = document.getElementById("filteredResultsPopup");
    if (existingPopup) {
        existingPopup.remove();
    }
    const popup = document.createElement("div");
    popup.id = "filteredResultsPopup";
    popup.classList.add("filtered-results-popup");
    const popupHeader = document.createElement("div");
    popupHeader.classList.add("filtered-results-header");
    const popupTitle = document.createElement("h3");
    popupTitle.classList.add("filtered-results-title");
    popupTitle.textContent = `"${document.getElementById("idFilter").value}"`;
    const closeButton = document.createElement("button");
    closeButton.classList.add("filtered-results-close-button");
    closeButton.textContent = "X";
    closeButton.onclick = closeFilteredResultsPopup;
    popupHeader.appendChild(popupTitle);
    popupHeader.appendChild(closeButton);
    popup.appendChild(popupHeader);
    const popupContent = document.createElement("div");
    popupContent.classList.add("filtered-results-content");
    const resultList = document.createElement("ul");
    resultList.classList.add("filtered-results-list");

    function getNameForBase(base) {
        for (const [key, val] of Object.entries(nikkeNameID)) {
            if (String(getFirstPartOfChar(String(key))).toLowerCase() === String(base).toLowerCase()) {
                return val;
            }
        }
        return nikkeNameID[base] || '';
    }

    filteredIds = filteredIds.map(String);
    filteredIds.sort((a, b) => Number(a) - Number(b));
    filteredIds.forEach(base => {
        const matches = [];
        for (const [key, val] of Object.entries(nikkeNameID)) {
            if (String(getFirstPartOfChar(String(key))).toLowerCase() === String(base).toLowerCase()) {
                const variant = getVariantFromChar(String(key));
                matches.push({ key, variant, name: val });
            }
        }
        if (matches.length === 0) {
            const fallbackName = getNameForBase(base);
            const listItem = document.createElement("li");
            listItem.textContent = `${base}: ${fallbackName}`;
            resultList.appendChild(listItem);
        } else {
            matches.sort((a, b) => {
                const na = Number(a.variant);
                const nb = Number(b.variant);
                if (!isNaN(na) && !isNaN(nb)) return na - nb;
                return a.variant.localeCompare(b.variant);
            });
            matches.forEach(m => {
                const displayId = m.key.includes('_') ? m.key : base;
                const listItem = document.createElement("li");
                listItem.textContent = `${displayId}: ${m.name}`;
                resultList.appendChild(listItem);
            });
        }
    });

    popupContent.appendChild(resultList);
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
}

function closeFilteredResultsPopup() {
    const popup = document.getElementById("filteredResultsPopup");
    if (popup) {
        popup.remove();
    }
}

function clearFilter() {
    const resultTables = document.querySelectorAll(".table-container table");
    const selector = document.getElementById("selector").value;

    resultTables.forEach(table => {
        const tableBody = table.querySelector("tbody");
        const rows = tableBody.querySelectorAll("tr");
        rows.forEach(row => {
            row.style.display = "";
        });

        if (selector === 'All') {
            table.style.display = "";
        }
    });
    updateTableVisibility();
    document.getElementById("idFilter").value = "";
    closeFilteredResultsPopup();
}

function updateTableVisibility() {
    const resultTables = document.querySelectorAll(".table-container table");
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const selector = document.getElementById("selector").value;

    resultTables.forEach((table, index) => {
        const checkbox = checkboxes[index];
        if (checkbox) {
            const tableBody = table.querySelector("tbody");
            const rows = tableBody.querySelectorAll("tr");
            let hasVisibleRows = false;

            rows.forEach(row => {
                if (row.style.display !== "none") {
                    hasVisibleRows = true;
                }
            });

            if (selector === 'All') {
                if (!checkbox.checked || !hasVisibleRows) {
                    table.style.display = "none";
                } else {
                    table.style.display = "";
                }
            } else {
                table.style.display = "";
            }
        }
    });
}

// File Variant
function getVariantFromChar(tchar) {
    return tchar.includes("_") ? tchar.split("_")[1] : "00";
}

// Remove Variant from ID
function getFirstPartOfChar(tchar) {
    const parts = tchar.split('_');
    return parts.length > 0 ? parts[0] : tchar;
}

// Table Layout
function highlightRows() {
    const resultTables = document.querySelectorAll(".table-container table");
    resultTables.forEach(table => {
        const tableBody = table.querySelector("tbody");
        const rows = tableBody ? tableBody.querySelectorAll("tr") : [];
        let idRowsMap = new Map();

        rows.forEach(row => {
            const firstCol = row.querySelector("td:first-child");
            const id = firstCol ? firstCol.textContent.trim() : '';
            if (!idRowsMap.has(id)) {
                idRowsMap.set(id, []);
            }
            idRowsMap.get(id).push(row);
        });

        idRowsMap.forEach(idRows => {
            let groupStarted = false;
            const columnCount = idRows[0] ? idRows[0].querySelectorAll("td").length : 0;
            idRows.forEach((row, index) => {
                const secondColumn = row.querySelector("td:nth-child(2)");
                const thirdColumn = row.querySelector("td:nth-child(3)");
                const isSecondColumnExceeded = secondColumn ? secondColumn.textContent.length > 2 : false;
                const isThirdColumnExceeded = thirdColumn ? (thirdColumn.textContent.length > 32 && thirdColumn.textContent.length !== 64) : false;

                if (!groupStarted) {
                    row.style.borderTop = "2px solid black";
                    groupStarted = true;
                } else {
                    row.style.borderTop = "none";
                }
                if (columnCount > 2 && (isSecondColumnExceeded || isThirdColumnExceeded)) {
                    row.style.backgroundColor = "lightcoral";
                } else {
                    row.style.backgroundColor = "";
                }
                const lastColumn = row.querySelector("td:last-child");
                if (lastColumn) {
                    lastColumn.style.borderRight = "2px solid black";
                }
                const firstColumnElem = row.querySelector("td:first-child");
                if (firstColumnElem) {
                    firstColumnElem.style.borderLeft = "2px solid black";
                }
            });

            if (groupStarted) {
                const lastRow = idRows[idRows.length - 1];
                lastRow.style.borderBottom = "2px solid black";
                const lastColumn = lastRow.querySelector("td:last-child");
                if (lastColumn) {
                    lastColumn.style.borderRight = "2px solid black";
                }
            }
        });

        const headerRow = table.querySelector("thead tr");

        if (headerRow) {
            headerRow.style.borderTop = "2px solid black";
            headerRow.style.borderBottom = "2px solid black";
            const firstHeader = headerRow.querySelector("th:first-child");
            if (firstHeader) {
                firstHeader.style.borderLeft = "2px solid black";
            }
            const lastHeader = headerRow.querySelector("th:last-child");
            if (lastHeader) {
                lastHeader.style.borderRight = "2px solid black";
            }
        }
    });
}

function generateCheckboxes() {
    const checkboxGroup = document.getElementById('checkboxGroup');
    checkboxGroup.innerHTML = '';

    for (const [key, _] of Object.entries(regexPatterns)) {
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = key;
        checkbox.checked = true; 

        const label = document.createElement('label');
        label.htmlFor = key;
        label.textContent = key;

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);
        checkboxGroup.appendChild(checkboxContainer);
        checkbox.addEventListener('change', updateTableVisibility);
    }
}

function generateSelector() {
    const selector = document.getElementById('selector');
    const options = ['All', ...Object.keys(regexPatterns), 'None'];

    selector.innerHTML = '';

    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === 'All') {
            opt.selected = true; 
        }
        selector.appendChild(opt);
    });
    selector.disabled = true;
}

let goToTopBtn = document.getElementById("goToTopBtn");
document.addEventListener("DOMContentLoaded", function() {
    var resultContainer = document.getElementById("resultContainer");
    var goToTopBtn = document.getElementById("goToTopBtn"); 
    
    if (resultContainer) {
        resultContainer.addEventListener("scroll", function() {
            if (this.scrollTop > 20) {
                goToTopBtn.style.display = "block";
            } else {
                goToTopBtn.style.display = "none";
            }
        });
    }
});

function scrollToTop() {
    document.getElementById("resultContainer").scrollTo({ top: 0, behavior: 'smooth' });
}

function majornuke() {
	localStorage.removeItem('textAreaData');
	localStorage.removeItem('textArea2Data');
    localStorage.removeItem('textAreaData2');
	localStorage.removeItem('textArea2Data2');
    localStorage.removeItem('textAreaPhysicsData');
	localStorage.removeItem('textAreaPhysics2Data');
    localStorage.removeItem('textAreaVoiceData');
    localStorage.removeItem('textIDData');
	//location.reload();
    parent.location.href = 'index.html';
}