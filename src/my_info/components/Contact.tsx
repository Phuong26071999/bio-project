import React from "react";
import "../styles/contact.scss";

const Contact = () => {
  const contactItems = [
    {
      icon: "bx bxs-phone",
      label: "Phone",
      value: "0932 550 587",
      link: "tel:+84932550587",
    },
    {
      icon: "bx bxs-envelope",
      label: "Email",
      value: "thhphuong2607@gmail.com",
      link: "mailto:thhphuong2607@gmail.com",
    },
    {
      icon: "bx bxs-map",
      label: "Location",
      value: "Ho Chi Minh City, Vietnam",
      link: "",
    },
  ];

  const socials = [
    { icon: "bx bxl-facebook", link: "https://www.facebook.com/Nemo07/" },
    { icon: "bx bxl-github", link: "https://github.com/Phuong26071999" },
    {
      icon: "bx bxl-linkedin",
      link: "https://www.linkedin.com/in/truonghaihoangphuong/",
    },
    {
      icon: "bx bxl-instagram-alt",
      link: "https://www.instagram.com/ctain_nemo/",
    },
  ];

  return (
    <section className="contact" id="contact">
      <h2 className="heading">
        Contact <span>Me!</span>
      </h2>

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
