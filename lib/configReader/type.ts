export type ConfigInputStrategy = "json";

export type PrimitiveType =
  | "string"
  | "number"
  | "boolean"
  | "undefined"
  | "symbol"
  | "bigint";

export type TypeFromString<T extends PrimitiveType> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : T extends "boolean"
  ? boolean
  : T extends "undefined"
  ? undefined
  : T extends "symbol"
  ? symbol
  : T extends "bigint"
  ? bigint
  : never;
