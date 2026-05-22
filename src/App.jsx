import BackgroundEffects from "./components/BackgroundEffects";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Services from "./components/Services";
import ImageSequenceSection from "./components/ImageSequenceSection";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import EntranceSplash from "./components/EntranceSplash";

function App() {
  return (
    <div className="relative min-h-screen bg-black text-gray-300 overflow-x-hidden">
      {/* One-time entrance splash (homepage only, ~1s) */}
      <EntranceSplash />

      {/* Premium Cinematic Background Layer */}
      <BackgroundEffects />

      {/* Global Interface Navigation */}
      <Navbar />

      {/* Page Content Layout */}
      <main className="relative z-10">
        <Hero />
        <Services />
        <ImageSequenceSection />
        <CTA />
      </main>

      {/* Elegant Studio Footer */}
      <Footer />
    </div>
  );
}

export default App;
