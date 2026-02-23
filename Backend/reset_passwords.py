from passlib.context import CryptContext
import psycopg

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DB_DSN = "host=localhost port=5432 dbname=comandas_db user=comandas_user password=Comandas123!"

def main():
    admin_hash = pwd_context.hash("admin123")
    oper_hash = pwd_context.hash("oper123")

    with psycopg.connect(DB_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE app_users SET password_hash=%s WHERE username='admin';", (admin_hash,))
            cur.execute("UPDATE app_users SET password_hash=%s WHERE username='operario';", (oper_hash,))
        conn.commit()

    print("✅ Passwords reseteadas: admin/admin123 y operario/oper123")

if __name__ == "__main__":
    main()