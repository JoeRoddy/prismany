import { execSync } from 'child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'fs';

const directoryPath = './prisma';
execSync(`rm -rf ./prisma/clients/`);
mkdirSync(`${directoryPath}/clients/shared`, { recursive: true });
const clientIndexPath = `${directoryPath}/clients/index.ts`;
writeFileSync(clientIndexPath, `export {\n\n}`);

let sharedEngineCreated = false;
let sharedRuntimeCreated = false;
let enginePath = '';
let generateCount = 0;

try {
  // Read all files in the directory
  const files = readdirSync(directoryPath);
  files
    .filter((f) => f.endsWith('.prisma'))
    .forEach((file) => {
      generateCount++;
      if (file === 'schema.prisma') return execSync(`npx prisma generate`);
      const prismaGenerateOutput = execSync(`npx prisma generate --schema ${directoryPath}/${file}`);
      const clientPath = prismaGenerateOutput
        .toString()
        .match(/(?<=to\s)(.+?)(?=\sin (.*)ms)/)
        ?.at(0);
      if (!clientPath) return;

      if (!sharedEngineCreated) {
        const engineFile = readdirSync(clientPath).find((f) => f.startsWith('libquery_engine-'));
        enginePath = `${directoryPath}/clients/shared/${engineFile}`;
        renameSync(`${clientPath}/${engineFile}`, enginePath);
        sharedEngineCreated = true;
      } else {
        unlinkSync(`${clientPath}/${enginePath.split('/').pop()}`);
      }

      if (!sharedRuntimeCreated) {
        renameSync(`${clientPath}/runtime`, `${directoryPath}/clients/shared/runtime`);
        const runtimeLibContents = readFileSync(`${directoryPath}/clients/shared/runtime/library.js`).toString();
        const newRuntimeLibContents = runtimeLibContents.replace(
          /let \w+?={binary:process.env.PRISMA_QUERY_ENGINE_BINARY,library:process.env.PRISMA_QUERY_ENGINE_LIBRARY}\[e\]\?\?t.prismaPath;/,
          `let r='${enginePath}';`,
        );
        writeFileSync(`${directoryPath}/clients/shared/runtime/library.js`, newRuntimeLibContents);
        sharedRuntimeCreated = true;
      } else {
        rmSync(`${clientPath}/runtime`, { recursive: true });
      }

      // change client/index.js references to runtime and engine to point to shared
      const schemaName = file.split('.')[0];
      const customClientName = `PrismaClient${schemaName.charAt(0).toUpperCase() + schemaName.slice(1)}`;
      const indexFilePath = `${clientPath}/index.js`;
      const clientIndexContents = readFileSync(indexFilePath)
        .toString()
        .replaceAll(/\.\/runtime/g, '../shared/runtime')
        .replaceAll(
          /path\.join\(__dirname, "libquery_engine-.+?\.dylib\.node"\);/g,
          `path.join(__dirname, "../shared/${enginePath.split('/').pop()}");`,
        )
        .replaceAll(
          /path\.join\(process\.cwd\(\), "prisma\/clients\/.+?\/libquery_engine-.+?\.dylib\.node"\)/g,
          `path.join(__dirname, "${enginePath}");`,
        )
        // change client name so they're not all "PrismaClient"
        .replaceAll(/const PrismaClient =/g, `const ${customClientName} =`)
        .replaceAll(/exports\.PrismaClient = PrismaClient/g, `exports.${customClientName} = ${customClientName}`);
      writeFileSync(indexFilePath, clientIndexContents);

      // mirror custom client name from index.js to index.d.ts
      const typesFilePath = `${clientPath}/index.d.ts`;
      const clientTypesContent = readFileSync(typesFilePath)
        .toString()
        .replace(/export class PrismaClient</g, `export class ${customClientName}<`)
        .replace(
          /export type DefaultPrismaClient = PrismaClient/g,
          `export type DefaultPrismaClient = ${customClientName}`,
        );
      writeFileSync(typesFilePath, clientTypesContent);

      let dbIndexContents = readFileSync(clientIndexPath).toString();
      dbIndexContents = `import {${customClientName}} from './${schemaName}/index.js';\n${dbIndexContents}`.replace(
        /export {/g,
        `export {\n  ${customClientName},`,
      );
      writeFileSync(clientIndexPath, dbIndexContents);
    });

  console.log(`Successfully generated ${generateCount} clients!`);
} catch (err) {
  console.error('Error reading directory:', err);
}
