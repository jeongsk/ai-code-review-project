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

// Configuration
const config = {
  LAAS_PROJECT_ID: "CODE_REVIEW",
  LAAS_PRESET_HASH:
    "bccba97727f96c00088e312955948fbdb81316791e250a478536ad42d425bebb",
  LAAS_API_KEY: process.env["LAAS_API_KEY"],
  FILE_EXTENSIONS: [".ts", ".tsx"], // Configurable file extensions
};

// Validate environment variables at startup
if (!config.LAAS_API_KEY) {
  console.error(
    chalk.red(
      "Error: LAAS_API_KEY is not set in the environment variables.",
    ),
  );
  process.exit(1);
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

// Git utilities
const gitUtils = {
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

  async getChangedFiles(): Promise<string[]> {
    const output = await this.runCommand(
      'git diff --cached --name-only HEAD --diff-filter=ACM'
    );
    return output.split("\n").filter(Boolean)
      .filter(file => config.FILE_EXTENSIONS.some(ext => file.endsWith(ext)));
  },

  getGitRootPath(): Promise<string> {
    return this.runCommand("git rev-parse --show-toplevel");
  },

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

// LAAS API module
const laasApi = {
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

async function codeReview(): Promise<void> {
  try {
    const gitRootPath = await gitUtils.getGitRootPath();
    const changedFiles = await gitUtils.getChangedFiles();

    if (changedFiles.length === 0) {
      console.log(chalk.yellow("No changed files matching the specified extensions in the current commit."));
      return;
    }

    console.log(chalk.blue("Changed files in the current commit:"));
    changedFiles.forEach(file => console.log(chalk.yellow(`# Review file: ${file}`)));

    // Process files in parallel
    await Promise.all(changedFiles.map(file => processFile(gitRootPath, file)));
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
