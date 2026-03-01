# ⛽ Combustible — Aceites Tapia SL

Control de gasóleo para vehículos y equipos de la empresa.

## Stack
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Supabase (instancia compartida del ecosistema)
- **Deploy:** Vercel

## Instancia Supabase
Comparte la instancia `ylbwewlvovyfxoerhrnf` con el resto de apps del ecosistema (Tarifas, Pedidos, Repartidor).

## Variables de entorno
```
VITE_SUPABASE_URL=https://ylbwewlvovyfxoerhrnf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Desarrollo local
```bash
npm install
npm run dev
```

## Tablas utilizadas
- `staff` — Personal interno (admin, operario, repartidor)
- `fuel_entries` — Abastecimiento de depósitos
- `fuel_exits` — Repostajes / salidas
