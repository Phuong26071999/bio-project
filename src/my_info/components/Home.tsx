import React, { useEffect } from 'react';
import homeImg from '../../images/about-2.png';
import Typed from 'typed.js';
import '../styles/home.scss';

const Header = () => {

  useEffect(() => {
    const typed = new Typed('.multiple-text', {
      strings: ['Frontend Developer', 'React Developer', 'Software Engineer'],
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
            <h1>Hoang Phuong</h1>
            <h3>And I'm a <span className='multiple-text'></span></h3>
            <p>Frontend Developer with 4+ years of experience building scalable web
            applications with React, Next.js and TypeScript. Passionate about clean code,
            great user experiences and continuously learning new technologies.
            </p>
            <div className="social-media">
                <a href="https://www.facebook.com/Nemo07/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-facebook' ></i></a>
                <a href="https://github.com/Phuong26071999" target={'_blank'}  rel="noreferrer"  ><i className='bx bxl-github'></i></a>
                <a href="https://www.instagram.com/ctain_nemo/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-instagram-alt' ></i></a>
                <a href="https://www.linkedin.com/in/truonghaihoangphuong/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-linkedin' ></i></a>
            </div>
            <a href='TruongHaiHoangPhuong.pdf' download='TruongHaiHoangPhuong.pdf' className='btn'>Download CV</a>
        </div>
        <div className="home-img">
          <img src={homeImg} alt="" />
        </div>
    </section>
  );
}

export default Header;
