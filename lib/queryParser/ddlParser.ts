export class DDLParser {
  public getTableName(ddlQuery: string): string {
    const tableNameMatch = /ALTER\s+TABLE\s+`?(\w+)`?/i.exec(ddlQuery);
    if (!tableNameMatch) {
      throw new Error("DDL 문에서 테이블 이름을 추출할 수 없습니다");
    }
    return tableNameMatch[1];
  }

  public isFKRelatedDDL(ddlQuery: string): boolean {
    return /FOREIGN\s+KEY|CONSTRAINT|REFERENCES/i.test(ddlQuery);
  }

  public modifyDDLForCopiedTable(
    ddlQuery: string,
    copiedTableName: string,
    copiedFkNameByOriginFkName: Record<string, string>
  ): string {
    const originTableName = this.getTableName(ddlQuery);

    let result = ddlQuery
      .replace(new RegExp(`\\b${originTableName}\\b`, "i"), copiedTableName)
      .replace(/,\s*ALGORITHM\s*=\s*[A-Z]+/i, "")
      .replace(/,\s*LOCK\s*=\s*[A-Z]+/i, "")
      .replace(/;$/, "");

    if (
      !this.isFKRelatedDDL(result) ||
      Object.keys(copiedFkNameByOriginFkName).length === 0
    ) {
      return result;
    }

    for (const [originalFkName, newFkName] of Object.entries(
      copiedFkNameByOriginFkName
    )) {
      // 일반 텍스트, 백틱으로 감싸진 이름, 큰따옴표로 감싸진 이름 등 모든 형태 처리
      const fkPatterns = [
        new RegExp(`FOREIGN\\s+KEY\\s+${originalFkName}\\b`, "i"),
        new RegExp(`FOREIGN\\s+KEY\\s+\`${originalFkName}\``, "i"),
        new RegExp(`FOREIGN\\s+KEY\\s+"${originalFkName}"`, "i"),
        new RegExp(`CONSTRAINT\\s+${originalFkName}\\b`, "i"),
        new RegExp(`CONSTRAINT\\s+\`${originalFkName}\``, "i"),
        new RegExp(`CONSTRAINT\\s+"${originalFkName}"`, "i"),
        new RegExp(`DROP\\s+FOREIGN\\s+KEY\\s+${originalFkName}\\b`, "i"),
        new RegExp(`DROP\\s+FOREIGN\\s+KEY\\s+\`${originalFkName}\``, "i"),
        new RegExp(`DROP\\s+FOREIGN\\s+KEY\\s+"${originalFkName}"`, "i"),
      ];

      for (const pattern of fkPatterns) {
        if (pattern.test(result)) {
          const replacement = pattern.toString().includes("CONSTRAINT")
            ? `CONSTRAINT \`${newFkName}\``
            : pattern.toString().includes("DROP")
            ? `DROP FOREIGN KEY \`${newFkName}\``
            : `FOREIGN KEY \`${newFkName}\``;

          result = result.replace(pattern, replacement);
          // console.log(
          //   `외래 키 이름 변경: '${originalFkName}' -> '${newFkName}'`
          // );
        }
      }
    }

    return result;
  }
}
