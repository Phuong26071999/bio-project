import React from 'react';
import aboutImg from '../../images/about.jpg';
import '../styles/about.scss';

const About = () => {

  const listAbout = [
    'Building the front end, building the brand',
    'Creating a user experience like no other',
    'Empowering your website to achieve greatness',
  ];

  return (
    <section className="about" id="about">
        <div className="about-img">
            <img src={aboutImg} alt="img-about" />
        </div>
        <div className="about-content">
            <h2 className="heading">About <span>Me</span></h2>
            <h3>Frontend Developer!</h3>
            <ul className='boxDetailAbout'>
              {listAbout.map((item: string) => {
                return (<li key={item}>{item}</li>)
              })}
            </ul>
            <a href="# " className="btn">Read More</a>            
        </div>
    </section>
  );
}

export default About;
