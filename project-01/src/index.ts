#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const program = new Command();

async function runGitCommand(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command);
    return stdout.trim();
  } catch (error) {
    console.error(chalk.red(`Error executing git command: ${error}`));
    return '';
  }
}

async function getChangedFiles(): Promise<string[]> {
  const output = await runGitCommand('git diff --name-only HEAD');
  return output.split('\n').filter(file => file.length > 0);
}

program
  .version('1.0.0')
  .description('AI Code Review CLI tool')
  .action(async () => {
    const changedFiles = await getChangedFiles();
    if (changedFiles.length > 0) {
      console.log(chalk.blue('Changed files in the current commit:'));
      changedFiles.forEach(file => console.log(chalk.yellow(`- ${file}`)));
    } else {
      console.log(chalk.yellow('No changed files in the current commit.'));
    }
  });

program.parse(process.argv);
