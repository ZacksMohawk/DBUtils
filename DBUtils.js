global.appType = "DBUtils";
global.version = "1.1.0";

const cliProgress = require('cli-progress');
const prompt = require('prompt-sync')();
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

let exportFilePath;
let multibar, progressBar1, progressBar2;

let dbMap = {};

if (!fs.existsSync('Maps')){
	fs.mkdirSync('Maps');
}
if (!fs.existsSync('Pages')){
	fs.mkdirSync('Pages');
}

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
	chooseMap();
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
		chooseMap();
		return;
	}
	Logger.log("Invalid choice.");
}

function chooseConnection(inputDbConnectionName){
	let connectionsObject = configObject.dbConnections;
	if (!inputDbConnectionName){
		if (!connectionsObject){
			Logger.log("No connections configured in config file. Aborting");
			process.exit(0);
		}

		let connectionKeys = Object.keys(connectionsObject);

		Logger.log("Please choose a connection\n");
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
	Logger.log('');
	let dbName = prompt("Please enter DB Name: ");
	if (!dbName){
		Logger.log("Aborting");
		process.exit(0);
	}
	let tableName = prompt("Please enter Table Name: ");
	if (!tableName){
		Logger.log("Aborting");
		process.exit(0);
	}
	let fieldName = prompt("Please enter Primary Key Field Name: ");
	if (!fieldName){
		Logger.log("Aborting");
		process.exit(0);
	}
	let value = prompt("Please enter value: ");
	if (!value){
		Logger.log("Aborting");
		process.exit(0);
	}
	let backupQuery = 'USE ' + dbName + '; SELECT * FROM ' + tableName + ' WHERE ' + fieldName + ' = "' + value + '";'
	fs.writeFileSync('query.sql', backupQuery);
	let backupResult = executeQuery().split("\n");


	if (backupResult.length > 3){
		Logger.log("More than 1 result for query: " + backupQuery);
		Logger.log("Cannot handle multi-line backup. Aborting backup");
		process.exit(0);
	}

	if (backupResult.length <= 1){
		Logger.log("No results for query: " + backupQuery);
		Logger.log("Aborting backup");
		process.exit(0);
	}

	let processedResult = {};
	let fieldNames = backupResult[0].split("\t");
	let values = backupResult[1].split("\t");
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

	chooseConnection(restoreEntry.dbConnectionName);

	let entryContent = restoreEntry.result;
	let fieldNames = Object.keys(entryContent);
	let fieldNamesString = '';
	let valuesString = '';
	let limitedValueSetString = '';
	for (let index = 0; index < fieldNames.length; index++){
		let fieldName = fieldNames[index];

		if (!fieldNamesString){
			fieldNamesString += ', ';
		}
		fieldNamesString += fieldName;

		if (valuesString){
			valuesString += ', ';
		}
		valuesString += '"' + entryContent[fieldName] + '"';

		if (fieldName == restoreEntry.key){
			continue;
		}

		if (limitedValueSetString){
			limitedValueSetString += ', ';
		}
		limitedValueSetString += fieldName + ' = "' + entryContent[fieldName] + '"';
	}

	let confirmContinue = prompt('Restoring line(s) will completely replace any current line(s) with matching identifier. Continue? (y/n): ');
	if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
		Logger.log("Aborting");
		process.exit(0);
	}

	let restoreQuery = 'USE ' + restoreEntry.database + '; INSERT INTO ' + restoreEntry.table + ' (' + fieldNames + ') VALUES (' + valuesString + ') ' +
		'ON DUPLICATE KEY UPDATE ' + limitedValueSetString + ";";
	fs.writeFileSync('query.sql', restoreQuery);
	let restoreResult = executeQuery();

	Logger.log("\n🙂👍 '" + chosenBackupFile + "' restored successfully\n");
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
	chooseConnection(restoreDbConnection);

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

function setResultStartIndex(){
	if (dbType == 'MySQL'){
		resultStartIndex = 1;
		return;
	}
	if (dbType == 'CockroachDB'){
		resultStartIndex = 2;
		return;
	}
}

function mapDb(){
	validateDbType();
	setResultStartIndex();
	if (resultStartIndex == -1){
		Logger.log("Invalid resultStartIndex for dbType. Aborting");
		process.exit(0);
	}
	exportFilePath = 'Maps/dbMap_' + dbConnectionName + (ip ? '_' + ip : '') + '.json';
	if (fs.existsSync(exportFilePath)){
		let confirmContinue = prompt('DB Map "' + exportFilePath.replaceAll("Maps/dbMap_", "").replaceAll(".json", "") + '" already exists. Do you wish to re-map/overwrite? (y/n): ');
		if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
			let confirmVisualise = prompt('Open DB visualisation? (y/n): ');
			if (!confirmVisualise || confirmVisualise.toLowerCase() == 'y'){
				visualiseFromFile(exportFilePath);
			}
			process.exit(0);
		}
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

	fs.writeFileSync('query.sql', 'SHOW DATABASES;');
	let databasesResult = executeQuery();
	let splitDatabasesResult = databasesResult.split("\n");

	// process these databases into a map
	for (let index = 1; index < splitDatabasesResult.length; index++){
		let dbName = splitDatabasesResult[index].split("	")[0];
		if (!dbName){
			continue;
		}
		if (progressBar2){
			progressBar2.update(0, {name: ""});
		}
		progressBar1.update(((index - 1) / (splitDatabasesResult.length - 2)) * 100, {name: dbName});
		multibar.update();
		dbMap[dbName] = fetchTables(dbName);
	}

	progressBar1.update(100, {name: ""});
	progressBar2.update(100, {name: ""});
	multibar.stop();

	Logger.log('\nExporting dbMap to: ' + exportFilePath + '\n');
	fs.writeFileSync(exportFilePath, JSON.stringify(dbMap, null, 4));

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

	let fieldsMap = {};

	// process these fields into an array
	for (let index = resultStartIndex; index < splitFieldsResult.length; index++){
		let fieldsArray = splitFieldsResult[index].split("\t");
		let fieldName = fieldsArray[0];
		if (!fieldName){
			continue;
		}
		fieldsMap[fieldName] = {
			"type" : fieldsArray[1],
			"nullable" : fieldsArray[2],
			"default" : fieldsArray[3],
			"generation_expression" : fieldsArray[4],
			"indices" : fieldsArray[5],
			"hidden" : fieldsArray[6]
		};
	}

	return fieldsMap;
}

function visualiseFromFile(dbFilePath){
	let dbMap = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
	visualise(dbFilePath, dbMap);
}

function visualise(dbFilePath, dbMap){
	let dbMapTitle = dbFilePath.replaceAll('Maps/dbMap_', '');
	dbMapTitle = dbMapTitle.substring(0, dbMapTitle.indexOf('_'));
	let pageContent = fs.readFileSync('template.html', 'utf8')
		.replaceAll("<<dbMap>>", JSON.stringify(dbMap))
		.replaceAll("<<title>>", dbMapTitle);

	let htmlPagePath = dbFilePath.replace("json", "html").replaceAll('Maps/', 'Pages/');
	fs.writeFileSync(htmlPagePath, pageContent);
	execSync('open -a "Google Chrome" ' + htmlPagePath);
}

function chooseMap(){
	let mapFiles = fs.readdirSync('Maps');
	if (mapFiles.length == 0){
		Logger.log('No pre-existing map files found. Aborting');	
		process.exit(0);
	}
	Logger.log('Please choose which DB Map to visualise\n');
	for (let index = 0; index < mapFiles.length; index++){
		let mapFile = mapFiles[index].replaceAll('.json', '').replaceAll('dbMap_', '');
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

	visualiseFromFile('Maps/' + mapFiles[dbMapChoice - 1]);
}