import React from "react";
import { Mascot } from "page-mascot";
import dataProfile from "../mockData/dataProfile.json";
import "../styles/contact.scss";

const Contact = () => {
  const { contactItems, socials } = dataProfile;

  return (
    <section className="contact" id="contact">
      <h2 className="heading">
        Contact <span>Me!</span>
      </h2>

      <div className="contact-mascot">
        <Mascot
          directions="/mascots/cat-directions.webp"
          reactions="/mascots/cat-reactions.webp"
          size={150}
          label="Mascot mèo"
        />
      </div>

      <div className="contact-info">
        {contactItems.map((item) => {
          const inner = (
            <>
              <i className={item.icon}></i>
              <div className="contact-detail">
                <h4>{item.label}</h4>
                <p>{item.value}</p>
              </div>
            </>
          );
          return item.link ? (
            <a key={item.label} href={item.link} className="contact-card">
              {inner}
            </a>
          ) : (
            <div key={item.label} className="contact-card">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="contact-social">
        {socials.map((s) => (
          <a key={s.link} href={s.link} target="_blank" rel="noreferrer">
            <i className={s.icon}></i>
          </a>
        ))}
      </div>
    </section>
  );
};

export default Contact;
