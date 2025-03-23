import { createConnection } from "mysql2/promise";
import {
  ConfigReaderFactory,
  DDLParser,
  Mysql2RepositoryImpl,
  OnlineDDLChecker,
} from "./lib";

export default async function main() {
  console.log("\n\n\n");

  const configReader = ConfigReaderFactory.create("json");

  const config = await configReader.readConfig();

  const connection = await createConnection({
    ...config,
  });

  const ddlQuery = "ALTER TABLE user ADD COLUMN name VARCHAR(10)";

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
    process.exit();
  }
}

main();
