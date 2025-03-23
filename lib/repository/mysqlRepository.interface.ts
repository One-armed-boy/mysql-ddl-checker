export interface MysqlRepository {
  getMysqlVersion(): Promise<string>;

  getTableEngine(tableName: string): Promise<string>;

  copyTableTemporary(originTableName: string): Promise<{
    copiedTableName: string;
    copiedFkNameByOriginFkName: Record<string, string>;
  }>;

  dropTableIfExist(tableName: string): Promise<void>;

  query(query: string): Promise<void>;
}
