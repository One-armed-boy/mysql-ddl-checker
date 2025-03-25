import path from "path";
import { ConfigReader } from "./abstractConfigReader";
import { FileConfigReaderImpl } from "./fileConfigReader";
import { ConfigInputStrategy } from "./type";

export class ConfigReaderFactory {
  public static create(strategy: ConfigInputStrategy): ConfigReader {
    switch (strategy) {
      case "json":
        const configPath = path.join(process.cwd(), "online-ddl-check.json");
        return new FileConfigReaderImpl(configPath);
      default:
        throw new Error("Not implemented config input strategy.");
    }
  }
}
