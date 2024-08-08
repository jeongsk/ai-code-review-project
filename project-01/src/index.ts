#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .version('1.0.0')
  .description('A simple CLI tool')
  .option('-n, --name <name>', 'Name to greet')
  .action((options) => {
    const name = options.name || 'World';
    console.log(chalk.green(`Hello, ${name}!`));
  });

program.parse(process.argv);
