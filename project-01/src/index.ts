#!/usr/bin/env node
require("dotenv").config({ override: true });

import chalk from "chalk";
import { exec } from "child_process";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const program = new Command();

const LAAS_PROJECT_ID = "CODE_REVIEW";
const LAAS_PRESET_HASH =
  "bccba97727f96c00088e312955948fbdb81316791e250a478536ad42d425bebb";
const LAAS_API_KEY = process.env["LAAS_API_KEY"];

interface CommandResult {
  stdout: string;
  stderr: string;
}

async function runCommand(command: string): Promise<string> {
  try {
    const { stdout }: CommandResult = await execAsync(command);
    return stdout.trim();
  } catch (error: unknown) {
    throw new Error(
      `Error executing git command: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function getChangedFiles(filter?: (file: string) => boolean): Promise<string[]> {
  const output = await runCommand(
    'git diff --cached --name-only HEAD --diff-filter=ACM'
  );
  const files = output.split("\n").filter(Boolean);

  if (filter && typeof filter === 'function') {
    return files.filter(filter);
  }

  return files;
}

async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error: unknown) {
    throw new Error(
      `Error reading file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const getGitRootPath = (): Promise<string> =>
  runCommand("git rev-parse --show-toplevel");

async function getFileContent(
  gitRootPath: string,
  file: string,
): Promise<{ fullContent: string; changedContent: string }> {
  const fullPath = path.join(gitRootPath, file);
  const [fullContent, changedContent] = await Promise.all([
    readFile(fullPath),
    runCommand(
      `git diff --cached "${fullPath}" | grep '^[+-]' | grep -v '^[-+][-+][-+]' | sed 's/^[+-]//'`,
    ),
  ]);
  return { fullContent, changedContent };
}

async function generateAIReview(
  fullContent: string,
  changedContent: string,
): Promise<string> {
  const body = {
    hash: LAAS_PRESET_HASH,
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
        project: LAAS_PROJECT_ID,
        apiKey: LAAS_API_KEY ?? "",
      } as HeadersInit,
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();
  if ("error" in data) {
    throw new Error(data.message);
  }

  return data.choices[0].message.content;
}

async function codeReview(): Promise<void> {
  try {
    if (!LAAS_API_KEY) {
      console.error(
        chalk.red(
          "Error: LAAS_API_KEY is not set in the environment variables.",
        ),
      );
      return;
    }

    const gitRootPath = await getGitRootPath();
    const changedFiles = await getChangedFiles(file => /\.(ts|tsx)$/.test(file));

    if (changedFiles.length === 0) {
      console.log(chalk.yellow("No changed files in the current commit."));
      return;
    }

    console.log(chalk.blue("Changed files in the current commit:"));
    for (const file of changedFiles) {
      console.log(chalk.yellow(`-> ${file}`));

      try {
        const { fullContent, changedContent } = await getFileContent(gitRootPath, file);
        if (fullContent && changedContent) {
          const review = await generateAIReview(fullContent, changedContent);
          console.log(chalk.green(`AI Code Review for ${file}:`));
          console.log(review);
        }
      } catch (error) {
        console.error(chalk.red(`Error processing file ${file}: ${error instanceof Error ? error.message : String(error)}`));
      }
    }
  } catch (error) {
    console.error(
      chalk.red(
        `Error during code review: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
  }
}

program
  .version("1.0.0")
  .description("AI Code Review CLI tool")
  .action(() => codeReview());

program.parse(process.argv);
