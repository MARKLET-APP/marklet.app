import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useRoute } from "wouter";
import { setGlobalNavigate } from "@/lib/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { AppLayout } from "@/components/layout/AppLayout";

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
import AppRatingPopup from "@/components/AppRatingPopup";

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
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
  const [, navigate] = useLocation();
  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);
  return null;
}

function Router() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
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
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
