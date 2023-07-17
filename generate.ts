import { execSync } from 'child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'fs';

const schemasDirPath = './prisma';
const outputPath = 'node_modules/@prismany/client';

// reusing the same runtime works fine, but it breaks the return type for findMany.
// becomes runtime.Types.Public.PrismaPromise<T> instead of SomeModel[]
// disable for now, but there should be a way to reuse most of this.  Costs about 460kb per client
const USE_SHARED_RUNTIME = false;

const generate = () => {
  deleteDirIfExists(outputPath);

  mkdirSync(`${outputPath}/shared`, { recursive: true });
  const clientIndexPathTs = `${outputPath}/index.ts`;
  const clientIndexPathJs = `${outputPath}/index.js`;
  writeFileSync(clientIndexPathJs, `module.exports = {\n\n}`);
  writeFileSync(clientIndexPathTs, `export {\n\n}`);

  let sharedEngineCreated = false;
  let sharedRuntimeCreated = false;
  let enginePath = '';
  let generateCount = 0;

  try {
    const files = readdirSync(schemasDirPath);
    files
      .filter((f) => f.endsWith('.prisma'))
      .forEach((prismaFile) => {
        // TODO: maybe allow a flag to skip schema.prisma, default to @prisma/client
        // if (prismaFile === 'schema.prisma') {
        //   generateCount++;

        //   return execSync(`npx prisma generate`);
        // }
        let schemaName = prismaFile.split('.')[0];
        schemaName = schemaName === 'schema' ? 'base_schema' : schemaName;

        const schemaContent = readFileSync(`${schemasDirPath}/${prismaFile}`).toString();
        const outputMatch = schemaContent.match(/(?<=output\s+=\s+")(.*)(?=")/);
        if (!outputMatch) {
          if (!/generator client\s?{/g.test(schemaContent)) {
            return console.error(`Invalid schema file ${prismaFile}: missing generator client block`);
          }
          const newSchemaContent = schemaContent.replace(
            /(generator client {)/,
            `$1\n  output = "../${outputPath}/${schemaName}"`,
          );
          writeFileSync(`${schemasDirPath}/${prismaFile}`, newSchemaContent);
          console.log(`Adding output directory to ${prismaFile}`);
        }

        const prismaGenerateOutput = execSync(
          `npx prisma generate --schema ${schemasDirPath}/${prismaFile}`,
        ).toString();
        // console.log(prismaGenerateOutput);

        const clientPath = prismaGenerateOutput.match(/(?<=to\s)(.+?)(?=\sin (.*)ms)/)?.[0];
        if (!clientPath) return console.error(`Error parsing client path from prisma generate output`);

        if (!sharedEngineCreated) {
          const engineFile = readdirSync(clientPath).find((f) => f.startsWith('libquery_engine-'));
          enginePath = `${outputPath}/shared/${engineFile}`;
          renameSync(`${clientPath}/${engineFile}`, enginePath);
          sharedEngineCreated = true;
        } else {
          deleteFileIfExists(`${clientPath}/${enginePath.split('/').pop()}`);
        }

        if (USE_SHARED_RUNTIME && !sharedRuntimeCreated) {
          renameSync(`${clientPath}/runtime`, `${outputPath}/shared/runtime`);
          const runtimeLibContents = readFileSync(`${outputPath}/shared/runtime/library.js`).toString();
          const newRuntimeLibContents = runtimeLibContents.replace(
            /let \w+?={binary:process.env.PRISMA_QUERY_ENGINE_BINARY,library:process.env.PRISMA_QUERY_ENGINE_LIBRARY}\[e\]\?\?t.prismaPath;/,
            `let r='${enginePath}';`,
          );
          writeFileSync(`${outputPath}/shared/runtime/library.js`, newRuntimeLibContents);
          sharedRuntimeCreated = true;
        } else if (USE_SHARED_RUNTIME) {
          deleteDirIfExists(`${clientPath}/runtime`);
        }

        // change client/index.js references to runtime and engine to point to shared
        const customClientName = `PrismaClient${
          schemaName === 'base_schema' ? '' : schemaName.charAt(0).toUpperCase() + schemaName.slice(1)
        }`;
        const indexFilePath = `${clientPath}/index.js`;
        let clientIndexContents = readFileSync(indexFilePath)
          .toString()
          .replaceAll(
            /path\.join\(__dirname, "libquery_engine-.+?\.dylib\.node"\);/g,
            `path.join(__dirname, "../shared/${enginePath.split('/').pop()}");`,
          )
          .replaceAll(
            /path\.join\(process\.cwd\(\), "node_modules\/@prismany\/client\/.+?\/libquery_engine-.+?\.dylib\.node"\)/g,
            `path.join(__dirname, "${enginePath}");`,
          )
          // change client name so they're not all "PrismaClient"
          .replaceAll(/const PrismaClient =/g, `const ${customClientName} =`)
          .replaceAll(/exports\.PrismaClient = PrismaClient/g, `exports.${customClientName} = ${customClientName}`);

        clientIndexContents = USE_SHARED_RUNTIME
          ? clientIndexContents.replaceAll(/\.\/runtime/g, '../shared/runtime')
          : clientIndexContents;

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

        let dbIndexContentsTs = readFileSync(clientIndexPathTs).toString();
        dbIndexContentsTs =
          `import {${customClientName}} from './${schemaName}/index.js';\n${dbIndexContentsTs}`.replace(
            /export {/g,
            `export {\n  ${customClientName},`,
          );
        writeFileSync(clientIndexPathTs, dbIndexContentsTs);

        let dbIndexContentsJs = readFileSync(clientIndexPathJs).toString();
        dbIndexContentsJs =
          `const {${customClientName}} = require('./${schemaName}/index.js');\n${dbIndexContentsJs}`.replace(
            /module.exports\s?=\s?{/g,
            `module.exports = {\n  ${customClientName},`,
          );
        writeFileSync(clientIndexPathJs, dbIndexContentsJs);

        generateCount++;
      });

    console.log(`Successfully generated ${generateCount} clients!`);
  } catch (err) {
    console.error('Error reading directory:', err);
  }
};

export default generate;

const deleteDirIfExists = (path: string) => {
  try {
    rmSync(path, { recursive: true });
  } catch (err) {
    // console.log('err deleting dir', err);
  }
};

const deleteFileIfExists = (path: string) => {
  try {
    unlinkSync(path);
  } catch (err) {
    // console.log('err deleting file', err);
  }
};
