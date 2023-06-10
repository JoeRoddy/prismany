console.log('hello world!!!!!');

import express from 'express';

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
  const output = execSync('ls -la');
  console.log('output:', output);
  const outputString = output.toString();
  console.log('str:', outputString);

  res.json({ output: output.toString() });
  //   res.send(output.toString());
});

app.get('/size', (req, res) => {
  const output = execSync('du -sh ./prisma/generated/client1');

  res.json({ output: output.toString() });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

// const client1 = new PrismaClient1();
// const client2 = new PrismaClient2();

// const prisma = new PrismaClient();

// async function main() {
//   // ... you will write your Prisma Client queries here
//   //   const lol = await prisma.user.create({ data: { email: 'hello@gmail.com' } });
//   const res = await prisma.user.findFirst();
//   console.log(res);

//   const r1 = await client1.client1.findFirst();
//   console.log('c1:', r1);

//   const r2 = await client2.client2.findFirst();
//   console.log('c2:', r2);
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//     await client1.$disconnect();
//     await client2.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
