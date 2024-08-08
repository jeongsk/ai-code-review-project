#!/usr/bin/env node
require("dotenv").config({ path: ['.env.local', '.env'], override: true });

// 필요한 모듈들을 임포트합니다.
import chalk from "chalk";
import { exec } from "child_process";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

// exec 함수를 프로미스 기반으로 변환합니다.
const execAsync = promisify(exec);

// Commander를 사용하여 CLI 프로그램을 설정합니다.
const program = new Command();

// 설정 객체: 프로젝트 ID, 프리셋 해시, API 키, 검사할 파일 확장자를 정의합니다.
const config = {
  LAAS_PROJECT_ID: "CODE_REVIEW",
  LAAS_PRESET_HASH:
    "bccba97727f96c00088e312955948fbdb81316791e250a478536ad42d425bebb",
  LAAS_API_KEY: process.env["LAAS_API_KEY"],
  FILE_EXTENSIONS: [".ts", ".tsx"], // 검사할 파일 확장자 목록
};

// 환경 변수 검증: API 키가 설정되어 있지 않으면 에러를 출력하고 프로그램을 종료합니다.
if (!config.LAAS_API_KEY) {
  console.error(
    chalk.red(
      "Error: LAAS_API_KEY is not set in the environment variables.",
    ),
  );
  process.exit(1);
}

// 명령어 실행 결과의 인터페이스를 정의합니다.
interface CommandResult {
  stdout: string;
  stderr: string;
}

// Git 관련 유틸리티 함수들을 객체로 그룹화합니다.
const gitUtils = {
  // Git 명령어를 실행하고 결과를 반환하는 함수
  async runCommand(command: string): Promise<string> {
    try {
      const { stdout }: CommandResult = await execAsync(command);
      return stdout.trim();
    } catch (error: unknown) {
      throw new Error(
        `Error executing git command: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  // 현재 커밋에서 변경된 파일 목록을 가져오는 함수
  async getChangedFiles(): Promise<string[]> {
    const output = await this.runCommand(
      'git diff --cached --name-only HEAD --diff-filter=ACM'
    );
    return output.split("\n").filter(Boolean)
      .filter(file => config.FILE_EXTENSIONS.some(ext => file.endsWith(ext)));
  },

  // Git 저장소의 루트 경로를 가져오는 함수
  getGitRootPath(): Promise<string> {
    return this.runCommand("git rev-parse --show-toplevel");
  },

  // 특정 파일의 전체 내용과 변경된 내용을 가져오는 함수
  async getFileContent(
    gitRootPath: string,
    file: string,
  ): Promise<{ fullContent: string; changedContent: string }> {
    const fullPath = path.join(gitRootPath, file);
    const [fullContent, changedContent] = await Promise.all([
      fs.readFile(fullPath, "utf-8"),
      this.runCommand(
        `git diff --cached "${fullPath}" | grep '^[+-]' | grep -v '^[-+][-+][-+]' | sed 's/^[+-]//'`,
      ),
    ]);
    return { fullContent, changedContent };
  },
};

// LAAS API 관련 함수들을 객체로 그룹화합니다.
const laasApi = {
  // AI 리뷰를 생성하는 함수
  async generateAIReview(
    fullContent: string,
    changedContent: string,
  ): Promise<string> {
    const body = {
      hash: config.LAAS_PRESET_HASH,
      params: {
        full_content: fullContent,
        changed_content: changedContent,
      },
    };
    const response = await fetch(
      "https://api-laas.wanted.co.kr/api/preset/chat/completions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          project: config.LAAS_PROJECT_ID,
          apiKey: config.LAAS_API_KEY ?? "",
        } as HeadersInit,
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if ("error" in data) {
      throw new Error(`API Error: ${data.message}`);
    }

    return data.choices[0].message.content;
  },
};

// 개별 파일을 처리하는 함수
async function processFile(gitRootPath: string, file: string): Promise<void> {
  try {
    console.log(chalk.yellow(`# Processing file: ${file}`));
    const { fullContent, changedContent } = await gitUtils.getFileContent(gitRootPath, file);
    if (fullContent && changedContent) {
      const review = await laasApi.generateAIReview(fullContent, changedContent);
      console.log(chalk.green(`# AI Code Review for ${file}:`));
      console.log(review);
    }
  } catch (error) {
    console.error(chalk.red(`Error processing file ${file}: ${error instanceof Error ? error.message : String(error)}`));
  }
}

// 메인 코드 리뷰 함수
async function codeReview(): Promise<void> {
  try {
    const gitRootPath = await gitUtils.getGitRootPath();
    const changedFiles = await gitUtils.getChangedFiles();

    if (changedFiles.length === 0) {
      console.log(chalk.yellow("No changed files matching the specified extensions in the current commit."));
      return;
    }

    console.log(chalk.blue("Changed files in the current commit:"));
    changedFiles.forEach(file => console.log(chalk.yellow(`- ${file}`)));

    // 파일들을 병렬로 처리합니다.
    await Promise.all(changedFiles.map(file => processFile(gitRootPath, file)));
  } catch (error) {
    console.error(
      chalk.red(
        `Error during code review: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

// CLI 프로그램 설정
program
  .version("1.0.0")
  .description("AI Code Review CLI tool")
  .action(() => codeReview());

// 명령행 인자를 파싱하고 프로그램을 실행합니다.
program.parse(process.argv);
