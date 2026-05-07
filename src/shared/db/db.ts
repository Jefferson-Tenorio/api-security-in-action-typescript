import postgres from 'postgres';
import 'dotenv/config';

const connectionStringAdmin = process.env.DATABASE_URL!
if (!connectionStringAdmin) throw new Error('DATABASE_URL_ADMIN is not set');

const connectionStringUser = process.env.DATABASE_URL!
if (!connectionStringUser) throw new Error('DATABASE_URL_USER is not set');

export const dbUser = postgres(connectionStringUser)
export const dbAdmin = postgres(connectionStringAdmin)

//TODO: Preciso orgnizar a parte de autenticação de rotas. Porém só após os testes.