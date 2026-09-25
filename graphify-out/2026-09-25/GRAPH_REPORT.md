# Graph Report - Social_Digests  (2026-09-25)

## Corpus Check
- 148 files · ~54,570 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 594 nodes · 1111 edges · 61 communities (57 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.76)
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
- donations.controller.js
- auth.controller.js
- api.js
- campaigns.controller.js
- useAuthStore
- webhooks.controller.js
- backend/package.json
- cms-proxy.controller.js
- db.js
- banners.controller.js
- proposals.controller.js
- topics.controller.js
- categories.controller.js
- cms/src/index.js
- CampaignDetailPage.jsx
- migrate.js
- notifications.controller.js
- StaticPage.jsx
- components.d.ts
- eventBus.js
- setup.sh

## God Nodes (most connected - your core abstractions)
1. `query()` - 113 edges
2. `useToastStore` - 50 edges
3. `useAuthStore` - 22 edges
4. `authenticate()` - 17 edges
5. `getPrimaryImageUrl()` - 17 edges
6. `normalizeList()` - 14 edges
7. `strapiRequest()` - 13 edges
8. `invalidate()` - 13 edges
9. `requireRole()` - 11 edges
10. `getImages()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `absoluteUrl()` --references--> `MEDIA_BASE`  [EXTRACTED]
  frontend/src/utils/strapi.js → backend/scripts/import-strapi-content.js
- `me()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `resendVerification()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `verifyEmail()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/auth.controller.js → backend/src/config/db.js
- `create()` --calls--> `query()`  [EXTRACTED]
  backend/src/controllers/banners.controller.js → backend/src/config/db.js

## Import Cycles
- None detected.

## Communities (61 total, 4 thin omitted)

### Community 0 - "backend/src/index.js"
Cohesion: 0.09
Nodes (36): ALLOWED_ORIGINS, app, origin(), authenticate(), extractToken(), optionalAuth(), requireRole(), errorHandler() (+28 more)

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
Cohesion: 0.14
Nodes (23): query(), getOne(), list(), toggle(), update(), ban(), banUser(), dismiss() (+15 more)

### Community 8 - "contentTypes.d.ts"
Cohesion: 0.07
Nodes (26): AdminApiToken, AdminApiTokenPermission, AdminPermission, AdminRole, AdminTransferToken, AdminTransferTokenPermission, AdminUser, ApiBannerBanner (+18 more)

### Community 9 - "donations.controller.js"
Cohesion: 0.14
Nodes (20): confirmStripePayment(), getCampaignStats(), getDonationStatus(), initiate(), mpesaCallback(), queueReceipt(), stripeWebhook(), emailQueue (+12 more)

### Community 10 - "auth.controller.js"
Cohesion: 0.14
Nodes (23): checkBruteForce(), clearLoginAttempts(), forgotPassword(), googleAuth(), googleClient, hashToken(), issueTokenPair(), login() (+15 more)

### Community 11 - "api.js"
Cohesion: 0.11
Nodes (12): AdminBannersPage(), EMPTY_FORM, AdminPagesPage(), EMPTY_FORM, api, banners, emptyOn404(), moderation (+4 more)

### Community 12 - "campaigns.controller.js"
Cohesion: 0.17
Nodes (18): create(), getOne(), getStats(), list(), remove(), slugify(), update(), create() (+10 more)

### Community 13 - "useAuthStore"
Cohesion: 0.14
Nodes (14): AdminLayout(), navItems, activeNavLinkStyle, brandStyle, Navbar(), navLinkStyle, navStyle, ForgotPasswordPage() (+6 more)

### Community 14 - "webhooks.controller.js"
Cohesion: 0.17
Nodes (17): absolutize(), DRY, fetchAll(), main(), MEDIA_BASE, status(), STRAPI_URL, resolveHandler() (+9 more)

### Community 15 - "backend/package.json"
Cohesion: 0.11
Nodes (17): devDependencies, jest, nodemon, pino-pretty, supertest, main, name, scripts (+9 more)

### Community 16 - "cms-proxy.controller.js"
Cohesion: 0.29
Nodes (16): createCampaign(), createTopic(), deleteCampaign(), deleteTopic(), fetchImages(), getCampaign(), getTopic(), listCampaigns() (+8 more)

### Community 17 - "db.js"
Cohesion: 0.18
Nodes (8): pool, create(), getOne(), list(), remove(), update(), createNotification(), NOTIFICATION_TYPES

### Community 18 - "banners.controller.js"
Cohesion: 0.29
Nodes (6): create(), list(), listActive(), remove(), toggle(), update()

### Community 19 - "proposals.controller.js"
Cohesion: 0.38
Nodes (6): approve(), createTopicInStrapi(), list(), reject(), slugify(), submit()

### Community 20 - "topics.controller.js"
Cohesion: 0.33
Nodes (6): create(), getOne(), list(), remove(), slugify(), update()

### Community 21 - "categories.controller.js"
Cohesion: 0.53
Nodes (5): create(), list(), remove(), strapiSync(), update()

### Community 22 - "cms/src/index.js"
Cohesion: 0.47
Nodes (4): bootstrap(), ensureBackendApiToken(), PUBLIC_ACTIONS, setPublicPermissions()

### Community 23 - "CampaignDetailPage.jsx"
Cohesion: 0.40
Nodes (4): MpesaWaiting(), PRESET_AMOUNTS, StripeCardForm(), donations

### Community 25 - "notifications.controller.js"
Cohesion: 0.50
Nodes (3): list(), markAllRead(), markRead()

### Community 26 - "StaticPage.jsx"
Cohesion: 0.83
Nodes (3): inline(), renderMarkdown(), StaticPage()

## Knowledge Gaps
- **149 isolated node(s):** `__dirname`, `pool`, `name`, `version`, `type` (+144 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `query()` connect `query` to `backend/src/index.js`, `donations.controller.js`, `auth.controller.js`, `campaigns.controller.js`, `webhooks.controller.js`, `cms-proxy.controller.js`, `db.js`, `banners.controller.js`, `proposals.controller.js`, `topics.controller.js`, `categories.controller.js`, `notifications.controller.js`?**
  _High betweenness centrality (0.214) - this node is a cross-community bridge._
- **Why does `MEDIA_BASE` connect `webhooks.controller.js` to `getPrimaryImageUrl`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Why does `absoluteUrl()` connect `getPrimaryImageUrl` to `webhooks.controller.js`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `authenticate()` (e.g. with `routes/auth.js` and `banners.js`) actually correct?**
  _`authenticate()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `__dirname`, `pool`, `name` to the rest of the system?**
  _149 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backend/src/index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08521303258145363 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._