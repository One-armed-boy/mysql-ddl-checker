import { MysqlConnectionOption } from "../type";
import { PrimitiveType, TypeFromString } from "./type";

export abstract class ConfigReader {
  public abstract readConfig(): Promise<MysqlConnectionOption>;

  protected checkParsedConfig(
    config: unknown
  ): asserts config is MysqlConnectionOption {
    if (!this.isConfigRecord(config)) {
      throw new Error(`Config is not Record (config: ${config})`);
    }

    this.checkConfigElement(config, "user", "string");
    this.checkConfigElement(config, "password", "string");
    this.checkConfigElement(config, "host", "string");
    this.checkConfigElement(config, "port", "number");
    this.checkConfigElement(config, "database", "string");
  }

  private isConfigRecord(config: unknown): config is Record<string, unknown> {
    return (
      typeof config === "object" && config !== null && !Array.isArray(config)
    );
  }

  private checkConfigElement<
    T extends Record<string, unknown>,
    K extends keyof T
  >(
    config: T,
    key: K,
    type: PrimitiveType
  ): asserts config is T & { [P in K]: TypeFromString<typeof type> } {
    if (!(key in config)) {
      throw new Error(`Key "${String(key)}" is missing in your config file`);
    }

    const value = config[key];

    if (typeof value !== type) {
      throw new Error(
        `"${String(key)}" in your config file should be of type ${type}`
      );
    }

    if (type === "string" && (value as string).length === 0) {
      throw new Error(
        `"${String(key)}" in your config file cannot be an empty string`
      );
    }

    if (type === "number" && !Number.isFinite(value)) {
      throw new Error(
        `"${String(key)}" in your config file should be a finite number`
      );
    }
  }
}
