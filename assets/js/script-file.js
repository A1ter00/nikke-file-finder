//Syntaxes
const regexPatterns = {
	Aim: /spinecombatcharactergroup\(hd\)_assets_spine\/combat\/(\w+)\/(\w+)\/aim_hd_(\w+)\.bundle/g, 
	Cover: /spinecombatcharactergroup\(hd\)_assets_spine\/combat\/(\w+)\/(\w+)\/cover_hd_(\w+)\.bundle/g, 
	Standing: /spinestandingcharactergroup\(hd\)_assets_spine\/standing\/(\w+)\/(\w+)_hd_(\w+)\.bundle/g, 
	'Portrait(Full)': /icons-char-full\(hd\)_assets_(\w+)_(\w+)_(\w+)\.bundle/g, 
	'Portrait(Medium)': /icons-char-mi\(hd\)_assets_mi_(\w+)_(\w+)_s_(\w+)\.bundle/g, 
	'Burst(Lobby)': /livewallpaperprefabs_assets_livewallpaper\/eventscene_(\w+)_cutscene_(\w+)\.bundle/g, 
	'Burst(Battle)': /spotskillcutscene_assets_(\w+)_cut_scene_(\w+)\.bundle/g,	
	'SD-Model' : /sdcharacters_assets_(\w+)_(\w+)_var_(\w+)\.bundle/g, 
	Background: /scenariobackground\(hd\)_assets_(\w+)_(\w+)\.bundle/g, 
	EventsWallpaper: /spineeventscenesgroup\(hd\)_assets_spine\/events\/eventscene_(\w+)_(\w+)\.bundle/g 
};



window.onload = function() {
    generateCheckboxes();
    generateSelector();
	loadTextAreaData();
	fetchData();
};

function readFolder(input) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    const files = input.files;
    let hasValidFiles = false;
    let filesProcessed = 0;
    
    if (files.length > 0) {
        let combinedText = "";
        const validFilesCount = countValidFiles(files); 
        
        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.json')) {
                hasValidFiles = true;
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const fileContent = e.target.result;
                        const matchedStrings = [];
                        const matchIcon = fileContent.match(/icons-char-si\(hd\)_assets_all_(\w+)\.bundle/);

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

	localStorage.setItem('textAreaData', textAreaValue);
	localStorage.setItem('textArea2Data', textArea2Value);
}

function loadTextAreaData() {
	const savedTextAreaData = localStorage.getItem('textAreaData');
	const savedTextArea2Data = localStorage.getItem('textArea2Data');

	if (savedTextAreaData && savedTextArea2Data !== null) {
		document.getElementById("textArea").value = savedTextAreaData;
		document.getElementById("textArea2").value = savedTextArea2Data;
		checkboxGroup.style.visibility = 'visible';
		updateSelectorState();
	}
}

function nuke() {
	localStorage.removeItem('textAreaData');
	localStorage.removeItem('textArea2Data');
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
			let matches;
			let rowsHtml = '';
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
			if (key === "Background" || key === "EventsWallpaper"){
					rowsHtml += `<tr><td>${char}</td><td>${bundle}</td></tr>`;
				} else {
					rowsHtml += `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>`;
				}
			}
			const sortedRows = rowsHtml.split('</tr>')
				.filter(row => row.trim() !== '')
				.sort((a, b) => {
					const aID = a.split('</td>')[0].split('<td>')[1];
					const bID = b.split('</td>')[0].split('<td>')[1];
					const aVer = a.split('</td>')[1].split('<td>')[1];
					const bVer = b.split('</td>')[1].split('<td>')[1];
					if (aID !== bID) {
						return aID.localeCompare(bID);
					} else {
						return aVer.localeCompare(bVer);
					}
				})
				.join('</tr>');
			resultBody.innerHTML = sortedRows;
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
		let matches;
		let rowsHtml = '';
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
			if (selector === "Background" || selector === "EventsWallpaper"){
				rowsHtml += `<tr><td>${char}</td><td>${bundle}</td></tr>`;
			} else {
				rowsHtml += `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>`;
			}
		}
		const sortedRows = rowsHtml.split('</tr>')
			.filter(row => row.trim() !== '')
			.sort((a, b) => {
				const aID = a.split('</td>')[0].split('<td>')[1];
				const bID = b.split('</td>')[0].split('<td>')[1];
				const aVer = a.split('</td>')[1].split('<td>')[1];
				const bVer = b.split('</td>')[1].split('<td>')[1];
				if (aID !== bID) {
					return aID.localeCompare(bID);
				} else {
					return aVer.localeCompare(bVer);
				}
			})
			.join('</tr>');
		resultBody.innerHTML = sortedRows;
		resultTable.innerHTML += `<caption>${selector}</caption>`;
	} else {
		resultContainer.innerHTML = "";
	}
	highlightRows();
}

