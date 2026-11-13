import React, { useEffect } from 'react';
import About from './components/About';
import AIChatbot from './components/AIChatbot';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './components/Home';
import Portfolio from './components/Portfolio';
import Services from './components/Services';
import ScrollReveal from 'scrollreveal';
import './styles/index.scss';

const MyInfo = () => {
  useEffect(() => {
    // Content stays fully visible for visitors who prefer reduced motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ScrollReveal({
      // reset: true,
      distance: '40px',
      duration: 800,
      delay: 100,
    });
    ScrollReveal().reveal('.home-content, .heading', { origin: 'top' });
    ScrollReveal().reveal('.home-img, .services-container, .portfolio-box', { origin: 'bottom' });
    // contact reveals in order: heading (100) -> mascot -> cards -> socials
    ScrollReveal().reveal('.contact-mascot', { origin: 'bottom', delay: 200 });
    ScrollReveal().reveal('.contact-info', { origin: 'bottom', delay: 300 });
    ScrollReveal().reveal('.contact-social', { origin: 'bottom', delay: 400 });
    ScrollReveal().reveal('.home-content h1, .about-img', { origin: 'left' });
    ScrollReveal().reveal('.home-content p, .about-content', { origin: 'right' });
  }, []);
  return (
    <div className="boxLayout">
      <Header />
      <Home />
      <About />
      <Services />
      <Portfolio />
      <Contact />
      <Footer />
      <AIChatbot />
    </div>
  );
}

export default MyInfo;
