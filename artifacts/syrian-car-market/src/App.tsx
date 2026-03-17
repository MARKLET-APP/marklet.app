import { Switch, Route, Router as WouterRouter, useLocation, useRoute } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";

import { AppLayout } from "@/components/layout/AppLayout";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import CarDetail from "@/pages/car-detail";
import AddListing from "@/pages/add-listing";
import VehicleInfo from "@/pages/vehicle-info";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";
import Chat from "@/pages/chat";
import Messages from "@/pages/messages";
import Admin from "@/pages/admin";
import Favorites from "@/pages/favorites";
import BuyRequests from "@/pages/buy-requests";
import CarPartsPage from "@/pages/car-parts";
import JunkCarsPage from "@/pages/junk-cars";
import MissingCarsPage from "@/pages/missing-cars";
import InspectionsPage from "@/pages/inspections";
import SupportPage from "@/pages/support";
import PlatesPage from "@/pages/plates";
import AuctionsPage from "@/pages/auctions";
import RentalCarsPage from "@/pages/rental-cars";
import NewCarsPage from "@/pages/new-cars";
import UsedCarsPage from "@/pages/used-cars";
import MotorcyclesPage from "@/pages/motorcycles";
import NotFound from "@/pages/not-found";
import ShowroomPage from "@/pages/showroom";
import AppRatingPopup from "@/components/AppRatingPopup";

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
    },
  },
});

function Router() {
  return (
    <AppLayout>
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
        <Route path="/showroom/:id" component={ShowroomPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
