//Syntaxes
const regexPatterns = {
	Aim: /spinecombatcharactergroup\(sd\)_assets_spine\/combat\/(\w+)\/(\w+)\/aim_sd_(\w+)\.bundle/g, 
	Cover: /spinecombatcharactergroup\(sd\)_assets_spine\/combat\/(\w+)\/(\w+)\/cover_sd_(\w+)\.bundle/g, 
	Standing: /spinestandingcharactergroup\(sd\)_assets_spine\/standing\/(\w+)\/(\w+)_sd_(\w+)\.bundle/g, 
	'Portrait(Full)': /icons-char-full\(sd\)_assets_(\w+)_(\w+)_(\w+)\.bundle/g, 
	'Portrait(Medium)': /icons-char-mi\(sd\)_assets_mi_(\w+)_(\w+)_s_(\w+)\.bundle/g, 
	Background: /scenariobackground\(sd\)_assets_(\w+).bundle_(\w+)\.bundle/g
};

const errorAlert = document.getElementById('error-alert');

function showError(message) {
  errorAlert.style.display = 'block';
  const errorMsg = document.createElement('div');
  errorMsg.style.marginBottom = errorAlert.children.length > 0 ? '8px' : '0';
  errorMsg.innerHTML = '✘ ' + message;
  errorAlert.appendChild(errorMsg);
  
  setTimeout(() => {
    if (errorMsg.parentNode) errorMsg.remove();
    if (errorAlert.children.length === 0) errorAlert.style.display = 'none';
  }, 5000);
}

window.onload = function() {
    generateCheckboxes();
    generateSelector();
	loadTextAreaData();
	fetchData();
};

function readFolder(input) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    errorAlert.innerHTML = '';
    errorAlert.style.display = 'none';
    
    const files = input.files;
    let hasValidFiles = false;
    let filesProcessed = 0;
    
    if (files.length > 0) {
        let combinedText = "";
        const validFilesCount = countValidFiles(files);
        
        if (validFilesCount === 0) {
            loadingOverlay.style.display = 'none';
            showError('No valid JSON files found in the selected folder');
            return;
        }
        
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.json')) {
                hasValidFiles = true;
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const fileContent = e.target.result;
                        const matchedStrings = [];
                        const matchIcon = fileContent.match(/icons-char-si\(sd\)_assets_all_(\w+)\.bundle/);

                        if (matchIcon) {
                            let word = matchIcon[1];
                            document.getElementById("textArea2").value = word;
                        }

                        for (const key in regexPatterns) {
                            const regex = regexPatterns[key];
                            let match;
                            while ((match = regex.exec(fileContent)) !== null) {
                                matchedStrings.push(match[0]);
                            }
                        }

                        combinedText += matchedStrings.join('\n');
                        document.getElementById("textArea").value = combinedText;
                        checkboxGroup.style.visibility = 'visible';
                        updateSelectorState();
                        saveTextAreaData();
                    } catch (error) {
                        console.error("Error processing file:", file.name, error);
                    } finally {
                        filesProcessed++;
                        if (filesProcessed === validFilesCount) {
                            loadingOverlay.style.display = 'none';
                        }
                    }
                };
                reader.onerror = function() {
                    filesProcessed++;
                    if (filesProcessed === validFilesCount) {
                        loadingOverlay.style.display = 'none';
                    }
                };
                reader.readAsText(file);
            }
        }
        
        if (!hasValidFiles) {
            loadingOverlay.style.display = 'none';
        }
    } else {
        loadingOverlay.style.display = 'none';
    }
}

function countValidFiles(files) {
    let count = 0;
    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.json')) {
            count++;
        }
    }
    return count;
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
	const textAreaValue = document.getElementById("textArea").value;
	const textArea2Value = document.getElementById("textArea2").value;

	localStorage.setItem('textAreaData2', textAreaValue);
	localStorage.setItem('textArea2Data2', textArea2Value);
}

function loadTextAreaData() {
	const savedTextAreaData = localStorage.getItem('textAreaData2');
	const savedTextArea2Data = localStorage.getItem('textArea2Data2');

	if (savedTextAreaData && savedTextArea2Data !== null) {
		document.getElementById("textArea").value = savedTextAreaData;
		document.getElementById("textArea2").value = savedTextArea2Data;
		checkboxGroup.style.visibility = 'visible';
		updateSelectorState();
	}
}

function nuke() {
	localStorage.removeItem('textAreaData2');
	localStorage.removeItem('textArea2Data2');
	document.getElementById("textArea").value = '';
	document.getElementById("textArea2").value = '';
	location.reload();
}

