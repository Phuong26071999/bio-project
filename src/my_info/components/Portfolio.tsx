import React from 'react';
import dataPortfolio from '../mockData/dataPortfolio.json'
import image1 from '../../images/PPJ3.jpg';
import image2 from '../../images/PPJ2.png';
import image3 from '../../images/PPJ1.jpg';
import image4 from '../../images/autumnShop.jpg';
import image5 from '../../images/Starbucks.jpg';
import '../styles/portfolio.scss';

const Portfolio = () => {
  return (
    <section className="portfolio" id="projects">
        <h2 className="heading">My <span>Projects</span>
        </h2>
        <div className="portfolio-container">
            {dataPortfolio.map((item: any) => {
                const imgTemp = () => {
                    switch (item.id) {
                        case 1:
                            return image1; 
                        case 2:
                            return image2; 
                        case 3:
                            return image3; 
                        case 4:
                            return image4; 
                        case 5:
                            return image5; 
                        default:
                            break;
                    }
                }
                return (
                    <div key={item.id} className="portfolio-box">
                        <img src={imgTemp()} alt="" />
                        <div className="portfolio-layer">
                            <h4>{item.title}</h4>
                            <p>{item.content}</p>
                            <a href={item.link} target={'_blank'} rel="noreferrer"><i className={item.icon} ></i></a>
                            
                        </div>
                    </div>
                );
            })}
        </div>

    </section>
  );
}

export default Portfolio;
