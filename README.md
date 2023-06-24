# Prismany

Query any number of databases with Prisma

![example.png](./example.png)

## Commands

### **Generate**

`npx prismany generate`

- Generates a Prisma client for every schema in your `./prisma` directory

- Clients can be imported via

  ```ts
  import { PrismaClientSchemaName, PrismaClientSchemaName2 } from '@prismany/client';
  ```

  - Eg: `./prisma/myCoolDb.prisma` can be imported from:

  ```ts
  import { PrismaClientMyCoolDb } from '@prismany/client';
  ```

- Note: The `generate` command will add a `"client.output"` path to each of your `.prisma` files

### **Push**

`npx prismany push`

- Runs `prisma db push` against all of your schemas

- If any `push` fails, or requires confirmation, the command will terminate and you'll need to push the individual schema manually: `npx prisma db push --schema=./prisma/myDb.prisma`