//MAIN
function analyzeText() {
	const text = document.getElementById("textArea").value;
	const selector = document.getElementById("selector").value;
	const resultContainer = document.getElementById("resultContainer");
	if (selector === "All") {
		resultContainer.innerHTML = "";
		for (const key in regexPatterns) {
			const regex = regexPatterns[key];
			const resultTable = document.createElement("table");
			if (key === "Background" || key === "EventsWallpaper"){
					resultTable.innerHTML = `<thead><tr><th>ID</th><th>File</th></tr></thead><tbody></tbody>`;
			} else {
					resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>File</th></tr></thead><tbody></tbody>`;
			}
			resultContainer.appendChild(resultTable);
			const resultBody = resultTable.querySelector("tbody");
			regex.lastIndex = 0;
			let matches;
			const rows = [];
			const seen = new Set();
			while ((matches = regex.exec(text)) !== null) {
				let tchar, char, variant, bundle;
				if (key === "Burst(Lobby)" || key === "Burst(Battle)") {
					tchar = matches[1];
					char = getFirstPartOfChar(tchar);
					variant = getVariantFromChar(tchar);
					bundle = matches[2];
				} else if (key === "Background" || key === "EventsWallpaper"){
					char = matches[1];
					bundle = matches[2];
				} else {
					char = matches[1];
					variant = matches[2];
					bundle = matches[3];
				}
				let dedupeKey, rowObj;
				if (key === "Background" || key === "EventsWallpaper"){
					dedupeKey = `${char}|${bundle}`;
					rowObj = { id: char, ver: bundle, html: `<tr><td>${char}</td><td>${bundle}</td></tr>` };
				} else {
					dedupeKey = `${char}|${variant}|${bundle}`;
					rowObj = { id: char, ver: variant, html: `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>` };
				}
				if (!seen.has(dedupeKey)) {
					seen.add(dedupeKey);
					rows.push(rowObj);
				}
			}
			rows.sort((a, b) => {
				if (a.id !== b.id) return a.id.localeCompare(b.id);
				return a.ver.localeCompare(b.ver);
			});
			resultBody.innerHTML = rows.map(r => r.html).join('');
			resultTable.innerHTML += `<caption>${key}</caption>`;
		}
	} else if (selector !== "None") {
		const regex = regexPatterns[selector];
		const resultTable = document.createElement("table");
		if (selector === "Background" || selector === "EventsWallpaper"){
			resultTable.innerHTML = `<thead><tr><th>ID</th><th>File</th></tr></thead><tbody></tbody>`;
		} else {
			resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>File</th></tr></thead><tbody></tbody>`;
		}
		resultContainer.innerHTML = "";
		resultContainer.appendChild(resultTable);
		const resultBody = resultTable.querySelector("tbody");
		regex.lastIndex = 0;
		let matches;
		const rows = [];
		const seen = new Set();
		while ((matches = regex.exec(text)) !== null) {
			let tchar, char, variant, bundle;
			if (selector === "Burst(Lobby)" || selector === "Burst(Battle)" || selector === "Voice" || selector === "Voice(MaxBond)" || selector === "Voice(Title)") {
				tchar = matches[1];
				char = getFirstPartOfChar(tchar);
				variant = getVariantFromChar(tchar);
				bundle = matches[2];
			} else if (selector === "Background" || selector === "EventsWallpaper"){
				char = matches[1];
				bundle = matches[2];
			} else {
				char = matches[1];
				variant = matches[2];
				bundle = matches[3];
			}
			let dedupeKey, rowObj;
			if (selector === "Background" || selector === "EventsWallpaper"){
				dedupeKey = `${char}|${bundle}`;
				rowObj = { id: char, ver: bundle, html: `<tr><td>${char}</td><td>${bundle}</td></tr>` };
			} else {
				dedupeKey = `${char}|${variant}|${bundle}`;
				rowObj = { id: char, ver: variant, html: `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>` };
			}
			if (!seen.has(dedupeKey)) {
				seen.add(dedupeKey);
				rows.push(rowObj);
			}
		}
		rows.sort((a, b) => {
			if (a.id !== b.id) return a.id.localeCompare(b.id);
			return a.ver.localeCompare(b.ver);
		});
		resultBody.innerHTML = rows.map(r => r.html).join('');
		resultTable.innerHTML += `<caption>${selector}</caption>`;
	} else {
		resultContainer.innerHTML = "";
	}
	highlightRows();
}

