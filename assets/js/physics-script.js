//Syntaxes
const regexPatterns = {
	'Aim(Physics)': /spine\/physics\/(\w+)\/(\w+)\/aim": "(\w+)"/g,
	'AimShooting(Physics)': /spine\/physics\/(\w+)\/(\w+)\/aim-shooting": "(\w+)"/g,
	'Cover(Physics)': /spine\/physics\/(\w+)\/(\w+)\/cover": "(\w+)"/g,
};


window.onload = function() {
    generateCheckboxes();
    generateSelector();
	loadTextAreaData();
	fetchData();
};

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
					const matchIcon = fileContent.match(/spinephysicssettings_assets_all.bundle": "(\w+)"/);

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
					loadingOverlay.style.display = 'none';
					saveTextAreaData();

					loadingOverlay.style.display = 'none';
				};
				reader.readAsText(file);
			}
		}
	} else {
		loadingOverlay.style.display = 'none';
	}
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

	localStorage.setItem('textAreaPhysicsData', textAreaValue);
	localStorage.setItem('textAreaPhysics2Data', textArea2Value);
}

function loadTextAreaData() {
	const savedTextAreaData = localStorage.getItem('textAreaPhysicsData');
	const savedTextArea2Data = localStorage.getItem('textAreaPhysics2Data');

	if (savedTextAreaData && savedTextArea2Data !== null) {
		document.getElementById("textArea").value = savedTextAreaData;
		document.getElementById("textArea2").value = savedTextArea2Data;
		checkboxGroup.style.visibility = 'visible';
		updateSelectorState();
	}
}

function nuke() {
	localStorage.removeItem('textAreaPhysicsData');
	localStorage.removeItem('textAreaPhysics2Data');
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
			resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>Container</th></tr></thead><tbody></tbody>`;
			resultContainer.appendChild(resultTable);
			const resultBody = resultTable.querySelector("tbody");
			let matches;
			let rowsHtml = '';
			while ((matches = regex.exec(text)) !== null) {
				let char, variant, bundle;
					char = matches[1];
					variant = matches[2];
					bundle = matches[3];
					rowsHtml += `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>`;
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
		resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>Container</th></tr></thead><tbody></tbody>`;
		resultContainer.innerHTML = "";
		resultContainer.appendChild(resultTable);
		const resultBody = resultTable.querySelector("tbody");
		let matches;
		let rowsHtml = '';
		while ((matches = regex.exec(text)) !== null) {
			let char, variant, bundle;
				char = matches[1];
				variant = matches[2];
				bundle = matches[3];
			rowsHtml += `<tr><td>${char}</td><td>${variant}</td><td>${bundle}</td></tr>`;
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

