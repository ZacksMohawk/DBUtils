global.appType = "DBUtils";
global.version = "1.4.0";

const cliProgress = require('cli-progress');
const prompt = require('prompt-sync')({
	autocomplete: complete()
});
const fs = require('fs');
const { execSync } = require("child_process");
const Logger = require('./includes/Logger');

Logger.log();
Logger.log(fs.readFileSync('AppLogo.txt', 'utf8').replace('[version]', 'DBUtils v' + version));
Logger.log();

let configPath = 'config.json';
if (!fs.existsSync(configPath)){
	Logger.log("No config file found. Aborting");
	process.exit(0);
}
let configObject = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let username, ip, dbType, dbConnectionName, dbUser, dbPassword, dbConnectString;
let validDbTypes = ['MySQL', 'CockroachDB'];
let resultStartIndex = -1;
let lineResultsExpectedLength = -1;

let exportFilePath;
let multibar, progressBar1, progressBar2;

let dbMap = {};

if (!fs.existsSync('Maps')){
	fs.mkdirSync('Maps');
}
if (!fs.existsSync('Pages')){
	fs.mkdirSync('Pages');
}

let autocompleteArray = [];

const utilsMenu = [
	{
		"name" : "Backup Line"
	},
	{
		"name" : "Restore Line"
	},
	{
		"name" : "Full DB Backup"
	},
	{
		"name" : "Full DB Restore"
	},
	{
		"name" : "Empty DB Restore (Structure Only)"
	},
	{
		"name" : "Map DB Structure",
	},
	{
		"name" : "View DB Maps",
	},
	{
		"name" : "Create DB Structure From Map",
	}
];

if (process.argv.indexOf("-dbLineBackup") != -1){
	chooseConnection();
	backupLine();
}
else if (process.argv.indexOf("-dbLineRestore") != -1){
	restoreLine();
}
else if (process.argv.indexOf("-dbFullBackup") != -1){
	chooseConnection();
	backupDb();
}
else if (process.argv.indexOf("-dbFullRestore") != -1){
	restoreDb();
}
else if (process.argv.indexOf("-dbEmptyRestore") != -1){
	restoreDb(true);
}
else if (process.argv.indexOf("-dbMapper") != -1){
	chooseConnection();
	mapDb();
}
else if (process.argv.indexOf("-dbMaps") != -1){
	chooseMapToVisualise();
}
else if (process.argv.indexOf("-dbCreateStructureFromMap") != -1){
	createDbStructureFromMap();
}
else {
	showMenu();
}

function showMenu(){
	Logger.log("Please choose an option\n");
	for (let index = 0; index < utilsMenu.length; index++){
		Logger.log("\t" + (index + 1) + ". " + utilsMenu[index].name);
	}

	Logger.log('');
	let optionChoiceIndex = prompt(utilsMenu.length > 1 ? 'Choose (1-' + utilsMenu.length + '): ' : 'Choose: ');
	if (optionChoiceIndex == null || optionChoiceIndex == ''){
		process.exit(0);
	}
	optionChoiceIndex = parseInt(optionChoiceIndex.trim());
	if (Number.isNaN(optionChoiceIndex) || optionChoiceIndex < 1 || optionChoiceIndex > utilsMenu.length){
		Logger.log("Invalid choice.");
		process.exit(0);
	}
	handleOptionChoice(optionChoiceIndex);
}

function handleOptionChoice(optionChoiceIndex){
	if (optionChoiceIndex == 1){
		Logger.log('');
		chooseConnection();
		backupLine();
		return;
	}
	if (optionChoiceIndex == 2){
		Logger.log('');
		restoreLine();
		return;
	}
	if (optionChoiceIndex == 3){
		Logger.log('');
		chooseConnection();
		backupDb();
		return;
	}
	if (optionChoiceIndex == 4){
		Logger.log('');
		restoreDb();
		return;
	}
	if (optionChoiceIndex == 5){
		Logger.log('');
		restoreDb(true);
		return;
	}
	if (optionChoiceIndex == 6){
		Logger.log('');
		chooseConnection();
		mapDb();
		return;
	}
	if (optionChoiceIndex == 7){
		Logger.log('');
		chooseMapToVisualise();
		return;
	}
	if (optionChoiceIndex == 8){
		Logger.log('');
		createDbStructureFromMap();
		return;
	}
	Logger.log("Invalid choice.");
}

