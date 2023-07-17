#!/usr/bin/env node
import { program } from 'commander';
import generate from './generate';
import push from './push';

program.version('1.0.2');

program
  .command('generate')
  .description('Generates Prisma clients for every schema in the project')
  .action(() => {
    console.log('Generating Prisma clients...');

    generate();
  });

program
  .command('push')
  .description('Pushes changes for every schema in the project')
  .action(() => {
    console.log('Pushing schema changes...');
    push();
  });

program.parse(process.argv);
