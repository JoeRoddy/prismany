import { execSync } from 'child_process';
import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'fs';

const directoryPath = './prisma';
execSync(`rm -rf ./prisma/clients/`);
mkdirSync(`${directoryPath}/clients/shared`, { recursive: true });

let sharedEngineCreated = false;
let sharedRuntimeCreated = false;
let enginePath = '';

try {
  // Read all files in the directory
  const files = readdirSync(directoryPath);
  console.log('files:', files);
  files
    .filter((f) => f.endsWith('.prisma'))
    .forEach((file) => {
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
      const clientIndexContents = readFileSync(`${clientPath}/index.js`)
        .toString()
        .replaceAll(/\.\/runtime/g, '../shared/runtime')
        .replaceAll(
          /path\.join\(__dirname, "libquery_engine-.+?\.dylib\.node"\);/g,
          `path.join(__dirname, "../shared/${enginePath.split('/').pop()}");`,
        )
        .replaceAll(
          /path\.join\(process\.cwd\(\), "prisma\/clients\/.+?\/libquery_engine-.+?\.dylib\.node"\)/g,
          `path.join(__dirname, "${enginePath}");`,
        );
      writeFileSync(`${clientPath}/index.js`, clientIndexContents);
    });
  console.log('done');
} catch (err) {
  console.error('Error reading directory:', err);
}