function chooseConnection(connectionMessage, inputDbConnectionName){
	let connectionsObject = configObject.dbConnections;
	if (!inputDbConnectionName){
		if (!connectionsObject){
			Logger.log("No connections configured in config file. Aborting");
			process.exit(0);
		}

		let connectionKeys = Object.keys(connectionsObject);

		Logger.log((connectionMessage ? connectionMessage : "Please choose a connection") + "\n");
		for (let index = 0; index < connectionKeys.length; index++){
			Logger.log("\t" + (index + 1) + ". " + connectionKeys[index]);
		}

		Logger.log('');
		let connectionChoiceIndex = prompt(connectionKeys.length > 1 ? 'Choose (1-' + connectionKeys.length + '): ' : 'Choose: ');
		if (connectionChoiceIndex == null || connectionChoiceIndex == ''){
			process.exit(0);
		}
		connectionChoiceIndex = parseInt(connectionChoiceIndex.trim());
		if (Number.isNaN(connectionChoiceIndex) || connectionChoiceIndex < 1 || connectionChoiceIndex > connectionKeys.length){
			Logger.log("Invalid choice.");
			process.exit(0);
		}
		dbConnectionName = connectionKeys[connectionChoiceIndex - 1];
	}
	else {
		dbConnectionName = inputDbConnectionName;
	}
	let chosenConnection = connectionsObject[dbConnectionName];

	username = chosenConnection.username;
	ip = chosenConnection.ip ? chosenConnection.ip : '';
	dbType = chosenConnection.dbType;
	dbUser = chosenConnection.dbUser;
	dbPassword = chosenConnection.dbPassword;
	dbConnectString = chosenConnection.dbConnectString;
	if (ip){
		dbConnectString = dbConnectString.replace('"<dbUser>"', '\\"<dbUser>\\"');
	}
	dbConnectString = dbConnectString.replaceAll("<dbUser>", dbUser).replaceAll("<dbPassword>", dbPassword);
}

function backupLine(){
	setDbTypeSpecificVariables();

	Logger.log('');

	let expectedMapPath = 'Maps/' + dbConnectionName + (ip ? '_' + ip : '') + '.json';
	let existingMap;
	if (fs.existsSync(expectedMapPath)){
		existingMap = JSON.parse(fs.readFileSync(expectedMapPath, 'utf8'));
		autocompleteArray = Object.keys(existingMap);
		Logger.log('[DB Map exists. Press Tab to autocomplete database names]\n');
	}
	let dbName = prompt("Please enter DB Name: ");
	if (!dbName){
		Logger.log("Aborting");
		process.exit(0);
	}

	if (existingMap && existingMap[dbName]){
		autocompleteArray = Object.keys(existingMap[dbName]);
		Logger.log('\n[Press Tab to autocomplete table names]\n');
	}
	else {
		autocompleteArray = [];
	}
	let tableName = prompt("Please enter Table Name: ");
	if (!tableName){
		Logger.log("Aborting");
		process.exit(0);
	}

	if (existingMap && existingMap[dbName] && existingMap[dbName][tableName]){
		autocompleteArray = Object.keys(existingMap[dbName][tableName]);
		Logger.log('\n[Press Tab to autocomplete field names]\n');
	}
	else {
		autocompleteArray = [];
	}
	let fieldName = prompt("Please enter Primary Key Field Name: ");
	if (!fieldName){
		Logger.log("Aborting");
		process.exit(0);
	}

	autocompleteArray = [];
	if (existingMap){
		Logger.log('');
	}
	let value = prompt("Please enter value: ");
	if (!value){
		Logger.log("Aborting");
		process.exit(0);
	}
	let backupQuery = "USE " + dbName + "; SELECT * FROM " + tableName + " WHERE " + fieldName + " = '" + value + "';";
	fs.writeFileSync('query.sql', backupQuery);
	let backupResult = executeQuery().split("\n");

	if (backupResult.length > lineResultsExpectedLength){
		Logger.log("More than 1 result for query: " + backupQuery);
		Logger.log("Cannot handle multi-line backup. Aborting backup");
		process.exit(0);
	}

	if (backupResult.length < lineResultsExpectedLength){
		Logger.log("No results for query: " + backupQuery);
		Logger.log("Aborting backup");
		process.exit(0);
	}

	let processedResult = {};
	let fieldNames = backupResult[fieldNamesIndex].split("\t");
	let values = backupResult[valuesIndex].split("\t");
	for (let index = 0; index < fieldNames.length; index++){
		processedResult[fieldNames[index]] = values[index];
	}
	let saveEntry = {
		"dbConnectionName" : dbConnectionName,
		"database" : dbName,
		"table" : tableName,
		"key" : fieldName,
		"key_value" : value,
		"result" : processedResult
	};

	let backupFileName = dbConnectionName + "." + dbName + "." + tableName + "." + fieldName + "." + value + ".json";
	if (!fs.existsSync("LineBackups")){
		fs.mkdirSync("LineBackups");
	}
	// TODO Ask user to confirm if overwriting existing file
	fs.writeFileSync("LineBackups/" + backupFileName, JSON.stringify(saveEntry, null, 4));

	Logger.log("\n🙂👍 '" + backupFileName + "' backed up successfully\n");
}

