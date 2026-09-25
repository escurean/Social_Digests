# Graph Report - Social_Digests  (2026-09-25)

## Corpus Check
- 147 files · ~52,260 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 587 nodes · 1075 edges · 54 communities (50 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ba3fa5a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- backend/src/index.js
- dependencies
- App.jsx
- dependencies
- getPrimaryImageUrl
- dependencies
- useToastStore
- query
- contentTypes.d.ts
- cloudinary.js
- auth.controller.js
- api.js
- campaigns.controller.js
- useAuthStore
- topics.controller.js
- backend/package.json
- cms/src/index.js
- CampaignDetailPage.jsx
- migrate.js
- StaticPage.jsx
- components.d.ts
- eventBus.js
- setup.sh

## God Nodes (most connected - your core abstractions)
1. `query()` - 101 edges
2. `useToastStore` - 50 edges
3. `useAuthStore` - 22 edges
4. `authenticate()` - 18 edges
5. `getPrimaryImageUrl()` - 17 edges
6. `normalizeList()` - 14 edges
7. `invalidate()` - 13 edges
8. `requireRole()` - 12 edges
9. `getImages()` - 11 edges
10. `issueTokenPair()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `absoluteUrl()` --references--> `MEDIA_BASE`  [EXTRACTED]
  frontend/src/utils/strapi.js → backend/scripts/import-strapi-content.js
- `me()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `resendVerification()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `verifyEmail()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `flag()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/contributions.controller.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (54 total, 4 thin omitted)

### Community 0 - "backend/src/index.js"
Cohesion: 0.08
Nodes (39): ALLOWED_ORIGINS, app, origin(), authenticate(), extractToken(), optionalAuth(), requireRole(), errorHandler() (+31 more)

### Community 1 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs, bull, cookie-parser, cors, dotenv, express, express-rate-limit (+35 more)

### Community 2 - "App.jsx"
Cohesion: 0.06
Nodes (33): AdminAnalytics, AdminBanners, AdminCampaignNew, AdminCampaigns, AdminCategories, AdminDashboard, AdminEmailTemplates, AdminModeration (+25 more)

### Community 3 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, pg, react, react-dom, react-router-dom, @strapi/plugin-i18n, @strapi/plugin-users-permissions, @strapi/provider-upload-cloudinary (+25 more)

### Community 4 - "getPrimaryImageUrl"
Cohesion: 0.15
Nodes (23): AdminCampaignNewPage(), AdminTopicNewPage(), CampaignDetailPage(), CampaignCard(), CampaignsPage(), HomePage(), StatCounter(), useCountUp() (+15 more)

### Community 5 - "dependencies"
Cohesion: 0.07
Nodes (28): axios, dependencies, axios, react, react-dom, react-router-dom, @stripe/react-stripe-js, @stripe/stripe-js (+20 more)

### Community 6 - "useToastStore"
Cohesion: 0.13
Nodes (17): Toast(), ToastItem(), AdminCampaignsPage(), AdminCategoriesPage(), AdminEmailTemplatesPage(), AdminModerationPage(), AdminProposalsPage(), AdminSettingsPage() (+9 more)

### Community 7 - "query"
Cohesion: 0.05
Nodes (65): pool, query(), create(), list(), listActive(), remove(), toggle(), update() (+57 more)

### Community 8 - "contentTypes.d.ts"
Cohesion: 0.07
Nodes (26): AdminApiToken, AdminApiTokenPermission, AdminPermission, AdminRole, AdminTransferToken, AdminTransferTokenPermission, AdminUser, ApiBannerBanner (+18 more)

### Community 9 - "cloudinary.js"
Cohesion: 0.53
Nodes (5): config(), isConfigured(), uploadImage(), VARIANTS, variantUrl()

### Community 10 - "auth.controller.js"
Cohesion: 0.11
Nodes (28): checkBruteForce(), clearLoginAttempts(), forgotPassword(), googleAuth(), googleClient, hashToken(), issueTokenPair(), login() (+20 more)

### Community 11 - "api.js"
Cohesion: 0.11
Nodes (12): AdminBannersPage(), EMPTY_FORM, AdminPagesPage(), EMPTY_FORM, api, banners, emptyOn404(), moderation (+4 more)

### Community 12 - "campaigns.controller.js"
Cohesion: 0.15
Nodes (22): adminGetOne(), adminList(), create(), fkError(), getOne(), getOneImpl(), getStats(), list() (+14 more)

### Community 13 - "useAuthStore"
Cohesion: 0.14
Nodes (14): AdminLayout(), navItems, activeNavLinkStyle, brandStyle, Navbar(), navLinkStyle, navStyle, ForgotPasswordPage() (+6 more)

### Community 14 - "topics.controller.js"
Cohesion: 0.13
Nodes (23): absolutize(), DRY, fetchAll(), main(), MEDIA_BASE, status(), STRAPI_URL, adminGetOne() (+15 more)

### Community 15 - "backend/package.json"
Cohesion: 0.11
Nodes (17): devDependencies, jest, nodemon, pino-pretty, supertest, main, name, scripts (+9 more)

### Community 22 - "cms/src/index.js"
Cohesion: 0.47
Nodes (4): bootstrap(), ensureBackendApiToken(), PUBLIC_ACTIONS, setPublicPermissions()

### Community 23 - "CampaignDetailPage.jsx"
Cohesion: 0.40
Nodes (4): MpesaWaiting(), PRESET_AMOUNTS, StripeCardForm(), donations

### Community 26 - "StaticPage.jsx"
Cohesion: 0.83
Nodes (3): inline(), renderMarkdown(), StaticPage()

## Knowledge Gaps
- **152 isolated node(s):** `__dirname`, `pool`, `name`, `version`, `type` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MEDIA_BASE` connect `topics.controller.js` to `getPrimaryImageUrl`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `absoluteUrl()` connect `getPrimaryImageUrl` to `topics.controller.js`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `query()` connect `query` to `backend/src/index.js`, `auth.controller.js`, `campaigns.controller.js`, `topics.controller.js`?**
  _High betweenness centrality (0.195) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `authenticate()` (e.g. with `admin-content.js` and `routes/auth.js`) actually correct?**
  _`authenticate()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__dirname`, `pool`, `name` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backend/src/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07985193019566367 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._