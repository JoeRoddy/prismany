// y prisma generate --schema prisma/client1.prisma

// import { execSync } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';

const directoryPath = './prisma/clients/schemas'; // Replace with the actual directory path

try {
  // Read all files in the directory
  const files = fs.readdirSync(directoryPath);
  console.log('files:', files);
  files.forEach((file) => {
    execSync(`yarn prisma generate --schema ${directoryPath}/${file}`);
  });
} catch (err) {
  console.error('Error reading directory:', err);
}
