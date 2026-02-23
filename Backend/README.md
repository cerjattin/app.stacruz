# Backend Auth (FastAPI) - Comandas Zeus

## Estructura
- `POST /auth/login`  -> retorna JWT + user
- `GET  /auth/me`     -> retorna usuario autenticado

## 1) Instalar
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt
```

## 2) Configurar .env
Copia `.env.example` a `.env` y ajusta:
```bash
copy .env.example .env
```

## 3) Ejecutar
```bash
uvicorn app.main:app --reload --port 8000
```

## 4) Probar
```bash
curl -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```
