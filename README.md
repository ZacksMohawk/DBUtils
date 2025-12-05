# Zack's Mohawk Limited
## DBUtils

## Overview

Suite of command line tools for database manipulation

## How To Install

	npm install

## How To Configure

You must define your database connections in 'config.json'. The example(s) provided should help you in setting up with your own credentials. NOTE: Only MySQL and CockroachDB are supported in this initial version

## How to Setup

To get all the command line aliases setup, please run either:

	./setup_mac.sh

or

	./setup_linux.sh

depending on your OS

## How To Run

To be given a choice of all DBUtils options:

	dbutils

Or, to use any of the functionality directly, enter any of the following commands:

	dblinebackup
	dblinerestore
	dbfullbackup
	dbfullrestore
	dbemptyrestore
