import React from 'react';
import dataPortfolio from '../mockData/dataPortfolio.json'
import image1 from '../../images/image1.jpg';
import image2 from '../../images/image2.jpg';
import image3 from '../../images/image3.jpg';
import image4 from '../../images/image4.jpg';
import image5 from '../../images/image5.jpg';
import image6 from '../../images/image6.jpg';
import '../styles/portfolio.scss';

const Portfolio = () => {
  return (
    <section className="portfolio" id="portfolio">
        <h2 className="heading">
            Latest
            <span>Project</span>
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
                        case 6:
                            return image6; 
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
                            <a href="# "><i className={item.icon} ></i></a>
                            
                        </div>
                    </div>
                );
            })}
        </div>

    </section>
  );
}

export default Portfolio;
