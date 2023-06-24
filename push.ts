import { execSync } from 'child_process';
import { readdirSync } from 'fs';

const schemasDirPath = './prisma';
const errored: string[] = [];

const push = () => {
  try {
    readdirSync(schemasDirPath)
      .filter((f) => f.endsWith('.prisma'))
      .forEach((prismaFile) => {
        try {
          const ppushOutput = execSync(`npx prisma db push --schema ${schemasDirPath}/${prismaFile}`).toString();
          console.log('ppushOutput', ppushOutput);
        } catch (err) {
          errored.push(prismaFile);
        }
      });
  } catch (err) {
    console.error('Error reading directory:', err);
  }
  errored.forEach((err) => console.log(`Error pushing schema changes for ${err}`));
};

export default push;
