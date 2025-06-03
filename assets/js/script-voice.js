/*
c(id)_(variant)_Lobby_Stay
c(id))_(variant)_Lobby_Stay_Love

//All title voices
c(id)_(variant)_titlecall

c(id)_(variant)_EVENT
c(id)_CON
c(id)_SIMULATIONROOM_DIALOGUE
d_main_<name>_
event_<name>_
*/

//Syntaxes
const regexPatterns = {
    Voice: /c(\d{3})(?:_(\d{2}))?_Lobby_Stay_(\d+)\s([\d-]+)\s([\d-]+)/g,
    'Voice(Max)': /c(\d{3})(?:_(\d{2}))?_Lobby_Stay_Love_(\d+)\s([\d-]+)\s([\d-]+)/g,
    'Voice(Title)': /c(\d{3})(?:_(\d{2}))?_titlecall_(\d+)\s([\d-]+)\s([\d-]+)/g
};

window.onload = function() {
    generateCheckboxes();
    generateSelector();
	loadTextAreaData();
};

//Folder Reader
async function readFolder(input) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    const files = input.files;
    const results = [];
    const SQL = await initSqlJs({ locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}` });

    for (const file of files) {
        if (file.name.endsWith('.cat')) {
            const arrayBuffer = await file.arrayBuffer();
            const db = new SQL.Database(new Uint8Array(arrayBuffer));
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");

            for (const table of tables[0].values) {
                const tableName = table[0];
                results.push(`Table: ${tableName}`);
                const tableData = db.exec(`SELECT * FROM ${tableName}`);

                if (tableData.length > 0) {
                    const columns = tableData[0].columns;
                    const rows = tableData[0].values;
                    results.push(columns.join('\t'));
                    rows.forEach(row => results.push(row.join('\t')));
                } else {
                    results.push('No data found in this table.');
                }
                results.push('');
            }
        }
    }
    const textArea = document.getElementById('textArea');
    textArea.value = results.join('\n');
    checkboxGroup.style.visibility = 'visible';
    analyzeText();
	updateSelectorState();
    saveTextAreaData();
	loadingOverlay.style.display = 'none';
}

function updateSelectorState() {
	const textArea = document.getElementById("textArea");
	const selector = document.getElementById("selector");
	const exportButton = document.getElementById("exportButton");
	const applyButton = document.getElementById("applyButton");
	const clearButton = document.getElementById("clearButton");
	const checkboxGroup = document.getElementById('checkboxGroup');
	const idFilter = document.getElementById("idFilter");
	const textArea2 = document.getElementById("textArea2");
    const nuke = document.getElementById("nukebtn");
	exportButton.disabled = selector.value === "None" || textArea.value.trim() === "";
	applyButton.disabled = selector.value === "None" || textArea.value.trim() === "";
	clearButton.disabled = selector.value === "None" || textArea.value.trim() === "";
	selector.disabled = textArea.value.trim() === "";
	idFilter.disabled = textArea.value.trim() === "";
	textArea2.disabled = textArea.value.trim() === "";
    nuke.disabled = textArea.value.trim() === "";
	selector.addEventListener('change', function() {
		if (selector.value === 'All') {
			checkboxGroup.style.visibility = 'visible';
		} else {
			checkboxGroup.style.visibility = 'hidden';
		}
		applyFilter();
	});
	analyzeText();
}

function saveTextAreaData() {
	const textAreaVoiceValue = document.getElementById("textArea").value;
	//const textArea2Value = document.getElementById("textArea2").value;
    localStorage.removeItem('textAreaVoiceData');
	localStorage.setItem('textAreaVoiceData', textAreaVoiceValue);
	//localStorage.setItem('textArea2Data', textArea2Value);
}

function loadTextAreaData() {
	const savedTextAreaVoiceData = localStorage.getItem('textAreaVoiceData');
	//const savedTextArea2Data = localStorage.getItem('textArea2Data');

	if (savedTextAreaVoiceData /*&& savedTextArea2Data*/ !== null) {
		document.getElementById("textArea").value = savedTextAreaVoiceData;
		//document.getElementById("textArea2").value = savedTextArea2Data;
		checkboxGroup.style.visibility = 'visible';
		updateSelectorState();
	}
}

function nuke() {
	localStorage.removeItem('textAreaVoiceData');
	//localStorage.removeItem('textArea2Data');
	document.getElementById("textArea").value = '';
	//document.getElementById("textArea2").value = '';
	location.reload();
}

//MAIN
function analyzeText() {
    const textArea = document.getElementById("textArea");
    const resultContainer = document.getElementById("resultContainer");
    const selector = document.getElementById("selector").value;
    const content = textArea.value;

    resultContainer.innerHTML = '';

    for (const [key, pattern] of Object.entries(regexPatterns)) {
        if (selector !== 'All' && selector !== key) {
            continue;
        }

        let tableData = '';
        const rowsHtml = [];

        tableData += `<table border="1" style="margin-bottom: 20px;">
                        <caption>${key}</caption>
                        <thead><tr><th>ID</th><th>Ver</th><th>File</th></tr></thead>
                        <tbody>`;

        let match;
        while ((match = pattern.exec(content)) !== null) {
            const id = match[1] || ''; 
            const ver = match[2] ? match[2] : '00'; 
            const array4Data = match[4] || '';   
            
            const searchPattern = new RegExp(`${array4Data}\\sab/([^\\s]+)\\.nab`, 'g');
            let fileMatch = searchPattern.exec(content);
            const file = fileMatch ? fileMatch[1].replace('ab/', '').replace('.nab', '') : 'N/A';
            rowsHtml.push(`<tr><td>${id}</td><td>${ver}</td><td>${file}</td></tr>`);
        }

        if (rowsHtml.length > 0) {
            const sortedRows = rowsHtml.sort((a, b) => {
                const aID = a.split('</td>')[0].split('<td>')[1];
                const bID = b.split('</td>')[0].split('<td>')[1];
                const aVer = a.split('</td>')[1].split('<td>')[1];
                const bVer = b.split('</td>')[1].split('<td>')[1];
                if (aID !== bID) {
                    return aID.localeCompare(bID);
                } else {
                    return aVer.localeCompare(bVer);
                }
            });
            tableData += sortedRows.join('') + '</tbody></table>';
            resultContainer.innerHTML += tableData;
        }
    }
    highlightRows();
    updateTableVisibility(); 
}

