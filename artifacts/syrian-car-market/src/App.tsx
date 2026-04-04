import { lazy, Suspense, useEffect, useRef, Component, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useRoute } from "wouter";
import { setGlobalNavigate } from "@/lib/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useFcmPush } from "@/hooks/useFcmPush";
import { useAndroidPermissions } from "@/hooks/useAndroidPermissions";
import { IS_NATIVE } from "@/lib/runtimeConfig";
import { App as CapApp } from "@capacitor/app";

const Home = lazy(() => import("@/pages/home"));
const SearchPage = lazy(() => import("@/pages/search"));
const CarDetail = lazy(() => import("@/pages/car-detail"));
const AddListing = lazy(() => import("@/pages/add-listing"));
const VehicleInfo = lazy(() => import("@/pages/vehicle-info"));
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Profile = lazy(() => import("@/pages/profile"));
const Messages = lazy(() => import("@/pages/messages"));
const Admin = lazy(() => import("@/pages/admin"));
const Favorites = lazy(() => import("@/pages/favorites"));
const BuyRequests = lazy(() => import("@/pages/buy-requests"));
const CarPartsPage = lazy(() => import("@/pages/car-parts"));
const JunkCarsPage = lazy(() => import("@/pages/junk-cars"));
const MissingCarsPage = lazy(() => import("@/pages/missing-cars"));
const InspectionsPage = lazy(() => import("@/pages/inspections"));
const SupportPage = lazy(() => import("@/pages/support"));
const PlatesPage = lazy(() => import("@/pages/plates"));
const AuctionsPage = lazy(() => import("@/pages/auctions"));
const RentalCarsPage = lazy(() => import("@/pages/rental-cars"));
const NewCarsPage = lazy(() => import("@/pages/new-cars"));
const UsedCarsPage = lazy(() => import("@/pages/used-cars"));
const MotorcyclesPage = lazy(() => import("@/pages/motorcycles"));
const NotFound = lazy(() => import("@/pages/not-found"));
const SystemAuditPage = lazy(() => import("@/pages/system-audit"));
const ShowroomPage = lazy(() => import("@/pages/showroom"));
const ShowroomsPage = lazy(() => import("@/pages/showrooms"));
const ShowroomManagePage = lazy(() => import("@/pages/showroom-manage"));
const ReelsPage = lazy(() => import("@/pages/reels"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const ReelsUploadPage = lazy(() => import("@/pages/reels-upload"));
const InspectionCentersPage = lazy(() => import("@/pages/inspection-centers"));
const InspectionCenterPage = lazy(() => import("@/pages/inspection-center"));
const InspectionCenterManagePage = lazy(() => import("@/pages/inspection-center-manage"));
const ScrapCentersPage = lazy(() => import("@/pages/scrap-centers"));
const ScrapCenterPage = lazy(() => import("@/pages/scrap-center"));
const ScrapCenterManagePage = lazy(() => import("@/pages/scrap-center-manage"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsPage = lazy(() => import("@/pages/terms"));
const RealEstatePage = lazy(() => import("@/pages/real-estate"));
const RealEstateDetailPage = lazy(() => import("@/pages/real-estate-detail"));
const JobsPage = lazy(() => import("@/pages/jobs"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const MarketplaceDetailPage = lazy(() => import("@/pages/marketplace-detail"));
const MarketplaceOrdersPage = lazy(() => import("@/pages/marketplace-orders"));
const JobDetailPage = lazy(() => import("@/pages/job-detail"));
import AppRatingPopup from "@/components/AppRatingPopup";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode; routeKey: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; routeKey: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("[ErrorBoundary]", error); }
  componentDidUpdate(prevProps: { children: ReactNode; routeKey: string }) {
    if (this.state.hasError && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <p className="text-xl font-bold text-foreground">حدث خطأ غير متوقع</p>
          <p className="text-sm text-muted-foreground">يرجى العودة والمحاولة مجدداً</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.history.back(); }}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm"
          >
            رجوع
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ListingRedirect() {
  const [, params] = useRoute("/listing/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  if (id) navigate(`/cars/${id}`, { replace: true });
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function GlobalHooks() {
  const [location, navigate] = useLocation();
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  // Always keep the latest location in a ref so the back-button listener
  // (which is registered once) always reads the current path.
  const locationRef = useRef(location);
  useEffect(() => { locationRef.current = location; }, [location]);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Handle navigation messages from service worker (Web Push notification clicks)
  useEffect(() => {
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_NAVIGATE" && event.data.url) {
        const path: string = event.data.url;
        navigate(path.startsWith("/") ? path : `/${path}`);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSwMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleSwMessage);
  }, [navigate]);

  // ── Android hardware back button ─────────────────────────────────────────
  // Rules:
  //   • On any deep page      → go back in wouter history
  //   • No history + not home → navigate to "/"
  //   • On home page          → ask for exit confirmation, then exitApp()
  // We use locationRef (wouter path) instead of window.location.pathname
  // because Capacitor's WebView always reports "/" as the pathname.
  useEffect(() => {
    if (!IS_NATIVE) return;
    let listener: { remove: () => void } | null = null;

    CapApp.addListener("backButton", ({ canGoBack }) => {
      const currentPath = locationRef.current;
      const isHome = currentPath === "/" || currentPath === "";

      if (isHome) {
        // Show native confirmation dialog before exiting
        const confirmed = window.confirm("هل تريد الخروج من التطبيق؟");
        if (confirmed) CapApp.exitApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        // History is empty but we're not on home — go home
        navigateRef.current("/");
      }
    }).then((l) => { listener = l; });

    return () => { listener?.remove(); };
  }, []); // register once; refs always carry the latest values

  usePushNotifications();
  useFcmPush();
  useAndroidPermissions();
  return null;
}

function Router() {
  const [location] = useLocation();
  return (
    <AppLayout>
      <ErrorBoundary routeKey={location}>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/reels" component={ReelsPage} />
          <Route path="/reels/upload" component={ReelsUploadPage} />
          <Route path="/" component={Home} />
          <Route path="/search" component={SearchPage} />
          <Route path="/listing/:id" component={ListingRedirect} />
          <Route path="/cars/:id" component={CarDetail} />
          <Route path="/add-listing" component={AddListing} />
          <Route path="/vehicle-info" component={VehicleInfo} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/profile" component={Profile} />
          <Route path="/chat" component={Messages} />
          <Route path="/messages" component={Messages} />
          <Route path="/admin" component={Admin} />
          <Route path="/admin/system-audit" component={SystemAuditPage} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/buy-requests" component={BuyRequests} />
          <Route path="/car-parts" component={CarPartsPage} />
          <Route path="/junk-cars" component={JunkCarsPage} />
          <Route path="/missing-cars" component={MissingCarsPage} />
          <Route path="/inspections" component={InspectionsPage} />
          <Route path="/support" component={SupportPage} />
          <Route path="/plates" component={PlatesPage} />
          <Route path="/auctions" component={AuctionsPage} />
          <Route path="/rental-cars" component={RentalCarsPage} />
          <Route path="/new-cars" component={NewCarsPage} />
          <Route path="/used-cars" component={UsedCarsPage} />
          <Route path="/motorcycles" component={MotorcyclesPage} />
          <Route path="/showrooms" component={ShowroomsPage} />
          <Route path="/showroom/manage" component={ShowroomManagePage} />
          <Route path="/showroom/:id" component={ShowroomPage} />
          <Route path="/inspection-centers" component={InspectionCentersPage} />
          <Route path="/inspection-center/manage" component={InspectionCenterManagePage} />
          <Route path="/inspection-center/:id" component={InspectionCenterPage} />
          <Route path="/scrap-centers" component={ScrapCentersPage} />
          <Route path="/scrap-center/manage" component={ScrapCenterManagePage} />
          <Route path="/scrap-center/:id" component={ScrapCenterPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/real-estate/:id" component={RealEstateDetailPage} />
          <Route path="/real-estate" component={RealEstatePage} />
          <Route path="/jobs/:id" component={JobDetailPage} />
          <Route path="/jobs" component={JobsPage} />
          <Route path="/marketplace/:id" component={MarketplaceDetailPage} />
          <Route path="/marketplace-orders" component={MarketplaceOrdersPage} />
          <Route path="/marketplace" component={MarketplacePage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <GlobalHooks />
            <Router />
          </WouterRouter>
          <Toaster />
          <AppRatingPopup />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
