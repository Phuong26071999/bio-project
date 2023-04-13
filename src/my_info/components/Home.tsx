import React, { useEffect } from 'react';
import homeImg from '../../images/HoangPhuong.jpg';
import Typed from 'typed.js';
import '../styles/home.scss';

const Header = () => {

  useEffect(() => {
    const typed = new Typed('.multiple-text', {
      strings: ['Frontend Developer', 'Younger', 'Technology Enthusiast'],
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
            <p>Welcome to my portfolio! You can click on the "Download CV" button below to get more information about me. I hope you enjoy it and have a good day. 
            </p>
            <div className="social-media">
                <a href="https://www.facebook.com/Nemo07/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-facebook' ></i></a>
                <a href="# " target={'_blank'}  rel="noreferrer"  ><i className='bx bxl-twitter'></i></a>
                <a href="https://www.instagram.com/ctain_nemo/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-instagram-alt' ></i></a>
                <a href="https://www.linkedin.com/in/truonghaihoangphuong/" target={'_blank'} rel="noreferrer" ><i className='bx bxl-linkedin' ></i></a>
            </div>
            <a href='TRUONG_HAI_HOANG_PHUONG_FRONT_END_CV.pdf' download='TRUONG_HAI_HOANG_PHUONG_FRONT_END_CV.pdf' className='btn'>Download CV</a>
        </div>
        <div className="home-img">
          <img src={homeImg} alt="" />
        </div>
    </section>
  );
}

export default Header;