function restoreLine(){
	if (!fs.existsSync("LineBackups")){
		Logger.log("No backup files present. Aborting");
		process.exit(0);
	}
	let backupFilenames = fs.readdirSync("LineBackups");
	if (backupFilenames.length == 0){
		Logger.log("No backup files present. Aborting");
		process.exit(0);
	}

	Logger.log("Please choose a restore file\n");
	for (let index = 0; index < backupFilenames.length; index++){
		Logger.log("\t" + (index + 1) + ". " + backupFilenames[index].replaceAll(".json", ""));
	}

	Logger.log('');
	let backupFileChoiceIndex = prompt(backupFilenames.length > 1 ? 'Choose (1-' + backupFilenames.length + '): ' : 'Choose: ');
	if (backupFileChoiceIndex == null || backupFileChoiceIndex == ''){
		process.exit(0);
	}
	backupFileChoiceIndex = parseInt(backupFileChoiceIndex.trim());
	if (Number.isNaN(backupFileChoiceIndex) || backupFileChoiceIndex < 1 || backupFileChoiceIndex > backupFilenames.length){
		Logger.log("Invalid choice.");
		process.exit(0);
	}
	let chosenBackupFile = backupFilenames[backupFileChoiceIndex - 1];

	let restoreEntry = JSON.parse(fs.readFileSync("LineBackups/" + chosenBackupFile, 'utf8'));

	chooseConnection(null, restoreEntry.dbConnectionName);

	let entryContent = restoreEntry.result;
	let fieldNames = Object.keys(entryContent);
	let fieldNamesString = '';
	let valuesString = '';
	let limitedValueSetString = "";
	for (let index = 0; index < fieldNames.length; index++){
		let fieldName = fieldNames[index];

		if (!fieldNamesString){
			fieldNamesString += ", ";
		}
		fieldNamesString += fieldName;

		if (valuesString){
			valuesString += ", ";
		}
		valuesString += "'" + entryContent[fieldName] + "'";

		if (fieldName == restoreEntry.key){
			continue;
		}

		if (limitedValueSetString){
			limitedValueSetString += ", ";
		}
		limitedValueSetString += fieldName + " = '" + entryContent[fieldName] + "'";
	}

	let confirmContinue = prompt('Restoring line(s) will completely replace any current line(s) with matching identifier. Continue? (y/n): ');
	if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
		Logger.log("Aborting");
		process.exit(0);
	}

	let restoreQuery = generateLineRestoreQuery(restoreEntry, fieldNames, valuesString, limitedValueSetString);
	fs.writeFileSync('query.sql', restoreQuery);
	let restoreResult = executeQuery();

	Logger.log("\n🙂👍 '" + chosenBackupFile + "' restored successfully\n");
}

function generateLineRestoreQuery(restoreEntry, fieldNames, valuesString, limitedValueSetString){
	if (dbType == 'MySQL'){
		return "USE " + restoreEntry.database + "; INSERT INTO " + restoreEntry.table + " (" + fieldNames + ") VALUES (" + valuesString + ") " +
		"ON DUPLICATE KEY UPDATE " + limitedValueSetString + ";";
	}
	else if (dbType == 'CockroachDB'){
		return "USE " + restoreEntry.database + "; INSERT INTO " + restoreEntry.table + " (" + fieldNames + ") VALUES (" + valuesString + ") " +
		"ON CONFLICT (" + restoreEntry.key + ") DO UPDATE SET " + limitedValueSetString + ";";
	}
	else {
		Logger.log("\n☹️👎 Invalid dbType '" + dbType + "'. Must be one of: " + validDbTypes.toString() + "\n");
		process.exit(0);
	}
}

