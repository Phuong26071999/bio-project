import React, { useEffect, useState } from 'react';
import dataPortfolio from '../mockData/dataPortfolio.json'
import '../styles/portfolio.scss';

const Portfolio = () => {
  const [selected, setSelected] = useState<any | null>(null);

  const openModal = (item: any) => setSelected(item);
  const closeModal = () => setSelected(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    if (selected) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  return (
    <section className="portfolio" id="projects">
        <h2 className="heading">My <span>Projects</span>
        </h2>
        <div className="portfolio-container">
            {dataPortfolio.map((item: any) => {
                return (
                    <div key={item.id} className="portfolio-box" onClick={() => openModal(item)}>
                        <div className="portfolio-head">
                            <h4>{item.title}</h4>
                            {item.link && item.link !== '#' && (
                                <a
                                  href={item.link}
                                  target={'_blank'}
                                  rel="noreferrer"
                                  aria-label={`Open ${item.title}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                    <i className='bx bx-link-external'></i>
                                </a>
                            )}
                        </div>
                        <span className="portfolio-meta">{item.company} &middot; {item.period}</span>
                        <p>{item.content}</p>
                        <div className="portfolio-tech">
                            {item.tech.map((t: string) => (
                                <span key={t} className="tech-tag">{t}</span>
                            ))}
                        </div>
                        <button
                          type="button"
                          className="portfolio-detail-btn"
                          onClick={(e) => { e.stopPropagation(); openModal(item); }}
                        >
                          View details <i className='bx bx-right-arrow-alt'></i>
                        </button>
                    </div>
                );
            })}
        </div>

        {selected && (
          <div className="project-modal-overlay" onClick={closeModal}>
            <div className="project-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="project-modal-close" onClick={closeModal} aria-label="Close">
                <i className='bx bx-x'></i>
              </button>

              <div className="project-modal-body">
                <h3 className="project-modal-title">{selected.title}</h3>
                <span className="project-modal-meta">{selected.company} &middot; {selected.period}</span>

                {selected.link && selected.link !== '#' && (
                  <a className="project-modal-link" href={selected.link} target={'_blank'} rel="noreferrer">
                    <i className='bx bx-link-external'></i> {selected.link}
                  </a>
                )}

                <h4 className="project-modal-subhead">Description</h4>
                <p className="project-modal-desc">{selected.description}</p>

                {selected.responsibilities && (
                  <>
                    <h4 className="project-modal-subhead">Main responsibilities</h4>
                    <ul className="project-modal-list">
                      {selected.responsibilities.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </>
                )}

                <h4 className="project-modal-subhead">Technologies</h4>
                <div className="project-modal-tech">
                  {selected.tech.map((t: string) => (
                    <span key={t} className="tech-tag">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}

export default Portfolio;
