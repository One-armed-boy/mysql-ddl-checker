import { Connection } from "mysql2/promise";
import { MysqlRepository } from "./mysqlRepository.interface";

export class Mysql2RepositoryImpl implements MysqlRepository {
  constructor(private readonly connection: Connection) {}

  public async getMysqlVersion(): Promise<string> {
    const [versionRows] = await this.connection.execute(`-- sql 
      SELECT VERSION() as version
    `);

    if (
      !Array.isArray(versionRows) ||
      versionRows.length === 0 ||
      !("version" in versionRows[0]) ||
      typeof versionRows[0].version !== "string"
    ) {
      throw new Error("Cannot get MySQL version.");
    }

    return versionRows[0].version;
  }

  public async getTableEngine(tableName: string): Promise<string> {
    const [tableInfo] = await this.connection.execute(
      `SHOW TABLE STATUS LIKE '${tableName}'`
    );
    if (
      !Array.isArray(tableInfo) ||
      tableInfo.length === 0 ||
      !("Engine" in tableInfo[0]) ||
      typeof tableInfo[0].Engine !== "string"
    ) {
      throw new Error(`Table not found. (table: '${tableName}')`);
    }

    return tableInfo[0].Engine;
  }

  public async copyTableTemporary(originTableName: string): Promise<{
    copiedTableName: string;
    copiedFkNameByOriginFkName: Record<string, string>;
  }> {
    const testTableName = `_test_${originTableName}_${Date.now()}`;

    // 외래 키 이름 매핑을 저장할 객체
    const fkNameMapping: Record<string, string> = {};

    // 방법 1: CREATE TABLE LIKE로 기본 구조 복사
    await this.query(`CREATE TABLE ${testTableName} LIKE ${originTableName}`);

    // 방법 2: 원본 테이블의 외래 키 정보 가져오기
    const [fkInfoRows] = await this.connection.execute(
      `
      SELECT
        k.CONSTRAINT_NAME AS constraint_name,
        k.COLUMN_NAME AS column_name,
        k.REFERENCED_TABLE_NAME AS referenced_table_name,
        k.REFERENCED_COLUMN_NAME AS referenced_column_name,
        r.UPDATE_RULE AS update_rule,
        r.DELETE_RULE AS delete_rule
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
      INNER JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
        ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
      WHERE
        k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME = ?
        AND k.REFERENCED_TABLE_NAME IS NOT NULL;
    `,
      [originTableName]
    );

    // 복합 외래 키 처리를 위한 그룹화
    const fkGroups: Record<
      string,
      {
        constraintName: string;
        columns: string[];
        referencedTable: string;
        referencedColumns: string[];
        updateRule: string;
        deleteRule: string;
      }
    > = {};

    for (const fk of fkInfoRows as any[]) {
      if (!fkGroups[fk.constraint_name]) {
        fkGroups[fk.constraint_name] = {
          constraintName: fk.constraint_name,
          columns: [],
          referencedTable: fk.referenced_table_name,
          referencedColumns: [],
          updateRule: fk.update_rule,
          deleteRule: fk.delete_rule,
        };
      }
      fkGroups[fk.constraint_name].columns.push(fk.column_name);
      fkGroups[fk.constraint_name].referencedColumns.push(
        fk.referenced_column_name
      );
    }

    // dev 테이블에 영향도를 줄이기 위해 외래 키 제약 조건 임시 비활성화
    await this.connection.execute(`SET SESSION foreign_key_checks = ?`, [
      false,
    ]);

    // 외래 키가 있다면 테스트 테이블에 추가
    for (const [originalFkName, fkInfo] of Object.entries(fkGroups)) {
      try {
        // 새로운 고유 제약 조건 이름 생성
        const newConstraintName = `${originalFkName}_test_${Date.now()}`;

        // 외래 키 이름 매핑 저장
        fkNameMapping[originalFkName] = newConstraintName;

        // 외래 키 제약 조건 추가
        const alterStatement = `-- sql
        ALTER TABLE ${testTableName}
        ADD CONSTRAINT ${newConstraintName}
        FOREIGN KEY (${fkInfo.columns.join(", ")})
        REFERENCES ${fkInfo.referencedTable}(${fkInfo.referencedColumns.join(
          ", "
        )})
        ON UPDATE ${fkInfo.updateRule}
        ON DELETE ${fkInfo.deleteRule}
      `;

        await this.connection.execute(alterStatement);
        console.log(
          `FK '${newConstraintName}' added (origin: '${originalFkName}')`
        );
      } catch (fkError) {
        throw new Error(
          `Error in adding FK: ${
            fkError instanceof Error ? fkError.message : fkError
          }`
        );
      }
    }

    // 외래 키 제약 조건 재활성화
    await this.connection.execute(`SET SESSION foreign_key_checks = ?`, [true]);

    return {
      copiedTableName: testTableName,
      copiedFkNameByOriginFkName: fkNameMapping,
    };
  }

  public async dropTableIfExist(tableName: string): Promise<void> {
    await this.query(`DROP TABLE IF EXISTS ${tableName}`);
  }

  public async query(query: string): Promise<void> {
    await this.connection.query(query);
  }
}
