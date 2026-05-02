import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore.js'
import PublicLayout from './components/layouts/PublicLayout.jsx'
import AdminLayout from './components/layouts/AdminLayout.jsx'
import Toast from './components/ui/Toast.jsx'

// ── Public pages ──────────────────────────────────────────────
const HomePage           = lazy(() => import('./pages/public/HomePage.jsx'))
const TopicsPage         = lazy(() => import('./pages/public/TopicsPage.jsx'))
const TopicDetailPage    = lazy(() => import('./pages/public/TopicDetailPage.jsx'))
const ProposePage        = lazy(() => import('./pages/public/ProposePage.jsx'))
const CampaignsPage      = lazy(() => import('./pages/public/CampaignsPage.jsx'))
const CampaignDetailPage = lazy(() => import('./pages/public/CampaignDetailPage.jsx'))
const ProfilePage        = lazy(() => import('./pages/public/ProfilePage.jsx'))
const StaticPage         = lazy(() => import('./pages/public/StaticPage.jsx'))

// ── Auth pages ────────────────────────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))

// ── Admin pages ───────────────────────────────────────────────
const AdminDashboard       = lazy(() => import('./pages/admin/DashboardPage.jsx'))
const AdminTopics          = lazy(() => import('./pages/admin/TopicsPage.jsx'))
const AdminTopicNew        = lazy(() => import('./pages/admin/TopicNewPage.jsx'))
const AdminCategories      = lazy(() => import('./pages/admin/CategoriesPage.jsx'))
const AdminProposals       = lazy(() => import('./pages/admin/ProposalsPage.jsx'))
const AdminCampaigns       = lazy(() => import('./pages/admin/CampaignsPage.jsx'))
const AdminCampaignNew     = lazy(() => import('./pages/admin/CampaignNewPage.jsx'))
const AdminBanners         = lazy(() => import('./pages/admin/BannersPage.jsx'))
const AdminPages           = lazy(() => import('./pages/admin/PagesPage.jsx'))
const AdminEmailTemplates  = lazy(() => import('./pages/admin/EmailTemplatesPage.jsx'))
const AdminModeration      = lazy(() => import('./pages/admin/ModerationPage.jsx'))
const AdminUsers           = lazy(() => import('./pages/admin/UsersPage.jsx'))
const AdminSettings        = lazy(() => import('./pages/admin/SettingsPage.jsx'))
const AdminAnalytics       = lazy(() => import('./pages/admin/AnalyticsPage.jsx'))

function LoadingFallback() {
  return <div className="loading-screen">Loading…</div>
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/auth/login" replace />
  }
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ── Public ── */}
          <Route element={<PublicLayout />}>
            <Route path="/"                element={<HomePage />} />
            <Route path="/topics"          element={<TopicsPage />} />
            <Route path="/topics/propose"  element={
              <ProtectedRoute><ProposePage /></ProtectedRoute>
            } />
            <Route path="/topics/:slug"    element={<TopicDetailPage />} />
            <Route path="/campaigns"       element={<CampaignsPage />} />
            <Route path="/campaigns/:slug" element={<CampaignDetailPage />} />
            <Route path="/profile/:id"     element={<ProfilePage />} />
            <Route path="/pages/:slug"     element={<StaticPage />} />
          </Route>

          {/* ── Auth ── */}
          <Route path="/auth/login"           element={<LoginPage />} />
          <Route path="/auth/register"        element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

          {/* ── Admin ── */}
          <Route path="/admin" element={
            <AdminRoute><AdminLayout /></AdminRoute>
          }>
            <Route index                  element={<AdminDashboard />} />
            <Route path="topics"                 element={<AdminTopics />} />
            <Route path="topics/new"             element={<AdminTopicNew />} />
            <Route path="topics/edit/:slug"      element={<AdminTopicNew />} />
            <Route path="categories"             element={<AdminCategories />} />
            <Route path="proposals"              element={<AdminProposals />} />
            <Route path="campaigns"              element={<AdminCampaigns />} />
            <Route path="campaigns/new"          element={<AdminCampaignNew />} />
            <Route path="campaigns/edit/:slug"   element={<AdminCampaignNew />} />
            <Route path="banners"         element={<AdminBanners />} />
            <Route path="pages"           element={<AdminPages />} />
            <Route path="email-templates" element={<AdminEmailTemplates />} />
            <Route path="moderation"      element={<AdminModeration />} />
            <Route path="users"           element={<AdminUsers />} />
            <Route path="settings"        element={<AdminSettings />} />
            <Route path="analytics"       element={<AdminAnalytics />} />
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toast />
    </BrowserRouter>
  )
}