function backupDb(){
	validateDbType();

	fs.writeFileSync('query.sql', 'SHOW DATABASES;');
	let databasesResult = executeQuery();
	let splitDatabasesResult = databasesResult.split("\n");

	Logger.log("\nPlease choose a DB to backup\n");
	let validChoiceCount = 0;
	for (let index = 1; index < splitDatabasesResult.length; index++){
		if (!splitDatabasesResult[index]){
			break;
		}
		validChoiceCount++;
		Logger.log("\t" + index + ". " + splitDatabasesResult[index]);
	}

	Logger.log('');
	let dbChoiceIndex = prompt(validChoiceCount > 1 ? 'Choose (1-' + validChoiceCount + '): ' : 'Choose: ');
	if (dbChoiceIndex == null || dbChoiceIndex == ''){
		process.exit(0);
	}
	dbChoiceIndex = parseInt(dbChoiceIndex.trim());
	if (Number.isNaN(dbChoiceIndex) || dbChoiceIndex < 1 || dbChoiceIndex > validChoiceCount){
		Logger.log("Invalid choice.");
		process.exit(0);
	}
	let backupDbName = splitDatabasesResult[dbChoiceIndex];

	if (!fs.existsSync("FullBackups")){
		fs.mkdirSync("FullBackups");
	}
	let dbBackupFilename = dbConnectionName + "." + backupDbName + ".sql";

	// TODO Ask user to confirm if overwriting existing file
	if (dbType == 'MySQL'){
		let backupCommandString = "export MYSQL_PWD=" + dbPassword + "; mysqldump -u " + dbUser + " " + backupDbName + " > FullBackups/" + dbBackupFilename;

		try {
			if (ip){
				return execSync('ssh -l "' + username + '" "' + ip + '" "' + backupCommandString + '"').toString();
			}
			execSync(backupCommandString).toString();

			// amend backup file to use the selected DB upon restore
			let backupFileContent = fs.readFileSync("FullBackups/" + dbBackupFilename, 'utf8');
			let amendedBackupFileContent = "USE " + backupDbName + ";\n\n" + backupFileContent;
			fs.writeFileSync("FullBackups/" + dbBackupFilename, amendedBackupFileContent);

			Logger.log("\n🙂👍 '" + dbBackupFilename + "' backed up successfully\n");
		}
		catch (error){
			// error will automatically be written to console from the query attempt, no need to readout again here
			process.exit(0);
		}
	}
	else if (dbType == 'CockroachDB'){
		// TODO Implement this for CockroachDB
		Logger.log("Not yet implemented");
	}
}

function restoreDb(emptyDb){
	if (!fs.existsSync("FullBackups")){
		Logger.log("No backup files present. Aborting");
		process.exit(0);
	}
	let backupFilenames = fs.readdirSync("FullBackups");
	if (backupFilenames.length == 0){
		Logger.log("No backup files present. Aborting");
		process.exit(0);
	}

	Logger.log("Please choose a DB restore file\n");
	let validFileNames = [];
	for (let index = 0; index < backupFilenames.length; index++){
		if (!backupFilenames[index].endsWith(".sql")){
			continue;
		}
		let validFileName = backupFilenames[index];
		validFileNames.push(validFileName);
		Logger.log("\t" + (validFileNames.length) + ". " + validFileName.replaceAll(".sql", ""));
	}

	Logger.log('');
	let backupFileChoiceIndex = prompt(validFileNames.length > 1 ? 'Choose (1-' + validFileNames.length + '): ' : 'Choose: ');
	if (backupFileChoiceIndex == null || backupFileChoiceIndex == ''){
		process.exit(0);
	}
	backupFileChoiceIndex = parseInt(backupFileChoiceIndex.trim());
	if (Number.isNaN(backupFileChoiceIndex) || backupFileChoiceIndex < 1 || backupFileChoiceIndex > validFileNames.length){
		Logger.log("Invalid choice.");
		process.exit(0);
	}
	let chosenBackupFile = validFileNames[backupFileChoiceIndex - 1];

	let restoreDbConnection = chosenBackupFile.substring(0, chosenBackupFile.indexOf("."));
	chooseConnection(null, restoreDbConnection);

	validateDbType();

	let confirmContinue = prompt('Restoring will completely replace any current data. Continue? (y/n): ');
	if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
		Logger.log("Aborting");
		process.exit(0);
	}

	if (dbType == 'MySQL'){
		try {
			if (emptyDb){
				let backupFileContent = fs.readFileSync("FullBackups/" + chosenBackupFile, 'utf8');
				let amendedBackupFileContent = backupFileContent.replaceAll ("INSERT INTO", "-- INSERT INTO");
				chosenBackupFile = chosenBackupFile.replace(".sql", "-empty.sql");
				fs.writeFileSync("FullBackups/" + chosenBackupFile, amendedBackupFileContent);
			}
			let restoreCommandString = "export MYSQL_PWD=" + dbPassword + "; mysql -u " + dbUser + " < FullBackups/" + chosenBackupFile;
			if (ip){
				return execSync('ssh -l "' + username + '" "' + ip + '" "' + restoreCommandString + '"').toString();
			}
			execSync(restoreCommandString).toString();
			if (emptyDb){
				fs.unlinkSync("FullBackups/" + chosenBackupFile);
			}
			Logger.log("\n🙂👍 '" + chosenBackupFile + "' restored successfully" + (emptyDb ? " (structure only)" : "") + "\n");
		}
		catch (error){
			// error will automatically be written to console from the query attempt, no need to readout again here
			process.exit(0);
		}
	}
	else if (dbType == 'CockroachDB'){
		// TODO Implement this for CockroachDB
		Logger.log("Not yet implemented");
	}
}

