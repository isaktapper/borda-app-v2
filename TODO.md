
# TODO - Framtida förbättringar

---

## 🚀 ROADMAP - Prioriterade Features

### 🔴 Hög Prioritet

#### 1. Email Notifications
**Status:** Planerad
**Beskrivning:** Automatiska påminnelser och notiser via email

**Features:**
- [ ] Task-påminnelser (X dagar innan deadline)
- [ ] Veckosammanfattning till CS-ansvarig
- [ ] Notis när kund slutför task/laddar upp fil
- [ ] Konfigurerbart per projekt (vilka händelser triggar email)

**Implementation:** Resend API + cron job för schemalagda utskick

---

#### 2. ✅ Progress Bar i Kundportalen
**Status:** Klart (2026-01-06)
**Beskrivning:** Visa kunden hur långt de kommit i onboardingen

**Features:**
- [x] Cirkulär progress-indikator i headern
- [x] Visa i portal header
- [x] "X av Y" completed items
- [x] Grön check-ikon vid 100%

**Implementation:** `PortalProgressIndicator` komponent i portal layout

---

#### 3. Webhooks
**Status:** Planerad
**Beskrivning:** Låt användare koppla egna system via webhooks

**Features:**
- [ ] Konfigurera webhook URL i projekt-settings
- [ ] Välj vilka events som triggar (task.completed, file.uploaded, etc)
- [ ] Webhook history/logs
- [ ] Retry-logik vid misslyckade anrop

**Implementation:** Ny tabell `project_webhooks`, trigga från activity-hook

---

### 🟡 Medel Prioritet

#### 4. Kalender-integration
**Status:** Idé
**Beskrivning:** Synka deadlines med kundens kalender

**Features:**
- [ ] Google Calendar integration
- [ ] Outlook/Microsoft 365 integration
- [ ] Automatisk kalender-inbjudan för tasks med deadline
- [ ] iCal export-länk

---

#### 5. Analytics Dashboard
**Status:** Idé
**Beskrivning:** Visuell översikt över all aktivitet

**Features:**
- [ ] Grafer över besök, completions, uploads över tid
- [ ] Jämför projekt mot varandra
- [ ] Export till CSV/Excel
- [ ] Filtrering per tidsperiod

---

#### 6. Bulk Actions
**Status:** Idé
**Beskrivning:** Masshantering av projekt

**Features:**
- [ ] Välj flera projekt och ändra status
- [ ] Bulk-arkivera avslutade projekt
- [ ] Bulk-tilldela CS-ansvarig
- [ ] Bulk-export av data

---

### 🟢 Låg Prioritet

#### 7. Customer Feedback / NPS
**Status:** Idé
**Beskrivning:** Samla in feedback från kunder

**Features:**
- [ ] NPS-fråga i slutet av onboardingen
- [ ] Fritext-feedback
- [ ] Sammanställning i dashboard

---

#### 8. Projektmallar (Templates)
**Status:** Idé
**Beskrivning:** Skapa nya projekt från mallar

**Features:**
- [ ] Spara projekt som mall
- [ ] Mall-bibliotek per organisation
- [ ] Förhandsgranska mall innan användning
- [ ] Dela mallar mellan organisationer (marketplace?)

---

#### 9. Välkomstmeddelande i Portal
**Status:** Idé
**Beskrivning:** Personligt välkomstmeddelande för kunder

**Features:**
- [ ] Video-välkomst (embed från Loom/YouTube)
- [ ] Personlig text med kundens namn
- [ ] Visa endast första gången

---

#### 10. Multi-språk (i18n)
**Status:** Idé
**Beskrivning:** Stöd för flera språk i portalen

**Features:**
- [ ] Svenska/Engelska toggle
- [ ] Automatisk översättning av UI
- [ ] Manuell översättning av innehåll per sida

---

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
