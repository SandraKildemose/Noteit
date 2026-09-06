# Note it — Produktionsguide

## Hurtig checkliste inden lancering

- [ ] Supabase-projekt oprettet (EU-region)
- [ ] `supabase-schema.sql` kørt i SQL Editor
- [ ] `supabase-config.js` udfyldt med rigtig URL + anon key
- [ ] Site URL sat i Supabase Auth Settings
- [ ] Domæne tilkoblet (Netlify / eget)
- [ ] HTTPS virker (automatisk på Netlify)
- [ ] Test signup + email-bekræftelse
- [ ] Test "Glemt adgangskode"
- [ ] Test magic link login
- [ ] Test eksport af data
- [ ] Test sletning af konto

---

## 1. Supabase-setup

### Projekt
1. Gå til [supabase.com](https://supabase.com) → "New project"
2. Vælg **Frankfurt (eu-central-1)** som region (GDPR)
3. Gem database-adgangskoden sikkert

### Database
Kør `supabase-schema.sql` i **SQL Editor** i Supabase-dashboardet.

### Auth-indstillinger (Authentication → Settings)
```
Site URL:          https://noteit.dk
Redirect URLs:     https://noteit.dk/*
Email confirmations: ✓ Slået til
OTP-udløb:         3600 sekunder (1 time)
Rate limiting:     Slå til (standard)
```

### Supabase-nøgler (`supabase-config.js`)
```js
window.SUPABASE_URL      = 'https://xxxx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJ...';  // Kun anon key — ALDRIG service_role key
```

---

## 2. Database-backup

### Automatisk (Supabase Pro, ~25$/md)
Supabase Pro giver daglige automatiske backups med 7 dages opbevaring.

### Gratis selvlavet backup (kræver Supabase-konto)
Tilføj dette som et GitHub Action eller cron-job:

```bash
#!/bin/bash
# backup-db.sh — kør dagligt
DATE=$(date +%Y-%m-%d)
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host=db.xxxx.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --file="backup-${DATE}.dump"

# Upload til S3 / Backblaze B2 / Dropbox
# rclone copy "backup-${DATE}.dump" remote:noteit-backups/
```

**GitHub Actions eksempel** (`.github/workflows/backup.yml`):
```yaml
name: Daily DB Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Hver nat kl. 02:00 UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Dump database
        env:
          PGPASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          pg_dump "postgresql://postgres:${PGPASSWORD}@db.xxxx.supabase.co:5432/postgres" \
            --format=custom > backup-$(date +%Y-%m-%d).dump
      - name: Upload to storage
        run: echo "Upload til dit foretrukne lager"
```

### App-level backup (brugerne)
Brugere kan altid eksportere egne data via **Dine data → Eksporter** i appen.

---

## 3. Overvågning og fejllogning

### App-fejl
Alle JavaScript-fejl logges automatisk til `error_logs`-tabellen i Supabase.

Se dem i Supabase Table Editor eller med:
```sql
SELECT ts, context, message, stack
FROM error_logs
ORDER BY ts DESC
LIMIT 100;
```

### Oppetid-overvågning (gratis)
- [UptimeRobot](https://uptimerobot.com) — overvåger hvert 5. minut, sender SMS/email ved nedbrud
- Tilføj dit domæne: `https://noteit.dk`

### Supabase-logs
Under **Logs → API** i Supabase-dashboardet kan du se alle forespørgsler i realtid.

---

## 4. Sikkerhed — fuld checkliste

| Punkt | Status | Løsning |
|-------|--------|---------|
| Email-bekræftelse ved oprettelse | ✅ | Supabase sender bekræftelsesmail automatisk |
| Stærk adgangskodepolitik | ✅ | Min. 10 tegn, stort bogstav, tal, specialtegn |
| Adgangskode-styrkeindikator | ✅ | Visuel bar ved oprettelse |
| Passwordless / magic link login | ✅ | "Send login-link til e-mail"-knap |
| HTTPS overalt | ✅ | HSTS-header + Netlify/Supabase tvinger HTTPS |
| Privatlivspolitik (GDPR) | ✅ | Tilgængelig i sidebar + ved oprettelse |
| Slet konto og data | ✅ | Via "Dine data"-dialogen |
| Rate limiting | ✅ | Klient (5 forsøg/15 min) + Supabase server |
| Krypterede adgangskoder | ✅ | Supabase bruger bcrypt — aldrig plaintext |
| Database-backup | ✅ | Supabase automatisk (Pro) eller GitHub Action |
| Fejllogning | ✅ | Global JS-fejlfangst → Supabase error_logs |
| Overvågning | ✅ | UptimeRobot (opsættes manuelt) |
| Terms-checkbox ved oprettelse | ✅ | Skal accepteres inden man kan oprette konto |
| Row Level Security | ✅ | Brugere kan KUN se egne data |
| CSP / Security headers | ✅ | Via _headers (Netlify) |
| XSS-beskyttelse | ✅ | Alle brugerinput saniteres |
| Aldersgrænse | ✅ | "Mindst 16 år" ved oprettelse |
| GDPR-databehandlingsret | ✅ | Eksport + sletning i appen |

---

## 5. Domæne og deployment (Netlify)

```bash
# Installer Netlify CLI
npm install -g netlify-cli

# Deploy
cd ~/Desktop/UniNotes
netlify deploy --prod --dir .
```

Netlify læser automatisk:
- `netlify.toml` (cache-regler + redirects)
- `_headers` (sikkerhedsheaders)

### Custom domæne
1. Netlify Dashboard → Domain settings → Add custom domain
2. Tilføj CNAME-record hos din DNS-udbyder: `noteit.dk → xxx.netlify.app`
3. HTTPS aktiveres automatisk via Let's Encrypt

---

## 6. Skalering

Note it er bygget til at skalere uden ændringer:
- **Web:** Netlify CDN — skalerer automatisk til ubegrænset brugere
- **Database:** Supabase PostgreSQL — skalerer vertikalt (opgradér plan)
- **PWA-opdateringer:** Service Worker opdaterer alle brugere ved næste besøg uden nedetid
- **Electron-opdateringer:** electron-updater via GitHub Releases

---

## 7. GDPR-kontaktpunkt

Tilføj en rigtig email i privatlivspolitikken:
```
privacy@noteit.dk
```
Svar på GDPR-henvendelser inden 30 dage (lovkrav).