function executeQuery(){
	try {
		if (ip){
			execSync('scp query.sql ' + username + '@' + ip + ':~/; rm query.sql');
			return execSync('ssh -l "' + username + '" "' + ip + '" "' + dbConnectString + '; rm query.sql;"').toString();
		}
		let result = execSync(dbConnectString).toString();
		fs.unlinkSync('query.sql');
		return result;
	}
	catch (error){
		// error will automatically be written to console from the query attempt, no need to readout again here
		process.exit(0);
	}
}

function validateDbType(){
	if (!validDbTypes.includes(dbType)){
		Logger.log("\n☹️👎 Invalid dbType '" + dbType + "'. Must be one of: " + validDbTypes.toString() + "\n");
		process.exit(0);
	}
}

function setDbTypeSpecificVariables(){
	if (dbType == 'MySQL'){
		resultStartIndex = 1;
		lineResultsExpectedLength = 3;
		fieldNamesIndex = 0;
		valuesIndex = 1;
		return;
	}
	if (dbType == 'CockroachDB'){
		resultStartIndex = 2;
		lineResultsExpectedLength = 4;
		fieldNamesIndex = 1;
		valuesIndex = 2;
		return;
	}
}

function mapDb(){
	validateDbType();
	setDbTypeSpecificVariables();
	if (resultStartIndex == -1){
		Logger.log("Invalid resultStartIndex for dbType. Aborting");
		process.exit(0);
	}

	fs.writeFileSync('query.sql', 'SHOW DATABASES;');
	let databasesResult = executeQuery();
	let splitDatabasesResult = databasesResult.split("\n");


	splitDatabasesResult.splice(0,1);
	splitDatabasesResult.splice(splitDatabasesResult.length - 1,1);
	// refine the splitDatabasesResult
	let refinedDbList = [];
	for (let index = 0; index < splitDatabasesResult.length; index++){
		refinedDbList.push(splitDatabasesResult[index].split("	")[0]);
	}
	autocompleteArray = refinedDbList;
	Logger.log('');
	let specificDbName = prompt("Please enter DB Name (tab to cycle through choices, leave blank to map all DBs on the chosen connection): ");
	if (specificDbName){
		refinedDbList = [specificDbName];
	}

	let confirmOverwrite;
	exportFilePath = 'Maps/' + dbConnectionName + (ip ? '_' + ip : '') + '.json';
	if (fs.existsSync(exportFilePath)){
		if (specificDbName){
			Logger.log("NOTE: Selecting 'n', or anything other than 'y', will result in a single DB map for: " + specificDbName);
			confirmOverwrite = prompt('DB Map "' + exportFilePath.replaceAll("Maps/", "").replaceAll(".json", "") + '" already exists. Do you wish to re-map/overwrite the specific section? (y/n): ');
		}
		else {
			confirmOverwrite = prompt('DB Map "' + exportFilePath.replaceAll("Maps/", "").replaceAll(".json", "") + '" already exists. Do you wish to re-map/overwrite? (y/n): ');
			if (!confirmOverwrite || confirmOverwrite.toLowerCase() != 'y'){
				let confirmVisualise = prompt('Open DB visualisation? (y/n): ');
				if (!confirmVisualise || confirmVisualise.toLowerCase() == 'y'){
					visualiseFromFile(exportFilePath);
				}
				process.exit(0);
			}
		}
	}
	else if (specificDbName){
		exportFilePath = exportFilePath.replaceAll(".json", "." + specificDbName + ".json");
	}

	Logger.log("Mapping...");

	multibar = new cliProgress.MultiBar({
	    clearOnComplete: false,
	    hideCursor: true,
	    format: ' {bar} | {name} | {value}/{total}',
	    stopOnComplete: true
	}, cliProgress.Presets.shades_grey);

	progressBar1 = multibar.create(100, 0);
	progressBar1.update(0, {name: ""});
	multibar.update();

	// process these databases into a map
	for (let index = 0; index < refinedDbList.length; index++){
		let dbName = refinedDbList[index];
		if (progressBar2){
			progressBar2.update(0, {name: ""});
		}
		progressBar1.update(((index - 1) / (refinedDbList.length - 2)) * 100, {name: dbName});
		multibar.update();
		dbMap[dbName] = fetchTables(dbName);
	}

	progressBar1.update(100, {name: ""});
	progressBar2.update(100, {name: ""});
	multibar.stop();

	if (specificDbName){
		if (!confirmOverwrite || confirmOverwrite.toLowerCase() != 'y'){
			exportFilePath = exportFilePath.replaceAll(".json", "." + specificDbName + ".json");
		}
		else {
			let loadedDbData = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));
			let loadedDbMap = loadedDbData.databases;
			loadedDbMap[specificDbName] = dbMap[specificDbName];
			dbMap = loadedDbMap;
		}
	}

	let exportedDbData = {
		"metadata" : {
			"dbType" : dbType
		},
		"databases" : dbMap
	};

	Logger.log('\nExporting dbMap to: ' + exportFilePath + '\n');
	fs.writeFileSync(exportFilePath, JSON.stringify(exportedDbData, null, 4));

	let confirmVisualise = prompt('Open DB visualisation? (y/n): ');
	if (!confirmVisualise || confirmVisualise.toLowerCase() == 'y'){
		visualiseFromFile(exportFilePath);
	}
}

