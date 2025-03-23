# MySQL Online DDL Checker

## Overview

This tool analyzes MySQL DDL (Data Definition Language) queries to determine the algorithm and lock types used during online schema changes. It provides insights into how your DDL operations might impact database performance and availability.

## Important Note

⚠️ **Caution**: This checker creates temporary table copies to simulate DDL operations. While it's designed to be non-intrusive, we strongly recommend using it in a test environment rather than on live production databases to avoid any potential risks.

## Installation

Install the package using npm:

```
npm install mysql-ddl-checker
```

## Configuration

1. Create a file named `online-ddl-check.json` in your project root.
2. Add your MySQL connection details to this file:

```json
{
  "user": "your_mysql_user",
  "password": "your_mysql_password",
  "host": "your_mysql_host",
  "port": 3306,
  "database": "your_database_name"
}
```

## Usage

Execute the checker by running:

```
npx mysql-ddl-checker "YOUR_DDL_QUERY_HERE"
```

Replace `YOUR_DDL_QUERY_HERE` with the actual DDL statement you want to analyze.

## Example

```
npx mysql-ddl-checker "ALTER TABLE users ADD COLUMN email VARCHAR(255)"
```

This command will analyze the given ALTER TABLE statement and provide information about the algorithm and lock types that would be used in an actual online schema change.

Remember to always test in a safe environment before applying changes to your production database.
