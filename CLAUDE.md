# CLAUDE.md

## Project: CM MRP Dashboard

A standalone web app that visualizes output from Century Mold's Excel-based MRP (Material Requirements Planning) tool. The Excel file does all the calculation — BOM explosion, cumulative demand netting, run quantity logic. This app is the viewer and exception management layer.

## Tech Stack
- Next.js 15 (App Router, TypeScript)
- Supabase (Postgres, Auth, Storage)  
- Tailwind CSS + shadcn/ui
- Deployed on Vercel

## Key Architecture Decisions
- **Snapshot-based**: Each CSV upload creates an immutable snapshot. Users can switch between snapshots to compare.
- **Pre-aggregated**: Weekly net positions are computed on upload and stored in `mrp_weekly`. The dashboard reads from this table, not raw detail.
- **Item-level summary**: `mrp_items` is a computed summary table with ABC class, shortage flags, weeks of supply — built on upload from the raw detail data.
- **User overrides persist**: The `item_overrides` table (min stock, SOQ, lead time, notes) is NOT tied to a snapshot. It persists across uploads.

## Data Flow
1. User refreshes Excel MRP file (Power Query pulls from TMM network shares)
2. User exports "Detailed MRP" sheet as CSV
3. User uploads CSV via `/upload` page
4. Server parses CSV → inserts into `mrp_detail` → computes `mrp_items` and `mrp_weekly` → sets snapshot as active
5. Dashboard (`/`) reads from active snapshot's `mrp_items` + `mrp_weekly`

## Design System
- CM Red: #C52026
- Dark Charcoal: #323232  
- Med Gray: #4D4D4D
- Light Gray: #929498 / #E8E8E8
- Numbers use monospace font (DM Mono or similar)
- Dense, data-first layout. Not decorative. Optimized for scanning 200+ items.
- Desktop only — no mobile optimization needed.

## Important Context
- Branch 2 = Rochester (primary), Branch 5 = Shelbyville, Branch 3 = Pulaski
- `Final Sort` column: 1 = Inventory/QOH, 2 = Demand, 4 = Open PO
- `Parent Part` = "_Inventory" for QOH rows, parent item code for demand rows, PO line ref for PO rows
- Demand values are negative (consumption), PO values are positive (incoming supply)
- ABC classification: A = top 80% of 60-day extended cost, B = next 15%, C = bottom 5%

## File Structure
```
/app
  /page.tsx              -- Dashboard (main MRP grid)
  /upload/page.tsx       -- CSV upload + snapshot management
  /item/[component]/     -- Item detail view (stretch goal)
  /api/upload/route.ts   -- CSV parse + Supabase insert
  /api/snapshots/route.ts
/components
  /mrp-grid.tsx          -- Weekly horizontal grid component
  /detail-panel.tsx      -- Expandable item detail (POs, demand sources)
  /spark-bar.tsx         -- Mini trend visualization
  /upload-zone.tsx       -- Drag-drop CSV upload
/lib
  /supabase.ts           -- Client + server Supabase helpers
  /parse-csv.ts          -- CSV parsing + validation
  /compute-summary.ts    -- ABC classification, weekly aggregation, exception flags
/prototype
  /mrp_dashboard.jsx     -- Working prototype with embedded data (reference)
/reference
  /Section1_Rev5_9.m     -- Power Query M code (reference only)
  /PROJECT_BRIEF.md      -- Full project specification
```