function fetchTables(dbName){
	fs.writeFileSync('query.sql', 'USE ' + dbName + '; SHOW TABLES;');
	let tablesResult = executeQuery();
	let splitTablesResult = tablesResult.split("\n");

	let tablesMap = {};

	if (!progressBar2){
		progressBar2 = multibar.create(100, 0);
	}

	// process these tables into a map
	let tableName;
	for (let index = resultStartIndex; index < splitTablesResult.length; index++){
		tableName = extractTableName(splitTablesResult[index]);
		if (!tableName){
			continue;
		}
		progressBar2.update(((index - 2) / (splitTablesResult.length - 3)) * 100, {name: tableName});
		multibar.update();
		tablesMap[tableName] = fetchFields(dbName, tableName);
	}
	progressBar2.update(100, {name: tableName});
	multibar.update();

	return tablesMap;
}

function extractTableName(tableLine){
	if (dbType == "MySQL"){
		return tableLine;	
	}
	if (dbType == "CockroachDB"){
		return tableLine.split("\t")[1];
	}
}

function fetchFields(dbName, tableName){
	fs.writeFileSync('query.sql', 'USE ' + dbName + '; SHOW COLUMNS FROM ' + tableName + ';');
	let fieldsResult = executeQuery();
	let splitFieldsResult = fieldsResult.split("\n");

	let columnKeyObject = {};

	// specific indentification of primary keys in CockroachDB
	if (dbType == 'CockroachDB'){
		fs.writeFileSync('query.sql', 'USE ' + dbName + '; SHOW INDEX FROM ' + tableName + ';');
		let keysResult = executeQuery();
		let splitKeysResult = keysResult.split("\n");
		for (let keyIndex = resultStartIndex; keyIndex < splitKeysResult.length; keyIndex++){
			let keyLine = splitKeysResult[keyIndex];
			let splitKeyLine = keyLine.split("\t");
			let indexedFieldName = splitKeyLine[4];
			if (splitKeyLine[6] == 'f'){
				columnKeyObject[indexedFieldName] = "PRI";
			}
		}
	}

	let fieldsMap = {};
	let fieldNamesSet = false;
	let fieldNamesArray;

	// process these fields into a map
	for (let index = resultStartIndex - 1; index < splitFieldsResult.length; index++){
		if (!fieldNamesSet){
			fieldNamesArray = splitFieldsResult[index].split("\t");
			fieldNamesSet = true;
			continue;
		}
		let fieldsArray = splitFieldsResult[index].split("\t");
		let fieldName = fieldsArray[0];
		if (!fieldName){
			continue;
		}

		fieldsMap[fieldName] = {};
		for (let fieldNameIndex = 1; fieldNameIndex < fieldNamesArray.length; fieldNameIndex++){
			fieldsMap[fieldName][fieldNamesArray[fieldNameIndex]] = fieldsArray[fieldNameIndex];
		}
		if (dbType == 'CockroachDB'){
			if (columnKeyObject[fieldName]){
				fieldsMap[fieldName]['Key'] = columnKeyObject[fieldName];
			}
		}
	}

	return fieldsMap;
}

