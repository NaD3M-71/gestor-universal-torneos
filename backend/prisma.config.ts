import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';


dotenv.config({ path: '../.env' });

export default defineConfig({
  schema: 'src/infrastructure/database/schema/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});