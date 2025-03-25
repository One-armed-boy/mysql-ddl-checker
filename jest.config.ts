import { Config } from "jest";

export default async (): Promise<Config> => {
  return {
    verbose: true,
    transform: {
      "^.+\\.(t|j)sx?$": "@swc/jest",
    },
  };
};
