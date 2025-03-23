import { DDLParser } from "./queryParser";
import { MysqlRepository } from "./repository";
import { DDLCheckResultType, DDLStrategy } from "./type";

export class OnlineDDLChecker {
  private static ONLINE_DDL_STRATEGIES: DDLStrategy[] = [
    { algorithm: "INSTANT", lock: "NONE" },
    { algorithm: "INPLACE", lock: "NONE" },
    { algorithm: "INPLACE", lock: "SHARED" },
    { algorithm: "COPY", lock: "SHARED" },
    { algorithm: "COPY", lock: "EXCLUSIVE" },
  ] as const;

  constructor(
    private readonly mysqlRepo: MysqlRepository,
    private readonly ddlParser: DDLParser
  ) {}

  public async checkDDL(ddlQuery: string): Promise<DDLCheckResultType> {
    const mysqlVersion = await this.mysqlRepo.getMysqlVersion();

    // console.log(`Mysql version: ${mysqlVersion}`);

    const targetTableName = this.ddlParser.findTableName(ddlQuery);

    if (targetTableName === null) {
      throw new Error("Cannot find table name into ddl");
    }

    const targetTableEngine = await this.mysqlRepo.getTableEngine(
      targetTableName
    );

    // console.log(`Table Engine: ${targetTableEngine}`);
    if (targetTableEngine !== "InnoDB") {
      return {
        algorithm: "COPY",
        lock: "EXCLUSIVE",
        message: "Only InnoDB support Online DDL",
      };
    }

    return await this.wrapWithTestTableCtx(
      targetTableName,
      async (copiedTableName, copiedFkNameByOriginFkName) => {
        const modifiedDDL = this.ddlParser.modifyDDLForCopiedTable(
          ddlQuery,
          copiedTableName,
          copiedFkNameByOriginFkName
        );

        for (const strategy of OnlineDDLChecker.ONLINE_DDL_STRATEGIES) {
          const { algorithm, lock } = strategy;

          // MySQL 8.0 미만에서는 INSTANT 알고리즘 건너뛰기
          if (algorithm === "INSTANT" && parseFloat(mysqlVersion) < 8.0) {
            continue;
          }

          const finalDDL = [
            modifiedDDL,
            `ALGORITHM=${algorithm}`,
            `LOCK=${lock};`,
          ].join(this.ddlParser.isIndexRelatedDDL(modifiedDDL) ? " " : ", ");

          try {
            // console.log(`ALGORITHM=${algorithm}, LOCK=${lock} 테스트 중`);
            // console.log(`실행할 DDL: ${finalDDL}`);
            await this.mysqlRepo.query(finalDDL);

            return {
              algorithm,
              lock,
            };
          } catch (error) {
            // console.log(
            //   `ALGORITHM=${algorithm}, LOCK=${lock} 실패: ${
            //     error instanceof Error ? error.message : error
            //   }`
            // );
            // Next Strategies...
          }
        }

        throw new Error(
          "Cannot find Online DDL algorithm, lock for your query"
        );
      }
    );
  }

  private async wrapWithTestTableCtx<T>(
    targetTableName: string,
    callback: (
      copiedTableName: string,
      copiedFkNameByOriginFkName: Record<string, string>
    ) => Promise<T>
  ): Promise<T> {
    let copiedTableName: string | undefined = undefined;
    try {
      const { copiedTableName: _copiedTableName, copiedFkNameByOriginFkName } =
        await this.mysqlRepo.copyTableTemporary(targetTableName);

      copiedTableName = _copiedTableName;

      return await callback(copiedTableName, copiedFkNameByOriginFkName);
    } catch (err) {
      throw err;
    } finally {
      if (copiedTableName !== undefined) {
        await this.mysqlRepo.dropTableIfExist(copiedTableName);
      }
    }
  }
}
