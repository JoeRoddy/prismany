#!/usr/bin/env node
import { program } from 'commander';
import generate from './generate';

program.version('1.0.0');

program
  .command('generate')
  .description('Generates Prisma clients for every schema in the project')
  .action(() => {
    console.log('Generating Prisma clients...');

    generate();
  });

program.parse(process.argv);
