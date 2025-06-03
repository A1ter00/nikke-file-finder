window.onload = function() {
	loadTextAreaData();
};

/*
function saveTextAreaData() {
	const textIDValue = document.getElementById("textArea").value;
	localStorage.setItem('textIDData', textIDValue);
}


function loadTextAreaData() {
	const savedTextIDData = localStorage.getItem('textIDData');

	if (savedTextIDData !== null) {
		document.getElementById("textArea").value = savedTextIDData;
	}
}
*/

document.getElementById('uploadFolder2').addEventListener('click', function() {
    document.getElementById('folderInput2').click();
});

async function readFolder(input) {
    let loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'block';
    const files = input.files;
    let results = {};
    const SQL = await initSqlJs({ locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/${file}` });

    function capitalizeWords(str) {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    for (const file of files) {
        if (file.name === 'CharacterSearchTable_en.lss') {
            const arrayBuffer = await file.arrayBuffer();
            const db = new SQL.Database(new Uint8Array(arrayBuffer));
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");

            for (const table of tables[0].values) {
                const tableName = table[0];
                const tableData = db.exec(`SELECT * FROM ${tableName}`);

                if (tableData.length > 0) {
                    const rows = tableData[0].values;

                    rows.forEach(row => {
                        let secondColumn = row[1];
                        let firstColumn = row[0];

                        if (typeof secondColumn === 'string') {
                            secondColumn = capitalizeWords(secondColumn);
                        }
                        if (typeof firstColumn === 'string') {
                            firstColumn = capitalizeWords(firstColumn);
                        }

                        results[secondColumn] = firstColumn;
                    });
                }
            }
            break;
        }
    }
    const textArea = document.getElementById('textArea');
    textArea.value = JSON.stringify(results, null, 2);
    saveTextAreaData();
    parent.location.href = 'index.html';
    loadingOverlay.style.display = 'none';

    if (Object.keys(results).length === 0) {
        alert('CharacterSearchTable_en.lss file not found in the uploaded folder.');
    }
}

document.getElementById('folderInput2').addEventListener('change', function(event) {
    readFolder(event.target);
});

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

/*
function nuke() {
    localStorage.removeItem('textIDData');
    parent.location.href = 'index.html';
    //popup();
}
*/

function popup() {
    var popup = document.getElementById('popup');
    popup.classList.add('show');
    
    setTimeout(function() {
        popup.classList.remove('show');
    }, 10000);
}