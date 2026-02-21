# Healthcare DBS Dashboard - Frontend

React + Vite + Tailwind frontend for Parkinson's DBS management. Deep blue Pfizer-inspired theme with patient and clinician views.

## Quick Start

**Install & Run:**
```bash
npm install
npm run dev
```

**Build:**
```bash
npm run build
```

## Structure

```
src/
├── routes/          # Router + route definitions
├── layouts/         # PatientLayout, ClinicianLayout (with persistent left sidebar)
├── patient/         # Patient pages & components
├── clinician/       # Clinician pages & components
├── components/      # Shared components (Card, Sidebar, StatusBadge, etc.)
└── lib/             # API client + mock data
```

## Routes

- `/patient/*` - Patient view (overview, history, logs)
- `/clinician` - Patient selection list
- `/clinician/patient/:id` - Single patient detail
- `/clinician/parameters/:id` - DBS model parameters

## Notes

- Uses mock data (`lib/mockData.ts`)
- Pfizer-inspired color scheme in `tailwind.config.cjs`
- See `STYLEGUIDE.md` for design patterns
