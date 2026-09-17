import BackgroundEffects from "./components/BackgroundEffects";
import Navbar from "./components/Navbar";
import ScrollRail from "./components/ScrollRail";
import HeroAboutZone from "./components/HeroAboutZone";
import SelectedWork from "./components/SelectedWork";
import Services from "./components/Services";
import Footer from "./components/Footer";
import InertialScroll from "./components/InertialScroll";
import PageIntro from "./components/PageIntro";
import InkTrail from "./components/InkTrail";

function App() {
  return (
    <InertialScroll>
      <PageIntro />
      <div
        className="relative min-h-screen text-black overflow-x-clip"
        style={{ background: "var(--site-background, #ffffff)" }}
      >
        {/* Solid white page canvas */}
        <BackgroundEffects />

        {/* Global Interface Navigation */}
        <Navbar />

        {/* Global left scroll-progress rail — visible across all sections */}
        <ScrollRail />

        {/* Page Content Layout */}
        <main className="relative z-10" style={{ background: "var(--site-background, #ffffff)" }}>
          <HeroAboutZone />
          <div className="work-services-run">
            <SelectedWork />
            <Services />
          </div>
        </main>

        {/* Elegant Studio Footer */}
        <Footer />
        <InkTrail />
      </div>
    </InertialScroll>
  );
}

export default App;
