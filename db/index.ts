import postgres from "postgres";

// One connection per server instance, through Supabase's Session pooler.
// prepare: false because the pooler can't keep named prepared statements.
export const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
