//Syntax
const regexPatterns = {
	'Aim(Physics)': /spine\/physics\/(\w+)\/(\w+)\/aim (\w{1,32})/g,
	'AimShooting(Physics)': /spine\/physics\/(\w+)\/(\w+)\/aim-shooting (\w{1,32})/g,
	'Cover(Physics)': /spine\/physics\/(\w+)\/(\w+)\/cover (\w{1,32})/g,
};

window.onload = function() {
    generateCheckboxes();
    generateSelector();
	loaddecodedData();
};

//Folder Reader
function readFolder(input) {
	const files = input.files;
	let combinedText = "";
	let delimiter = "|";
	if (files.length > 0) {
		for (const file of files) {
			if (file.name.toLowerCase().endsWith('.json')) {
				if (file.size >= 0 && file.size <= 25000000) { // kek
					const reader = new FileReader();
					reader.onload = function (e) {
						let fileContent = e.target.result;
						const matchKeyData = fileContent.match(/"m_KeyDataString":\s*"([^"]+)"/);
						const matchSpinePhysics = fileContent.match(/spinephysicssettings_assets_all_([a-zA-Z0-9]+)|spineinternal_assets_all_([^"]+).bundle","{UnityEngine.AddressableAssets.Addressables.RuntimePath}\\\\\\\\StandaloneWindows64\\\\\\\\mods\\\\\\\\([a-zA-Z0-9]+)/);
						if (matchSpinePhysics && document.getElementById("txtphysics")) {
							let word = matchSpinePhysics[1] || matchSpinePhysics[3];
							if (word && word.length !== 0) {
								document.getElementById("txtphysics").value = word;
								if (matchKeyData) {
									let longString = matchKeyData[1];
									combinedText += longString + delimiter; 
									const decoded = decodeBase64(combinedText);
									document.getElementById('decoded').value = decoded;
								}
							}
							checkboxGroup.style.visibility = 'visible';
							updateSelectorState();
							savedecodedData();
						}
					};
					reader.readAsText(file);
				} else {
				}
			} else {
			}
		}
	}
}

//Base64 Decoder
function decodeBase64(encodedInput) {
	const longStrings = encodedInput.split('|');
	let decoded = ''
	for (const longString of longStrings) {
		decoded += atob(longString).replace(/[\x00-\x1F\x7F]/g, ""); 
	}
	const matchedStrings = [];
	for (const key in regexPatterns) {
		const regex = regexPatterns[key];
		let match;
		while ((match = regex.exec(decoded)) !== null) {
			matchedStrings.push(match[0]);
		}
	}
	decoded = matchedStrings.join('\n');
	return decoded;
}

function updateSelectorState() {
	const decoded = document.getElementById("decoded");
	const selector = document.getElementById("selector");
	const exportButton = document.getElementById("exportButton");
	const applyButton = document.getElementById("applyButton");
	const clearButton = document.getElementById("clearButton");
	const checkboxGroup = document.getElementById('checkboxGroup');
	const idFilter = document.getElementById("idFilter");
	const txtphysics = document.getElementById("txtphysics");
	const nuke = document.getElementById("nukebtn");
	exportButton.disabled = selector.value === "None" || decoded.value.trim() === "";
	applyButton.disabled = selector.value === "None" || decoded.value.trim() === "";
	clearButton.disabled = selector.value === "None" || decoded.value.trim() === "";
	selector.disabled = decoded.value.trim() === "";
	idFilter.disabled = decoded.value.trim() === "";
	txtphysics.disabled = decoded.value.trim() === "";
	nuke.disabled = decoded.value.trim() === "";
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

function savedecodedData() {
	const decodedValue = document.getElementById("decoded").value;
	const txtphysicsValue = document.getElementById("txtphysics").value;

	localStorage.setItem('decodedData', decodedValue);
	localStorage.setItem('txtphysicsData', txtphysicsValue);
}

function loaddecodedData() {
	const saveddecodedData = localStorage.getItem('decodedData');
	const savedtxtphysicsData = localStorage.getItem('txtphysicsData');

	if (saveddecodedData && savedtxtphysicsData !== null) {
		document.getElementById("txtphysics").value = savedtxtphysicsData;
		document.getElementById("decoded").value = saveddecodedData;
		checkboxGroup.style.visibility = 'visible';
		updateSelectorState();
	}
}

function nuke() {
	localStorage.removeItem('decodedData');
	localStorage.removeItem('txtphysicsData');
	document.getElementById("decoded").value = '';
	document.getElementById("txtphysics").value = '';
	location.reload();
}

//MAIN		
function analyzeText() {
	const text = document.getElementById("decoded").value;
	const selector = document.getElementById("selector").value;
	const resultContainer = document.getElementById("resultContainer");
	resultContainer.innerHTML = "";
	if (selector === "All") {
		for (const key in regexPatterns) {
			const regex = regexPatterns[key];
			const resultTable = document.createElement("table");
			resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>Container</th></tr></thead><tbody></tbody>`;
			resultContainer.appendChild(resultTable);
			const resultBody = resultTable.querySelector("tbody");
			let matches;
			let rows = [];
			
			while ((matches = regex.exec(text)) !== null) {
			let char = matches[1];
			let variant = matches[2];
				let bundle = matches[3];
				rows.push({ char, variant, bundle });
			}
			rows.sort((a, b) => a.char - b.char || a.variant - b.variant);
				rows.forEach(row => {
				let charWithPrefix = 'c' + row.char;
				resultBody.innerHTML += `<tr><td>${charWithPrefix}</td><td>${row.variant}</td><td>${row.bundle}</td></tr>`;
			});
			resultTable.innerHTML += `<caption>${key}</caption>`;
		}
	} else if (selector !== "None") {
		const regex = regexPatterns[selector];
		const resultTable = document.createElement("table");
		resultTable.innerHTML = `<thead><tr><th>ID</th><th>Ver</th><th>Container</th></tr></thead><tbody></tbody>`;
		resultContainer.appendChild(resultTable);
		const resultBody = resultTable.querySelector("tbody");
		let matches;
		let rows = [];
		
		while ((matches = regex.exec(text)) !== null) {
			let char = matches[1];
			let variant = matches[2];
			let bundle = matches[3];
			rows.push({ char, variant, bundle });
		}
		rows.sort((a, b) => a.char - b.char || a.variant - b.variant);
		rows.forEach(row => {
		let charWithPrefix = 'c' + row.char;
		resultBody.innerHTML += `<tr><td>${charWithPrefix}</td><td>${row.variant}</td><td>${row.bundle}</td></tr>`;
		});
		resultTable.innerHTML += `<caption>${selector}</caption>`;
	}
	highlightRows();
}
