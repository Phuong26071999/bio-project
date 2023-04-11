import React from 'react';
import '../styles/contact.scss';

const Contact = () => {
  return (
    <section className="contact" id="contact">
       <h2 className="heading">Contact <span>Me!</span></h2>

       <form action="#">
            <div className="input-box">
                <input type="text" placeholder='Full Name' />
                <input type="email" placeholder='Email Address' />
            </div>
            <div className="input-box">
                <input type="number" placeholder='Mobile Number' />
                <input type="text" placeholder='Email subject' />
            </div>
            <textarea name='' id='' cols={30} rows={10} placeholder="Your message"></textarea>
            <input type="submit" value="Send Message" className='btn' />
       </form>
    </section>
  );
}

export default Contact;
