import { lazy, Suspense } from "react";
import BackgroundEffects from "./components/BackgroundEffects";
import Navbar from "./components/Navbar";
import ScrollRail from "./components/ScrollRail";
import PersistentSideChrome from "./components/PersistentSideChrome";
import HeroAboutZone from "./components/HeroAboutZone";
import SelectedWork from "./components/SelectedWork";
import Services from "./components/Services";
import ContactCTA from "./components/ContactCTA";
import Footer from "./components/Footer";
import InertialScroll from "./components/InertialScroll";
import SiteCursor from "./components/SiteCursor";
import { BUTTERFLY_FEATURE_ENABLED } from "./features/butterflyFeature";

const ButterflyFlightLayer = lazy(() => import("./components/butterfly/ButterflyFlightLayer"));

function App() {
  return (
    <InertialScroll>
      <SiteCursor />
      {BUTTERFLY_FEATURE_ENABLED ? (
        <Suspense fallback={null}>
          <ButterflyFlightLayer />
        </Suspense>
      ) : null}
      <div
        className="relative min-h-screen text-black overflow-x-clip"
        style={{ background: "var(--site-background, #F7F7F7)" }}
      >
        {/* Solid white page canvas */}
        <BackgroundEffects />

        {/* Global Interface Navigation */}
        <Navbar />

        {/* Global left scroll-progress rail — visible across all sections */}
        <ScrollRail />
        <PersistentSideChrome />

        {/* Page Content Layout */}
        <main className="relative z-10" style={{ background: "var(--site-background, #F7F7F7)" }}>
          <HeroAboutZone />
          <div className="work-services-run">
            <SelectedWork />
            <Services />
          </div>
          <ContactCTA />
        </main>

        {/* Elegant Studio Footer */}
        <Footer />
      </div>
    </InertialScroll>
  );
}

export default App;
