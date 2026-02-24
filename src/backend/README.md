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

## IMU Tracking

### Overview

IMU (Inertial Measurement Unit) tracking captures continuous accelerometer data from patient devices to monitor Parkinson's disease symptoms. The frontend captures motion sensor data and uploads batches to the backend, which stores them in the Supabase `imu_data` table.

### Database Schema

Create the `imu_data` table in Supabase:

```sql
CREATE TABLE imu_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    ax FLOAT8 NOT NULL,
    ay FLOAT8 NOT NULL,
    az FLOAT8 NOT NULL,
    raw_payload JSONB,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_imu_data_patient_session_timestamp 
ON imu_data(patient_id, session_id, timestamp);
```

**Fields:**
- `patient_id` (text): Demo patient identifier (e.g., "imu-demo-user")
- `device_id` (text): Device/browser session identifier
- `session_id` (text): Tracking session identifier (UUID)
- `timestamp` (timestamptz): Measurement time in UTC
- `ax`, `ay`, `az` (float8): Acceleration in m/s² for X, Y, Z axes
- `meta` (jsonb): Optional metadata (user_agent, sampling_hz, etc.)
- `created_at`, `updated_at`: Automatic timestamps

### Data Flow

1. **Frontend** (`/patient/imu-tracking`):
   - Requests motion sensor permission (iOS) or uses automatic permission (Android)
   - Starts tracking: generates session_id, attaches devicemotion listener
   - Buffers samples locally (max 500 or 5s interval)
   - Uploads batches to backend endpoint

2. **Backend** (`POST /api/patient/imu-batch`):
   - Receives batch with patient_id, device_id, session_id, samples array
   - Converts client timestamps (ms) to server UTC datetime
   - Bulk-inserts into `imu_data` table via Supabase
   - Returns inserted count

3. **Supabase**:
   - Stores samples indexed by (patient_id, session_id, timestamp)
   - Enables efficient session queries and replay

### Configuration

IMU table name is configurable via `SUPABASE_IMU_TABLE` env var (default: `imu_data`):

```env
SUPABASE_IMU_TABLE=imu_data
```

### Data Volume & Performance

- **Sampling rate**: ~50 Hz (50 samples/sec per device)
- **Batch size**: 500 samples or 5-second interval
- **Typical session**: 1-2 hours → ~180K–360K samples per session
- **Index**: (patient_id, session_id, timestamp) optimizes session queries

### Browser Limitations

- **Foreground only**: No background tracking when app is closed
- **iOS 13+**: Requires explicit `DeviceMotionEvent.requestPermission()` call from user gesture
- **Android**: Typically auto-permitted via app manifest
- **Accuracy**: Device-dependent; no calibration performed

### API Endpoint

- `POST /api/patient/imu-batch` - Upload accelerometer batch (demo, no auth required)

Request body:
```json
{
  "patient_id": "imu-demo-user",
  "device_id": "device_xxx",
  "session_id": "uuid",
  "samples": [
    { "timestamp": 1739999999123, "ax": 0.01, "ay": -9.8, "az": 0.30 }
  ],
  "meta": { "user_agent": "...", "sampling_hz": 50 }
}
```

Response:
```json
{
  "inserted": 10,
  "session_id": "uuid"
}
```

## API Endpoints

- `POST /api/patients` - Create patient
- `GET /api/patients/{patient_id}` - Get patient
- `POST /api/patients/{patient_id}/imu-upload` - Upload IMU CSV
- `POST /api/patient/imu-batch` - Upload IMU accelerometer batch (demo)

See interactive docs at `/docs` for full schema details.