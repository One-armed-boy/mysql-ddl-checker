#!/usr/bin/env node

import { createConnection } from "mysql2/promise";
import {
  ConfigReaderFactory,
  DDLParser,
  Mysql2RepositoryImpl,
  OnlineDDLChecker,
} from "./lib";

async function main() {
  console.log("\n\n\n");

  const ddlQuery = process.argv[2];
  if (!ddlQuery) {
    throw new Error("Input DDL Query Plz");
  }

  const configReader = ConfigReaderFactory.create("json");

  const config = await configReader.readConfig();

  const connection = await createConnection({
    ...config,
  });

  console.log(`Query: ${ddlQuery}`);

  const onlineDDLChecker = new OnlineDDLChecker(
    new Mysql2RepositoryImpl(connection),
    new DDLParser()
  );

  try {
    const { algorithm, lock, message } = await onlineDDLChecker.checkDDL(
      ddlQuery
    );

    console.log(`Result: Success`);
    console.log(`Algorithm: ${algorithm}`);
    console.log(`Lock: ${lock}`);

    if (message !== undefined) {
      console.log(`Reason: ${message}`);
    }
  } catch (err) {
    console.log(`Result: Fail`);

    console.log(`Reason: ${err instanceof Error ? err.message : err}`);
  } finally {
    await connection.end();
  }
}

main().finally(() => process.exit());
