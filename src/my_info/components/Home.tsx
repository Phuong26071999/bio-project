import React, { useEffect } from 'react';
import homeImg from '../../images/about-2.jpg';
import Typed from 'typed.js';
import dataProfile from '../mockData/dataProfile.json';
import '../styles/home.scss';

const Header = () => {

  useEffect(() => {
    const typed = new Typed('.multiple-text', {
      strings: dataProfile.roles,
      typeSpeed: 100,
      backSpeed: 100,
      backDelay: 1000,
      loop: true
    })
    return () => {
      // Destroy Typed instance during cleanup to stop animation
      typed.destroy();
    };
  }, []);

  return (
    <section className="home" id="home">
        <div className="home-content">
            <h3>Hello, it's Me</h3>
            <h1>{dataProfile.name}</h1>
            <h3>And I'm a <span className='multiple-text'></span></h3>
            <p>{dataProfile.summary}</p>
            <div className="social-media">
                {dataProfile.socials.map((s) => (
                  <a key={s.link} href={s.link} target="_blank" rel="noreferrer" aria-label={s.name} title={s.name}>
                    <i className={s.icon} aria-hidden="true"></i>
                  </a>
                ))}
            </div>
            <a href={dataProfile.cv.url} download={dataProfile.cv.fileName} className='btn'>Download CV</a>
        </div>
        <div className="home-img">
          <img src={homeImg} alt={`Portrait of ${dataProfile.name}`} width={1024} height={1536} />
        </div>
    </section>
  );
}

export default Header;
