import bcrypt
import psycopg

DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "comandas_db"
DB_USER = "comandas_user"
DB_PASS = "Comandas123!"

USERS = [
    {"username": "admin", "full_name": "Administrador", "role": "ADMIN", "password": "admin123"},
    {"username": "operario", "full_name": "Operario", "role": "OPERARIO", "password": "oper123"},
]

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()

dsn = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASS}"

with psycopg.connect(dsn) as conn:
    with conn.cursor() as cur:
        for u in USERS:
            cur.execute(
                """
                INSERT INTO app_users (username, full_name, role, password_hash, is_active)
                VALUES (%s, %s, %s, %s, true)
                ON CONFLICT (username) DO UPDATE SET
                  full_name = EXCLUDED.full_name,
                  role = EXCLUDED.role,
                  password_hash = EXCLUDED.password_hash,
                  is_active = true
                """,
                (u["username"], u["full_name"], u["role"], hash_password(u["password"]))
            )
    conn.commit()

print("✅ Seed listo: admin/admin123 y operario/oper123")