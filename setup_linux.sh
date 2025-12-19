#!/bin/bash

touch ~/.bashrc

DBUTILSSET=false
DBLINEBACKUPSET=false
DBLINERESTORESET=false
DBFULLBACKUPSET=false
DBFULLRESTORESET=false
DBEMPTYRESTORESET=false
DBMAPPERSET=false
DBMAPSSET=false
DBCREATESTRUCTUREFROMMAPSET=false

while read -r line
do
	if [[ "$line" =~ ^"alias dbutils="* ]]; then
		DBUTILSSET=true
	fi
	if [[ "$line" =~ ^"alias dblinebackup="* ]]; then
		DBLINEBACKUPSET=true
	fi
	if [[ "$line" =~ ^"alias dblinerestore="* ]]; then
		DBLINERESTORESET=true
	fi
	if [[ "$line" =~ ^"alias dbfullbackup="* ]]; then
		DBFULLBACKUPSET=true
	fi
	if [[ "$line" =~ ^"alias dbfullrestore="* ]]; then
		DBFULLRESTORESET=true
	fi
	if [[ "$line" =~ ^"alias dbemptyrestore="* ]]; then
		DBEMPTYRESTORESET=true
	fi
	if [[ "$line" =~ ^"alias dbmapper="* ]]; then
		DBMAPPERSET=true
	fi
	if [[ "$line" =~ ^"alias dbmaps="* ]]; then
		DBMAPSSET=true
	fi
	if [[ "$line" =~ ^"alias dbcreatestructurefrommap="* ]]; then
		DBCREATESTRUCTUREFROMMAPSET=true
	fi
done < ~/.bashrc

NEWLINESET=false

if [[ "$DBUTILSSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbutils' alias";
	echo "alias dbutils='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -folderPath \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBLINEBACKUPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dblinebackup' alias";
	echo "alias dblinebackup='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -dbLineBackup \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBLINEBACKUPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dblinerestore' alias";
	echo "alias dblinerestore='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -dbLineRestore \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBFULLBACKUPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbfullbackup' alias";
	echo "alias dbfullbackup='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -dbFullBackup \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBFULLRESTORESET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbfullrestore' alias";
	echo "alias dbfullrestore='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -dbFullRestore \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBEMPTYRESTORESET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbemptyrestore' alias";
	echo "alias dbemptyrestore='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -dbEmptyRestore \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBMAPPERSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbmapper' alias";
	echo "alias dbmapper='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -folderPath \$dt -dbMapper; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBMAPSSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbmaps' alias";
	echo "alias dbmaps='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -folderPath \$dt -dbMaps; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$DBCREATESTRUCTUREFROMMAPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbcreatestructurefrommap' alias";
	echo "alias dbcreatestructurefrommap='dt=\$(pwd); cd $(pwd); node --no-warnings DBUtils.js -folderPath \$dt -dbCreateStructureFromMap; cd \$dt;'" >> ~/.bashrc
fi

source ~/.bashrc

echo "Setup complete"