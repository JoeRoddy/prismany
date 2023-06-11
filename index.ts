console.log('hello world!!!!!');

import express from 'express';
import { PrismaClientDb1 } from './prisma/clients/db1';
import { PrismaClientDb2 } from './prisma/clients/db2';

const app = express();
const port = 3000;

import { execSync } from 'child_process';

// exec('ls -la', (error, stdout, stderr) => {
//   if (error) {
//     console.log(`error: ${error.message}`);
//     return;
//   }
//   if (stderr) {
//     console.log(`stderr: ${stderr}`);
//     return;
//   }
//   console.log(`stdout: ${stdout}`);
// });

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/ls', (req, res) => {
  const path = req.query.path || '.';
  const output = execSync(`ls -F ${path}`);

  res.send(output.toString());
});

app.get('/size', (req, res) => {
  const path = req.query.path || '.';
  const output = execSync(`du -sh ${path}`);

  res.json({ output: output.toString() });
});

app.get('/generate-client', (req, res) => {
  const clientId = req.query.clientId;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  const output = execSync(`yarn prisma generate --schema prisma/clients/schemas/${clientId}.prisma`);

  res.json({ output: output.toString() });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

const client1 = new PrismaClientDb1();
const client2 = new PrismaClientDb2();

async function main() {
  const r1 = await client1.client1.findFirst();
  console.log('c1:', r1);

  const r2 = await client2.client2.findFirst();
  console.log('c2:', r2);
}

main()
  .then(async () => {
    // await client1.$disconnect();
    await client2.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