function visualiseFromFile(dbFilePath){
	let loadedDbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
	visualise(dbFilePath, loadedDbData);
}

function visualise(dbFilePath, dbMap){
	let dbMapTitle = dbFilePath.replaceAll('Maps/', '');
	dbMapTitle = dbMapTitle.substring(0, dbMapTitle.indexOf('_'));
	let pageContent = fs.readFileSync('template.html', 'utf8')
		.replaceAll("<<dbMap>>", JSON.stringify(dbMap))
		.replaceAll("<<title>>", dbMapTitle);

	let htmlPagePath = dbFilePath.replace("json", "html").replaceAll('Maps/', 'Pages/');
	fs.writeFileSync(htmlPagePath, pageContent);
	execSync('open -a "Google Chrome" ' + htmlPagePath);
}

function chooseMapToVisualise(){
	visualiseFromFile(chooseMap('Please choose which DB Map to visualise\n'));
}

function chooseMap(chooseMessage){
	let mapFiles = fs.readdirSync('Maps');
	if (mapFiles.length == 0){
		Logger.log('No pre-existing map files found. Aborting');	
		process.exit(0);
	}
	Logger.log(chooseMessage);
	for (let index = 0; index < mapFiles.length; index++){
		let mapFile = mapFiles[index].replaceAll('.json', '');
		Logger.log('\t' + (index + 1) + '. ' + mapFile);
	}
	Logger.log();
	let dbMapChoice = prompt(mapFiles.length == 1 ? 'Choose: ' : 'Choose (1-' + mapFiles.length + '): ');
	if (!dbMapChoice){
		process.exit(0);
	}
	dbMapChoice = dbMapChoice.trim();
	if (isNaN(dbMapChoice)){
		Logger.log("Not a number. Aborting");
		process.exit(0);
	}
	dbMapChoice = parseInt(dbMapChoice);
	if (dbMapChoice < 1 || dbMapChoice > mapFiles.length){
		Logger.log("Invalid choice. Aborting");
		process.exit(0);
	}
	return 'Maps/' + mapFiles[dbMapChoice - 1];
}

function complete() {
	return function (string) {
		var returnArray = [];
		for (let index = 0; index < autocompleteArray.length; index++) {
			if (autocompleteArray[index].indexOf(string) == 0){
				returnArray.push(autocompleteArray[index]);
			}
		}
		return returnArray;
	};
};

