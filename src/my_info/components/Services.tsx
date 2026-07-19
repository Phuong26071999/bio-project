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
                        <span className="services-icon"><i className={item.icon}></i></span>
                        <h3>{item.title}</h3>
                        <div className="skill-tags">
                          {item.skills.map((skill: string) => (
                            <span key={skill} className="skill-tag">{skill}</span>
                          ))}
                        </div>
                    </div>
            )
        })}
        </div>

    </section>
  );
}

export default Services;
