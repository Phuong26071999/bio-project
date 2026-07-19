import React from "react";
import aboutImg from "../../images/about-img.jpg";
import "../styles/about.scss";

const About = () => {
  const experiences = [
    { company: "Xsofts POS", role: "Frontend Developer", period: "2024 – Now" },
    {
      company: "Tera Solutions",
      role: "Frontend Developer",
      period: "2022 – 2024",
    },
    {
      company: "Mor Software",
      role: "Frontend Developer",
      period: "2022 – 2023",
    },
  ];

  return (
    <section className="about" id="about">
      <div className="about-img">
        <img src={aboutImg} alt="img-about" />
      </div>
      <div className="about-content">
        <h2 className="heading">
          About <span>Me</span>
        </h2>
        <h3>Frontend Developer</h3>
        <p className="about-intro">
          I focus on building clean, responsive and maintainable user
          interfaces. I keep improving my skills and stay open to new
          technologies and methodologies to meet the changing needs of the
          industry.
        </p>

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
              <strong>Saigon Technology University</strong>
            </p>
            <span>Software Engineer &middot; 2017 – 2021</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
