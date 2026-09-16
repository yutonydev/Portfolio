import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import PixelBlast from './components/PixelBlast/PixelBlast';
import LoadingGate from './components/Loading/LoadingGate';
import Home from './pages/Home';
import Projects from './pages/Projects';
import About from './pages/About';
import Contact from './pages/Contact';
import { PIXEL_PURPLE } from './lib/theme';

export default function App() {
  return (
    <div className="relative min-h-screen">
      {/* Fixed background at z-0; content at z-10 stays clickable. */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <PixelBlast
          color={PIXEL_PURPLE}
          variant="square"
          pixelSize={3}
          patternScale={5.5}
          patternDensity={0.9}
          pixelSizeJitter={1.1}
          speed={0.5}
          edgeFade={0.19}
          enableRipples
          liquid={false}
          transparent
        />
      </div>

      {/* Screen-tall, so short pages keep the footer down. */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav />
        {/* Column, so a page can fill leftover height with flex-1. */}
        <main className="flex flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        <Footer />
      </div>

      {/* Last, and fixed above everything: the page starts up behind it. */}
      <LoadingGate />
    </div>
  );
}
