import React from 'react';
import dataServices from '../mockData/dataServices.json';
import '../styles/services.scss';

const Services = () => {
  return (
    <section className="services" id="skills">
        <h2 className="heading">My <span>Skills</span></h2>
        <div className="services-container">
        {dataServices.map((item: any) => {
            return (
                    <div key={item.id} className="services-box">
                        <i className={item.icon}></i>
                        <h3>{item.title}</h3>
                        <p>{item.content}</p>
                        <a href={item.link} target={'_blank'} className='btn' rel="noreferrer">Read More</a>
                    </div>
            )
        })}
        </div>

    </section>
  );
}

export default Services;
