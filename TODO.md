# TODO - Framtida förbättringar

## 🔄 Automatisering & Performance

### Engagement Score Auto-Update (Cron Job)
**Status:** Planerad
**Prioritet:** Medel
**Beskrivning:** Automatisk uppdatering av engagement scores istället för manuell cache-rensning

**Alternativ:**
- [ ] **Alt A:** Daglig uppdatering kl 03:00 (alla projekt)
- [ ] **Alt B:** Uppdatering varje timme (alla projekt)
- [ ] **Alt C:** Uppdatering varje timme (endast aktiva projekt)

**Implementation:**
- Använd Vercel Cron (inte Supabase pg_cron)
- Skapa `/api/cron/update-engagement-scores` endpoint
- Lägg till i `/vercel.json`

**Uppskattad tid:** ~1-2 timmar för implementation

**Resurser:**
- 10 projekt: ~2-3 sek
- 100 projekt: ~20-30 sek
- 1000 projekt: ~3-5 min

**Anteckningar:**
- Vercel Hobby plan tillåter 2 cron jobs (vi har redan 1)
- Kan köra parallellt med task-reminders

---

## 📊 Analytics & Metrics

### Portal Visit Analytics Dashboard
**Status:** Idé
**Prioritet:** Låg
**Beskrivning:** Visualisera portal-besök över tid

**Features:**
- Graf över besök senaste 30 dagarna
- Besök per kund
- Aktiva timmar (när besöker kunder portalen mest?)
- Genomsnittlig sessionslängd

---

## 🔔 Notifikationer

### Engagement Score Alerts
**Status:** Idé
**Prioritet:** Låg
**Beskrivning:** Notifiera när engagement score sjunker under viss nivå

**Features:**
- Email när projekt går från "Medium" → "Low"
- Email när 0 visits senaste 7 dagarna
- Dashboard-notis för lågt engagemang

---

## 🎨 UI/UX Förbättringar

### _Inga pending just nu_

---

## 🐛 Kända Buggar

### _Inga kända buggar just nu_

---

## 📝 Dokumentation

### API Documentation
**Status:** Saknas
**Prioritet:** Låg
**Beskrivning:** Dokumentera alla server actions och API endpoints

---

## Arkiv (Klart ✅)

- ✅ Engagement Score System (2025-12-25)
- ✅ Portal Visit Tracking (2025-12-25)
- ✅ Activity Logging Fix (RLS policy issue) (2025-12-25)
- ✅ Progress Calculation Consistency (2025-12-25)
