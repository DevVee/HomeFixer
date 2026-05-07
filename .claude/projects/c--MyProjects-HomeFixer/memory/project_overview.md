---
name: HomeFixer Project Overview
description: Tech stack, architecture, and current state of the HomeFixer app
type: project
---

HomeFixer is a mobile home services booking platform for Pampanga, Philippines connecting customers with service providers (plumbing, aircon, electrical, carpentry).

**Tech Stack:** React Native + Expo 54, TypeScript, Zustand, React Navigation v7, Supabase (auth + DB + realtime + storage), PayMongo (GCash/Maya payments), Resend (email), Expo Notifications (push)

**Three roles:** Customer, Provider (technician), Admin

**App location:** c:\MyProjects\HomeFixer\app\
**Backend:** Supabase edge functions at c:\MyProjects\HomeFixer\supabase\functions\

**Why:** App is in active development (2 commits). Client has submitted a list of 17 feature requests tracked in task.txt.

**How to apply:** Always check task.txt for current pending work. Supabase is the single backend — no separate Node.js server, everything goes through Supabase edge functions or direct client queries.
