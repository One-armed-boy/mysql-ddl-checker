# Mysql Online DDL Checker

## 1. Install
`npm i mysql-ddl-checker`

## 2. Config

- Create `online-ddl-check.json` in your project
  ```json
  {
    // Example
    "user": "your_mysql_user",
    "password": "your_mysql_password",
    "host": "your_mysql_host",
    "port": 3306,
    "database": "main"
  }
  ```

## 3. Execute
`npx mysql-ddl-checker "{DDL}"`