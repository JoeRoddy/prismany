console.log('hello world!!!!!');

import express from 'express';

const app = express();
const port = 3000;

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { PrismaClientDb1, PrismaClientDb2 } from './prisma/clients';

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

app.get('/prisma', async (req, res) => {
  const client1 = new PrismaClientDb1();
  const client2 = new PrismaClientDb2();
  const prisma = new PrismaClient();

  const r1 = await client1.client1.findFirst();
  console.log('c1:', r1);

  const r2 = await client2.client2.findFirst();
  console.log('c2:', r2);

  const pRes = await prisma.user.findMany();
  console.log('prisma:', res);
  res.json({ client1Res: r1, client2Res: r2, prismaRes: pRes });

  client1.$disconnect();
  client2.$disconnect();
  prisma.$disconnect();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// const client1 = new PrismaClientDb1();
// const client2 = new PrismaClientDb2();
// const prisma = new PrismaClient();

// async function main() {
//   const r1 = await client1.client1.findFirst();
//   console.log('c1:', r1);

//   const r2 = await client2.client2.findFirst();
//   console.log('c2:', r2);

//   const res = await prisma.user.findMany();
//   console.log('prisma:', res);
// }

// main()
//   .then(async () => {
//     // await client1.$disconnect();
//     await client2.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     process.exit(1);
//   });
