#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

const program = new Command();

interface CommandResult {
  stdout: string;
  stderr: string;
}

async function runCommand(command: string): Promise<string> {
  try {
    const { stdout }: CommandResult = await execAsync(command);
    return stdout.trim();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error executing git command: ${errorMessage}`));
    return '';
  }
}

async function getChangedFiles(): Promise<string[]> {
  const output = await runCommand('git diff --cached --name-only HEAD --diff-filter=ACM | grep ".tsx\\?$"');
  return output.split('\n').filter(Boolean);
}

async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Error reading file ${filePath}: ${errorMessage}`));
    return '';
  }
}

const getGitRootPath = (): Promise<string> => runCommand('git rev-parse --show-toplevel');

async function getFileContent(gitRootPath: string, file: string): Promise<{ fullContent: string; changedContent: string }> {
  const fullPath = path.join(gitRootPath, file);
  const [fullContent, changedContent] = await Promise.all([
    readFile(fullPath),
    runCommand(`git diff --cached "${fullPath}" | grep '^[+-]' | grep -v '^[-+][-+][-+]' | sed 's/^[+-]//'`)
  ]);
  return { fullContent, changedContent };
}

async function codeReview(): Promise<void> {
  const gitRootPath = await getGitRootPath();
  const changedFiles = await getChangedFiles();

  if (changedFiles.length === 0) {
    console.log(chalk.yellow('No changed files in the current commit.'));
    return;
  }

  console.log(chalk.blue('Changed files in the current commit:'));
  for (const file of changedFiles) {
    console.log(chalk.yellow(`- ${file}`));

    const { fullContent, changedContent } = await getFileContent(gitRootPath, file);

    if (fullContent && changedContent) {
      const truncatedContent = changedContent.length > 100 ? `${changedContent.slice(0, 100)}...` : changedContent;
      console.log(chalk.yellow(`- ${truncatedContent}`));
      // TODO: LaaS API 호출
    }
  }
}

program
  .version('1.0.0')
  .description('AI Code Review CLI tool')
  .action(() => codeReview());

program.parse(process.argv);
