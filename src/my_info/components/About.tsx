import React from "react";
import aboutImg from "../../images/about-img.jpg";
import dataProfile from "../mockData/dataProfile.json";
import "../styles/about.scss";

const About = () => {
  const { experiences, education } = dataProfile;

  return (
    <section className="about" id="about">
      <div className="about-img">
        <img src={aboutImg} alt="img-about" />
      </div>
      <div className="about-content">
        <h2 className="heading">
          About <span>Me</span>
        </h2>
        <h3>{dataProfile.title}</h3>
        <p className="about-intro">{dataProfile.aboutIntro}</p>

        <div className="about-blocks">
          <div className="about-block">
            <h4>
              <i className="bx bxs-briefcase"></i> Experience
            </h4>
            <ul className="about-exp">
              {experiences.map((exp) => (
                <li key={exp.company}>
                  <strong>{exp.company}</strong> &middot; {exp.role}
                  <span>{exp.period}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="about-block">
            <h4>
              <i className="bx bxs-graduation"></i> Education
            </h4>
            <p>
              <strong>{education.school}</strong>
            </p>
            <span>
              {education.degree} &middot; {education.period}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
