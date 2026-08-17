import postgres from 'postgres';

import { env } from '../../config/env.js';

export const dbUser = postgres(env.databaseUrl);
export const dbAdmin = postgres(env.databaseUrlAdmin);

// TODO: Preciso orgnizar a parte de autenticação de rotas. Porém só após os testes.
