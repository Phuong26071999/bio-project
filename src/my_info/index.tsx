import React, { useEffect } from 'react';
import About from './components/About';
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
    ScrollReveal({
      // reset: true,
      distance: '80px',
      duration: 2000,
      delay: 200,
    });
    ScrollReveal().reveal('.home-content, .heading', { origin: 'top' });
    ScrollReveal().reveal('.home-img, .services-container, .portfolio-box, .contact form', { origin: 'bottom' });
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
    </div>
  );
}

export default MyInfo;
