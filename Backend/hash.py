from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

new_password = "$Adm1n26%"
hashed = pwd_context.hash(new_password)

print(hashed)