import { readFile } from "fs/promises";
import { MysqlConnectionOption } from "../type";
import { ConfigReader } from "./abstractConfigReader";

export class ConfigFileReaderImpl extends ConfigReader {
  constructor(private readonly configPath: string) {
    super();
  }

  public async readConfig(): Promise<MysqlConnectionOption> {
    try {
      const configFile = await readFile(this.configPath, "utf8");
      const parsedResult = JSON.parse(configFile);

      this.checkParsedConfig(parsedResult);

      return parsedResult;
    } catch (err) {
      throw new Error(
        `Error in reading config file: ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }
}
