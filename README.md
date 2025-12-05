# Zack's Mohawk Limited
## DBUtils

## Overview

Suite of command line tools for database manipulation

## How To Install

	npm install

## How To Configure

All functionality is defined in the config.json file.

If you are connecting to a remote server via SSH, you must define your SSH username and the target IP address. Leave blank if using localhost

	"username" : "{your SSH username}"
	"ip" : "{target IP address}"

You must define the dbType. Currently, DBMapper only supports MySQL and CockroachDB.

	"dbType" : "{MySQL or CockroachDB}"

You should give the connection a name (either the name of the remote server, or 'localhost' if mapping a local DB)

	"dbConnectionName" : ...

Most importantly, you must define your dbConnectionString. This is what is used to execute the DB queries, in order to elucidate the structure of all associated DBs.

For MySQL, this is suitable:

	"dbConnectString" : "export MYSQL_PWD={your MySQL password}; mysql --user=\"{your MySQL username}\" < query.sql"

And for CockroachDB:

	"dbConnectString" : "sudo cockroach sql --file query.sql --certs-dir=/opt/cockroachdb/secrets"

## How to Setup

To get all the command line aliases setup, please run either:

	./setup_mac.sh

or

	./setup_linux.sh

depending on your OS

## How To Run

To be given a choice of all DBUtils options:

	dbutils

Or, to use any of the functionality directly, you may use various aliases in your terminal

To backup a single entry from a single table:

	dblinebackup

To restore a backed-up single entry:

	dblinerestore

To backup the database in its entirety:

	dbfullbackup

To fully restore a database from a backup:

	dbfullrestore

To restore structure only (empty tables) from a backup:

	dbemptyrestore

To map all databases, tables and fields for a given connection:

	dbmapper

The application will then attempt to connect to the DB and produce a JSON file containing the DB's structural data. You will then be asked if you would like to visualise the results, where selecting 'y' will open up an interactive HTML page allowing you to explore the results

To view any pre-existing maps, having run the relevant setup script, the following command will present you with a list of options:

	dbmaps
