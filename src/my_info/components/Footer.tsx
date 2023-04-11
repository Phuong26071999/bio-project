import React from 'react';
import '../styles/footer.scss';

const Footer = () => {
  return (
    <footer className="footer">
        <div className="footer-text">
            <p>Copyright &copy; 2023 by HoangPhuong | All Rights Reserved.</p>
        </div>

        <div className="footer-iconTop">
            <a href="#home"><i className='bx bx-up-arrow-alt' ></i></a>
        </div>
    </footer>
  );
}

export default Footer;
