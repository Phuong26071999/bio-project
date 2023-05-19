import React, { useEffect, useMemo, useState } from 'react';
import '../styles/header.scss';

const Header = () => {

  const [flagActive, setFlagActive] = useState<string>('Home');
  const [flagSroll, setFlagSroll] = useState<string>('');
  const [openMenu, setOpenMenu] = useState<boolean>(false);

  const handleActiveSection: any = (value: string) => {
    setFlagActive(value);
    setOpenMenu(false);
  }

  const handleScroll = () => {
    const position = window.pageYOffset;
    const temp = position > 100 ? ' sticky' : '';
    setFlagSroll(temp);
  }

  const hanldeOpenMenu = () => {
    setOpenMenu(!openMenu);
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }, []);


  return (
    <div className={`coverHeader${flagSroll}`}>
      <a href='# ' className="logo">Portfolio</a>

      {openMenu ? (<i onClick={() => hanldeOpenMenu()} className='bx bx-x' id="menu-icon"></i>) : (<i onClick={() => hanldeOpenMenu()} className='bx bx-menu' id="menu-icon"></i>)}

      {window.innerWidth <= 768 ? (
        openMenu && (<nav className='navbar'>
        <a href="#home" onClick={() => handleActiveSection('Home')} className={flagActive === 'Home' ? 'active' : ''}>Home</a>
        <a href="#about" onClick={() => handleActiveSection('About')} className={flagActive === 'About' ? 'active' : ''}>About</a>
        <a href="#skills" onClick={() => handleActiveSection('Skills')} className={flagActive === 'Skills' ? 'active' : ''}>Skills</a>
        <a href="#projects" onClick={() => handleActiveSection('Projects')} className={flagActive === 'Projects' ? 'active' : ''}>Projects</a>
        <a href="#contact" onClick={() => handleActiveSection('Contact')} className={flagActive === 'Contact' ? 'active' : ''}>Contact</a>
      </nav>)
      ) : (<nav className='navbar'>
      <a href="#home" onClick={() => handleActiveSection('Home')} className={flagActive === 'Home' ? 'active' : ''}>Home</a>
      <a href="#about" onClick={() => handleActiveSection('About')} className={flagActive === 'About' ? 'active' : ''}>About</a>
      <a href="#skills" onClick={() => handleActiveSection('Skills')} className={flagActive === 'Skills' ? 'active' : ''}>Skills</a>
      <a href="#projects" onClick={() => handleActiveSection('Projects')} className={flagActive === 'Projects' ? 'active' : ''}>Projects</a>
      <a href="#contact" onClick={() => handleActiveSection('Contact')} className={flagActive === 'Contact' ? 'active' : ''}>Contact</a>
    </nav>)}

    </div>
  );
}

export default Header;
