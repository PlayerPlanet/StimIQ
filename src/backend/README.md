# StimIQ Backend

FastAPI backend for Deep Brain Stimulation parameter optimization.

## Quick Start

### Local Development

**Install dependencies:**
```bash
uv sync
```

**Configure environment:**
```bash
cp .env.example .env
```

Edit `.env` with your Supabase service role key.

**Run server:**
```bash
uv run python main.py
```

API available at `http://localhost:8000`  
Docs at `http://localhost:8000/docs`

### Docker

**Build and run:**
```bash
docker-compose up --build
```

**Configure environment:**
Create `.env` in the backend directory with:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

API available at `http://localhost:8000`



## Config Management

All configuration is centralized in `backend/config.py`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    supabase_imu_bucket: str = "imu-data"
```

The `get_settings()` function uses `@lru_cache` to ensure a single cached instance:

```python
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
```

### Environment Variables

Configure these in your `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_IMU_BUCKET=imu-data
```

Variable names are case-insensitive and automatically read from `.env`.

### Usage in Code

Import and use settings throughout the application:

```python
from config import get_settings

settings = get_settings()
bucket_name = settings.supabase_imu_bucket
```




**Create `patients` table:**
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Create `imu-data` storage bucket:**
- Supabase Dashboard → Storage → Create public bucket `imu-data`

## API Endpoints

- `POST /api/patients` - Create patient
- `GET /api/patients/{patient_id}` - Get patient
- `POST /api/patients/{patient_id}/imu-upload` - Upload IMU CSV

See interactive docs at `/docs` for full schema details.