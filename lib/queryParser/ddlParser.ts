export class DDLParser {
  public findTableName(ddlQuery: string): string | null {
    // 패턴 배열을 구조화하여 관리
    const patterns: { regex: RegExp; group: number }[] = [
      {
        // ALTER/CREATE/DROP TABLE
        regex:
          /^(ALTER|CREATE|DROP|RENAME|TRUNCATE)\s+TABLE\s+([`\w]+\.)?([`\w]+)/i,
        group: 3,
      },
      {
        // INDEX
        regex:
          /^(CREATE|DROP)\s+(UNIQUE\s+)?INDEX\s+[^]+\s+ON\s+([`\w]+\.)?([`\w]+)/i,
        group: 4,
      },
      {
        // TEMPORARY TABLE
        regex: /^CREATE\s+TEMPORARY\s+TABLE\s+([`\w]+\.)?([`\w]+)/i,
        group: 2,
      },
      {
        // PARTITION
        regex: /^ALTER\s+TABLE\s+([`\w]+\.)?([`\w]+)\s+(PARTITION|COALESCE)/i,
        group: 2,
      },
    ];

    const normalized = ddlQuery
      .replace(/\/\*.*?\*\//g, "") // 블록 주석 제거
      .replace(/\s+/g, " ") // 다중 공백 단일화
      .replace(/^\s+|\s+$/g, "") // 앞뒤 공백 제거
      .replace(/`/g, ""); // 백틱 제거

    // 패턴 매칭 시도
    for (const { regex, group } of patterns) {
      const match = normalized.match(regex);
      if (match?.[group]) {
        return match[group].split(".").pop()!; // 스키마 이름 제거
      }
    }

    return null;
  }

  public isIndexRelatedDDL(ddlQuery: string): boolean {
    const indexPatterns = [
      /^CREATE\s+(UNIQUE\s+)?INDEX/i,
      /^DROP\s+INDEX/i,
      /^ALTER\s+TABLE\s+.+\s+(ADD|DROP)\s+(INDEX|KEY|PRIMARY\s+KEY|UNIQUE)/i,
      /^CREATE\s+TABLE\s+.+\s+\(.*(INDEX|KEY|PRIMARY\s+KEY|UNIQUE)\s+/i,
    ];

    // DDL이 인덱스 관련 패턴과 일치하는지 확인
    return indexPatterns.some((pattern) => pattern.test(ddlQuery));
  }

  public isFKRelatedDDL(ddlQuery: string): boolean {
    return /FOREIGN\s+KEY|CONSTRAINT|REFERENCES/i.test(ddlQuery);
  }

  public modifyDDLForCopiedTable(
    ddlQuery: string,
    copiedTableName: string,
    copiedFkNameByOriginFkName: Record<string, string>
  ): string {
    const originTableName = this.findTableName(ddlQuery);

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
