# RupKotha Project — Agent Directives & Context Management

---

## Mandatory Context Maintenance Rule

Whenever working on this codebase, **you must strictly follow this protocol**:

### 1. Pre-Execution Check (Before Modifying Any Code)
Before writing code or answering design/architecture questions, always inspect the 6 root context files to maintain consistency with the project's vision, design tokens, database schema, and tech stack:
- [`prd.md`](./prd.md) — Product requirements, personas, RBAC permission matrix, and non-functional requirements.
- [`state.md`](./state.md) — Current implementation snapshot, completed features, known considerations, and test history.
- [`tokens.md`](./tokens.md) — Design tokens (color palette, typography, radii, spacing, heights) and security tokens (JWT schemas, cookie options).
- [`stack.md`](./stack.md) — Full technology stack (Next.js App Router, Express, raw pg, Cloudinary, Resend) and env vars.
- [`schema.md`](./schema.md) — Database ERD, exact PostgreSQL table definitions, indexes, constraints, and seed data.
- [`plan.md`](./plan.md) — Master implementation roadmap (Phases 1–8), upcoming milestones, and architectural rules.

### 2. Post-Execution Update (After Every Edit)
After completing any feature, bug fix, refactoring, or database migration, **you must immediately update the relevant context files**:
- **Added/Modified a Feature:** Update [`state.md`](./state.md) (implementation matrix, test status) and [`plan.md`](./plan.md) (checklist milestones).
- **Modified Database Schema:** Update [`schema.md`](./schema.md) (tables, columns, indexes, constraints) and [`state.md`](./state.md).
- **Added/Adjusted Colors, Sizing or Auth Tokens:** Update [`tokens.md`](./tokens.md).
- **Added Dependencies, Env Variables, or Routes:** Update [`stack.md`](./stack.md) and [`prd.md`](./prd.md).

---

## Core Engineering Invariants
1. **JavaScript Only:** Vanilla JavaScript (ES modules on frontend, CommonJS on backend). Never introduce TypeScript files (`.ts`, `.tsx`).
2. **Zero Prisma Policy:** Never use Prisma or Sequelize. Always write raw, parameterized SQL queries using the `pg` pool (`server/config/db.js`).
3. **Cloudinary Protocol:** Always stream image uploads through Express memory storage via `multer`. Never expose Cloudinary API secrets to the frontend.
4. **Modal Height Constraint:** Keep all admin modals bounded to `max-h-[85vh]`–`max-h-[88vh]` with `flex-1 overflow-y-auto` and pinned `shrink-0` footers.
5. **Role-Based Access Control:** Protect all admin routes on both client (`proxy.js`, `AdminLayoutContent`) and server (`authenticate`, `requireRole('ADMIN')`).

