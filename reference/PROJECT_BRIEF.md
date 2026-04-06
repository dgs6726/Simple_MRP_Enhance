# MRP Dashboard — Project Brief

## What This Is
A standalone web app that reads the output from Century Mold's Excel-based MRP tool and presents it in a clean, actionable UI for the purchasing/planning team. The Excel file does the calculation (BOM explosion, cumulative netting, run qty logic via Power Query). This app is the viewer.

## Tech Stack
- **Next.js 15** (App Router)
- **Supabase** (Postgres + Auth + Storage)
- **Vercel** (hosting)
- **Tailwind CSS** + shadcn/ui for components

## Core User Flow
1. User refreshes the Excel MRP file (Power Query refresh against TMM network data)
2. User exports the `Detailed MRP` sheet as CSV
3. User uploads CSV to the web app via a simple upload page
4. Web app parses, stores in Supabase, and renders the MRP dashboard
5. Previous uploads are retained as snapshots (date-stamped)

## Data Schema

### Source: Excel "Detailed MRP" table (`Final_Data`)
The CSV will have these columns:

| Column | Type | Description |
|--------|------|-------------|
| Vendor | text | Supplier code (null for demand/inventory rows) |
| Component | text | Item code (the material being planned) |
| Description | text | Item description |
| Parent Part | text | Demand source or "_Inventory" or PO line ref |
| Date | date | Transaction date |
| QOH | integer | Quantity on hand (same for all rows of an item) |
| Demand | integer | Demand quantity (negative = consumption) |
| Open Orders | integer | Open PO quantity (positive = incoming) |
| Net | integer | Net position after this transaction |
| RunTotal | integer | Running total / cumulative net |
| Final Sort | integer | Row type: 1=Inventory, 2=Demand, 4=Open PO |
| Index | integer | Row sequence number |
| Inventory.Std Cost | decimal | Standard cost per unit |
| Extended Cost | decimal | RunTotal × Std Cost |
| Date (Year) | text | Year |
| Date (Quarter) | text | Quarter |
| Date (Month Index) | integer | Month number |
| Date (Month) | text | Month name |

### Source: Excel "ABC Summary" table
Supplementary upload (or derived from the detail data):

| Column | Type | Description |
|--------|------|-------------|
| Item Code | text | Material code |
| 60 Day Requirements | decimal | Total demand next 60 days |
| Inventory.Std Cost | decimal | Standard cost |
| Ext Cost | decimal | Requirements × cost (for ABC ranking) |
| Index | integer | Rank by ext cost descending |

### Source: Excel "User Definitions" table
Override parameters per item:

| Column | Type | Description |
|--------|------|-------------|
| Branch | integer | Branch code |
| Item Code | text | Material code |
| Omit | text | "Y" to exclude from MRP |
| SOQ | number | Standard order quantity override |
| Lead Time (days) | number | Lead time override |
| Minimum Override | number | Min stock level override |
| Standard Pack | number | Pack quantity |
| Note | text | Planner notes |

## Supabase Tables

### `mrp_snapshots`
```sql
id uuid PK default gen_random_uuid()
branch integer not null
snapshot_date date not null
uploaded_at timestamptz default now()
uploaded_by text
row_count integer
status text default 'active'
```

### `mrp_detail`
```sql
id bigserial PK
snapshot_id uuid FK -> mrp_snapshots.id ON DELETE CASCADE
vendor text
component text not null
description text
parent_part text
date date
qoh integer
demand integer
open_orders integer
net integer
run_total integer
final_sort integer
std_cost decimal(12,4)
extended_cost decimal(14,2)
```

### `mrp_items` (materialized/computed from mrp_detail on upload)
```sql
id bigserial PK
snapshot_id uuid FK -> mrp_snapshots.id ON DELETE CASCADE
component text not null
description text
abc_class char(1)
std_cost decimal(12,4)
qoh integer
weekly_req decimal(12,2)
min_stock decimal(12,2)
std_ord_qty decimal(12,2)
max_stock decimal(12,2)
weeks_of_supply decimal(6,1)
first_shortage_date date
shortage_qty integer
has_open_po boolean
```

### `mrp_weekly` (pre-aggregated weekly buckets)
```sql
id bigserial PK
snapshot_id uuid FK -> mrp_snapshots.id ON DELETE CASCADE
component text not null
week_start date not null
net_position integer
total_demand integer
total_supply integer
```

### `item_overrides` (persisted user settings, not snapshot-dependent)
```sql
id bigserial PK
branch integer not null
component text not null
omit boolean default false
soq decimal(12,2)
lead_time_days integer
min_override decimal(12,2)
standard_pack decimal(12,2)
note text
updated_at timestamptz default now()
UNIQUE(branch, component)
```

## Pages

### `/` — Dashboard (main view)
- Header with snapshot date, branch, summary stats (shortage count, $ exposure, item count)
- Filter bar: ABC pills, shortage toggle, search, snapshot selector
- Horizontal weekly grid: items as rows, weeks as columns, cells = net position
- Color coding: red (shortage), amber (below min), green (adequate)
- Auto-sorted: worst net position first
- Click row to expand → detail panel showing:
  - QOH, weekly req, weeks of supply cards
  - Open POs table (date, PO line, qty, vendor)
  - Demand sources table (date, parent part, qty)
  - Mini line chart of net position over time

### `/upload` — Data Upload
- Drag-and-drop CSV upload zone
- Branch selector (default: 2 = Rochester)
- Preview of parsed data before committing
- Upload history table showing past snapshots
- Ability to set a snapshot as "active" or delete old ones

### `/item/[component]` — Item Detail (stretch)
- Full transaction history for one item
- Chart: net position over time with PO arrivals and demand events annotated
- Demand source breakdown (which parent parts consume this material)
- Suggested actions based on position vs. min/max

## UI Design
- **Colors**: CM Red #C52026, Dark Charcoal #323232, Med Gray #4D4D4D, Light Gray #929498/#E8E8E8
- **Font**: Use system font stack or DM Sans for body, DM Mono for numbers
- **Style**: Dense, data-first, industrial. Not pretty for pretty's sake — optimized for scanning 200+ items quickly
- **Mobile**: Not required. This is a desktop planning tool.

## ABC Classification Logic (computed on upload)
1. For each item, sum absolute demand over next 60 days from snapshot date
2. Multiply by std cost → extended cost
3. Rank by extended cost descending
4. A = top 80% of cumulative cost, B = next 15%, C = remaining 5%
5. Store on `mrp_items`

## Weekly Aggregation Logic (computed on upload)
1. For each item, bucket all transactions into ISO weeks (Monday start)
2. The weekly net position = the last `net` value in that week (i.e., the ending position)
3. Total demand = sum of `demand` column for the week
4. Total supply = sum of `open_orders` column for the week
5. Store on `mrp_weekly`

## Exception Flags (computed, shown on dashboard)
- **SHORTAGE**: Any week where net_position < 0
- **BELOW MIN**: Net position < item min_stock but > 0
- **NO COVERAGE**: No open POs and weeks_of_supply < 4
- **EXCESS**: Net position > max_stock for 4+ consecutive weeks

## File Reference
- `prototype/mrp_dashboard.jsx` — Working React prototype with embedded real data. Use as the starting point for the dashboard page component.
- `reference/Section1_Rev5_9.m` — The Power Query M code that generates the data. Reference for understanding the calculation logic if needed.
