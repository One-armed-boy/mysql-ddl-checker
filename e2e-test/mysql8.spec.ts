import { MySqlContainer, StartedMySqlContainer } from "@testcontainers/mysql";
import { Connection, createConnection } from "mysql2/promise";
import {
  Mysql2RepositoryImpl,
  MysqlConnectionOption,
  MysqlRepository,
} from "../lib";

describe("Mysql version 8", () => {
  jest.setTimeout(30000);

  let container: StartedMySqlContainer;
  let connection: Connection;

  beforeAll(async () => {
    const dummyConfig: Omit<MysqlConnectionOption, "host" | "port"> = {
      database: "main",
      user: "testuser",
      password: "testpassword",
    };

    container = await new MySqlContainer("mysql:8")
      .withDatabase(dummyConfig.database)
      .withUsername(dummyConfig.user)
      .withUserPassword(dummyConfig.password)
      .start();

    connection = await createConnection({
      host: container.getHost(),
      port: container.getMappedPort(3306),
      user: dummyConfig.user,
      password: dummyConfig.password,
      database: dummyConfig.database,
    });
  });

  afterAll(async () => {
    await connection.end();
    await container.stop();
  });

  test("TestContainer test", async () => {
    const mysqlRepo: MysqlRepository = new Mysql2RepositoryImpl(connection);

    const result = await mysqlRepo.getMysqlVersion();

    console.log(result);
  });
});
