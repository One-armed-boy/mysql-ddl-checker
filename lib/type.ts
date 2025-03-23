export type DDLCheckResultType = DDLStrategy & {
  message?: string;
};

export type DDLStrategy = {
  algorithm: DDLAlgorithm;
  lock: DDLLock;
};

export const DDLAlgorithmList = ["INSTANT", "INPLACE", "COPY"] as const;

export type DDLAlgorithm = (typeof DDLAlgorithmList)[number];

export const DDLLockList = ["NONE", "SHARED", "EXCLUSIVE"] as const;

export type DDLLock = (typeof DDLLockList)[number];

export type MysqlConnectionOption = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
};
