import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "./auth/AuthProvider";
import { Protected, AdminGuard } from "./components/Layout";
import { Loading } from "./components/common";
import { ApiError } from "./api/client";
import { Login } from "./features/Login";
import { MotionSurface } from "./components/Motion";
import { Feed } from "./features/Feed";
import { MyCountry } from "./features/MyCountry";
import { Article } from "./features/Article";
import { Location } from "./features/Location";
import { About } from "./features/About";
import { Preview } from "./features/Preview";
import { Profile } from "./features/Profile";
import { SubmissionForm } from "./features/SubmissionForm";
const Globe = lazy(() =>
  import("./features/Globe").then((m) => ({ default: m.Globe })),
);
const AdminNews = lazy(() =>
  import("./features/Admin").then((m) => ({ default: m.AdminNews })),
);
const AdminEditor = lazy(() =>
  import("./features/AdminEditor").then((m) => ({ default: m.AdminEditor })),
);
const AdminUsage = lazy(() =>
  import("./features/Admin").then((m) => ({ default: m.AdminUsage })),
);
const AdminAudit = lazy(() =>
  import("./features/Admin").then((m) => ({ default: m.AdminAudit })),
);
const AdminSubmissions = lazy(() =>
  import("./features/AdminSubmissions").then((m) => ({
    default: m.AdminSubmissions,
  })),
);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      refetchOnWindowFocus: false,
      retry: (count, error) =>
        !(
          error instanceof ApiError &&
          [400, 401, 403, 404, 409, 429].includes(error.status)
        ) && count < 1,
    },
    mutations: { retry: false },
  },
});
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function UpdateNotice() {
  const [ready, setReady] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const updater = registerSW({
      onNeedRefresh: () => setReady(true),
      onOfflineReady: () =>
        console.info(
          "Perspectiva PWA: app assets cached for offline navigation",
        ),
    });
    setUpdate(() => () => updater(true));
  }, []);
  return ready ? (
    <div className="update-notice" role="status">
      Hay una nueva edición de la aplicación.
      <button onClick={() => void update?.()}>Actualizar</button>
      <button onClick={() => setReady(false)}>Más tarde</button>
    </div>
  ) : null;
}
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <MotionSurface>
            <ScrollReset />
            <UpdateNotice />
            <Suspense fallback={<Loading label="Abriendo la sección…" />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/about" element={<About />} />
                <Route path="/preview" element={<Preview />} />
                <Route path="/preview/my-country" element={<Preview />} />
                <Route path="/preview/profile" element={<Preview />} />
                <Route path="/preview/profile/new" element={<Preview />} />
                <Route path="/preview/globe" element={<Preview />} />
                <Route
                  path="/preview/globe/:countryCode"
                  element={<Preview />}
                />
                <Route path="/preview/news/:id" element={<Preview />} />
                <Route element={<Protected />}>
                  <Route index element={<Feed />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/my-country" element={<MyCountry />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/new" element={<SubmissionForm />} />
                  <Route path="/globe" element={<Globe />} />
                  <Route path="/globe/:countryCode" element={<Globe />} />
                  <Route path="/news/:id" element={<Article />} />
                  <Route path="/location" element={<Location />} />
                  <Route path="/admin" element={<AdminGuard />}>
                    <Route
                      index
                      element={<Navigate to="/admin/news" replace />}
                    />
                    <Route path="news" element={<AdminNews />} />
                    <Route path="news/new" element={<AdminEditor />} />
                    <Route path="news/:id" element={<AdminEditor />} />
                    <Route path="submissions" element={<AdminSubmissions />} />
                    <Route path="usage" element={<AdminUsage />} />
                    <Route path="audit" element={<AdminAudit />} />
                  </Route>
                </Route>
                <Route
                  path="*"
                  element={
                    <main className="container state">
                      <h1>Esta página no existe.</h1>
                      <Link className="button" to="/">
                        Volver al inicio
                      </Link>
                    </main>
                  }
                />
              </Routes>
            </Suspense>
          </MotionSurface>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
