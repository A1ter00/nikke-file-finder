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
	Voice: /voice_required_pc_(\w+)_assets_all_(\w+)\.bundle/g,
	'Voice(MaxBond)': /voice_add_pc_(\w+)_assets_all_(\w+)\.bundle/g,
	'Voice(Title)': /voice_required_titlecall_assets_(\w+)_titlecall_1_(\w+)\.bundle/g,
	Background: /scenariobackground\(hd\)_assets_(\w+)_(\w+).bundle/g,
	EventsWallpaper: /spineeventscenesgroup\(hd\)_assets_spine\/events\/eventscene_(\w+)_(\w+).bundle/g,
};

//File Reader
function readFile(input) {
	const file = input.files[0];
	if (file) {
		let loadingOverlay = document.getElementById('loading-overlay');
		loadingOverlay.style.display = 'block';
		const reader = new FileReader();
		reader.onload = function (e) {
			let fileContent = e.target.result;
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

			fileContent = matchedStrings.join('\n');
			document.getElementById("textArea").value = fileContent;
			updateSelectorState();
			loadingOverlay.style.display = 'none';
		};
		reader.readAsText(file);
	}
}

//Folder Reader
function readFolder(input) {
	let loadingOverlay = document.getElementById('loading-overlay');
	loadingOverlay.style.display = 'block';
	const files = input.files;
	if (files.length > 0) {
		let combinedText = "";
		for (const file of files) {
			if (file.name.toLowerCase().endsWith('.json')) {
				const reader = new FileReader();
				reader.onload = function (e) {
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
						updateSelectorState();
						loadingOverlay.style.display = 'none';
					};
				reader.readAsText(file);
			}
		}
	}
}

//Export Function
function exportTable() {
	const selector = document.getElementById("selector").value;
	const resultContainer = document.getElementById("resultContainer");
	const resultTables = resultContainer.querySelectorAll("table");
	var exportData = "";
	if (selector === "Background"|| selector === "EventsWallpaper"){
		 exportData = [["ID", "File"]];
	} else {
		 exportData = [["ID", "Ver", "File"]];
	}
	resultTables.forEach(table => {
		const rows = table.querySelectorAll("tbody tr");
		rows.forEach(row => {
			const columns = row.querySelectorAll("td");
			const rowData = Array.from(columns).map(column => column.textContent);
			exportData.push(rowData);
		});
	});
	const csvContent = exportData.map(row => row.join(",")).join("\n");
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = `${selector}_Table.csv`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function updateSelectorState() {
	const textArea = document.getElementById("textArea");
	const selector = document.getElementById("selector");
	const exportButton = document.getElementById("exportButton");
	const checkboxGroup = document.getElementById('checkboxGroup');
	exportButton.disabled = selector.value === "None" || selector.value === "All";
	selector.disabled = textArea.value.trim() === "";
	selector.addEventListener('change', function() {
		if (selector.value === 'All') {
			checkboxGroup.style.visibility = 'visible';
		} else {
			checkboxGroup.style.visibility = 'hidden';
		}
	});
	analyzeText();
	updateTableVisibility();
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
				if (key === "Burst(Lobby)" || key === "Burst(Battle)" || key === "Voice" || key === "Voice(MaxBond)" || key === "Voice(Title)") {
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