function createDbStructureFromMap(){
	let dbFilePath = chooseMap('Please select DB Map from which to create empty DB structure\n');
	let loadedDbData = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
	let dbMap = loadedDbData.databases;
	let loadedDbMetaData = loadedDbData.metadata;
	if (!loadedDbMetaData){
		Logger.log("Missing metadata, unable to identify dbType. Aborting");
		process.exit(0);
	}
	let loadedDbType = loadedDbMetaData.dbType;

	Logger.log('');
	let dbName;
	autocompleteArray = Object.keys(dbMap);
	if (autocompleteArray.length == 1){
		dbName = autocompleteArray[0];
		Logger.log("Chosen DB: " + dbName);
	}
	else {
		dbName = prompt("Please enter DB Name (tab to cycle through choices): ");
		if (!dbName){
			Logger.log("Aborting");
			process.exit(0);
		}
	}
	let chosenDbStructure = dbMap[dbName];
	if (!chosenDbStructure){
		Logger.log("Database '" + dbName + "' not found. Aborting");
		process.exit(0);
	}

	Logger.log('');
	chooseConnection("Please choose a connection on which to create this empty DB");

	Logger.log('');
	let confirmContinue = prompt('This will write over any existing DB with empty tables. Continue? (y/n): ');
	if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
		Logger.log("Aborting");
		process.exit(0);
	}

	validateDbType();

	let createDbStatement = "CREATE DATABASE IF NOT EXISTS " + dbName + ";\n"
		+ "USE " + dbName + ";";

	let tableNameArray = Object.keys(chosenDbStructure);

	for (let tableIndex = 0; tableIndex < tableNameArray.length; tableIndex++){
		let tableName = tableNameArray[tableIndex];
		let tableStructure = chosenDbStructure[tableName];

		let createTableStatement = "DROP TABLE IF EXISTS " + tableName + ";"
			+ "\nCREATE TABLE " + tableName + " (\n";
		let primaryKeyArray = [];

		let fieldNameArray = Object.keys(tableStructure);
		for (let fieldIndex = 0; fieldIndex < fieldNameArray.length; fieldIndex++){
			let fieldName = fieldNameArray[fieldIndex];
			let fieldStructure = tableStructure[fieldName];

			if (fieldStructure.Key == "PRI"){
				primaryKeyArray.push(fieldName);
			}

			if (fieldIndex > 0){
				createTableStatement += ",\n";
			}

			createTableStatement += generateTableFieldLine(fieldName, fieldStructure, loadedDbType, dbType, primaryKeyArray);
		}
		if (['MySQL'].includes(dbType) && primaryKeyArray.length > 0){
			createTableStatement += ",\nPRIMARY KEY (" + primaryKeyArray.toString() + ")";
		}
		createTableStatement += "\n);";

		createDbStatement += "\n\n" + createTableStatement;
	}

	fs.writeFileSync('query.sql', createDbStatement);
	let restoreResult = executeQuery();

	if (restoreResult){
		Logger.log(restoreResult);
	}
	else {
		Logger.log("\n🙂👍 '" + dbName + "' structure created successfully on " + dbConnectionName + "\n");
	}
}

function generateTableFieldLine(fieldName, fieldStructure, loadedDbType, dbType, primaryKeyArray){
	if (loadedDbType == 'MySQL'){
		if (dbType == 'MySQL'){
			return fieldName + " " + fieldStructure.Type
				+ (fieldStructure.Null && fieldStructure.Null == "NO" ? " NOT NULL" : "")
				+ (fieldStructure.Default && fieldStructure.Default != "NULL" ? " DEFAULT " + fieldStructure.Default : "")
				+ (fieldStructure.Extra && fieldStructure.Extra == "auto_increment" ? " AUTO_INCREMENT" : "");
		}
		if (dbType == 'CockroachDB'){
			if (fieldStructure.Default == 'CURRENT_TIMESTAMP'){
				fieldStructure.Default = 'now()';
			}
			return fieldName + " " + fieldStructure.Type
				+ (primaryKeyArray.includes(fieldName) ? " PRIMARY KEY" : "")
				+ (fieldStructure.Null && fieldStructure.Null == "NO" ? " NOT NULL" : "")
				+ (fieldStructure.Default && fieldStructure.Default != "NULL" ? " DEFAULT " + fieldStructure.Default : "")
				+ (fieldStructure.Extra && fieldStructure.Extra == "auto_increment" ? " DEFAULT unique_rowid()" : "");
		}
	}
	if (loadedDbType == 'CockroachDB'){
		if (dbType == 'MySQL'){
			let defaultSection = '';
			if (!fieldStructure.column_default){
				// do nothing
			}
			else if (fieldStructure.column_default == 'now():::TIMESTAMP'){
				defaultSection = ' DEFAULT CURRENT_TIMESTAMP';
			}
			else if (fieldStructure.column_default == "unique_rowid()"){
				defaultSection = ' AUTO_INCREMENT';
			}
			return fieldName + " " + convertTypeCockroachDbToMySql(fieldStructure.data_type)
				+ (fieldStructure.is_nullable && fieldStructure.is_nullable == "f" ? " NOT NULL" : "")
				+ defaultSection;
		}
		if (dbType == 'CockroachDB'){
			Logger.log("Not yet implemented 'CockroachDB -> CockroachDB' empty DB creation. Aborting");
			process.exit(0);
		}
	}
	Logger.log("Unable to generate table structure data from loadedDbType: " + loadedDbType);
	process.exit(0);
}

function convertTypeCockroachDbToMySql(type){
	if (type.startsWith("INT")){
		let intSize = type.replaceAll("INT", "");
		return "int(" + intSize + ")";
	}
	if (type == "STRING"){
		return "TEXT";
	}
	return type;
}