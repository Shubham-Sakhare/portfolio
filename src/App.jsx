import { lazy, Suspense } from "react";
import "./App.css";
import {
  Bio,
  education,
  experiences,
  projects,
  skills,
} from "./data/constants";

const roleText = "Frontend Developer";
const HeroAiCore = lazy(() => import("./components/SolarSystemHero"));

function App() {
  return (
    <div className="portfolio-app">
      <div className="bg-orb orb-one" />
      <div className="bg-orb orb-two" />
      <div className="bg-orb orb-three" />

      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">S</div>
          <span className="brand-name">{Bio.name}</span>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#about">Home</a>
          <a href="#skills">Skills</a>
          <a href="#experience">Experience</a>
          <a href="#education">Education</a>
          <a href="#projects">Projects</a>
        </nav>

        <a className="nav-button" href={Bio.github} target="_blank" rel="noreferrer">
          Get in Touch <span>↗</span>
        </a>
      </header>

      <main className="page-shell">
        <section className="hero-section" id="about">
          <Suspense fallback={<div className="hero-ai-scene hero-ai-backdrop hero-ai-loading" aria-hidden="true" />}>
            <HeroAiCore />
          </Suspense>
          <div className="hero-copy">
            <span className="availability-pill">
              <span className="dots" />
              Available for work
            </span>

            <h1 className="hero-title">
              Hi, I am
              <span className="highlight-block">{Bio.name}</span>
            </h1>

            <p className="role-row">
              I am a <span>{roleText}</span>
            </p>

            <p className="hero-description">{Bio.description}</p>

            <div className="cta-row">
              <a className="primary-btn" href="#projects">
                View My Projects <span>→</span>
              </a>
              <a className="secondary-btn" href={Bio.resume} target="_blank" rel="noreferrer">
                Download Resume
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true" />
        </section>

        <section className="skills-section" id="skills">
          <div className="section-header center-header">
            <h2>My Skills</h2>
            <p>Here are some of my skills and technologies</p>
          </div>

          <div className="skill-grid">
            {skills.flatMap((group) => group.skills).map((skill, index) => (
              <div className="skill-card" key={`${skill.name}-${index}`}>
                <img src={skill.image} alt={skill.name} />
                <span>{skill.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section" id="about-me">
          <div className="about-visual">
            <div className="about-frame">
              <div className="profile-figure">
                <div className="head" />
                <div className="body" />
              </div>
            </div>
            <div className="about-quote">Dream Big...<br />Build Better</div>
          </div>

          <div className="about-content">
            <div className="section-header left-header">
              <h2>About Me</h2>
            </div>

            <p>{Bio.description}</p>

            <div className="about-metrics">
              <div className="metric-box">
                <span className="metric-icon">◌</span>
                <strong>3+</strong>
                <small>Years of Experience</small>
              </div>
              <div className="metric-box">
                <span className="metric-icon check">✓</span>
                <strong>10+</strong>
                <small>Completed Projects</small>
              </div>
              <div className="metric-box">
                <span className="metric-icon heart">❤</span>
                <strong>100%</strong>
                <small>Dedication</small>
              </div>
            </div>
          </div>
        </section>

        <section className="experience-section" id="experience">
          <div className="section-header center-header">
            <h2>My Experience</h2>
            <p>My work experience as a software Developer</p>
          </div>

          <div className="experience-grid">
            {experiences.map((job) => (
              <article className="experience-card" key={job.id}>
                <div className="experience-badge" />
                <div className="experience-top">
                  <div className="company-mark">
                    <img src={job.img} alt={job.company} />
                  </div>
                  <div>
                    <h3>{job.role}</h3>
                    <span>{job.company}</span>
                  </div>
                </div>
                <p>{job.desc}</p>
                <small>{job.date}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="bottom-panel">
          <div className="education-block" id="education">
            <div className="section-header left-header">
              <h2>Education</h2>
            </div>

            <div className="edu-list">
              {education.map((item) => (
                <div className="edu-item" key={item.id}>
                  <div className="edu-icon">🎓</div>
                  <div>
                    <h3>{item.degree}</h3>
                    <p>{item.collage}</p>
                    <small>{item.date}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="projects-block" id="projects">
            <div className="projects-head">
              <div className="section-header left-header">
                <h2>My Projects</h2>
                <p>A collection of projects that showcase my skills and creativity.</p>
              </div>
              <a href="#projects" className="mini-btn">View All Projects →</a>
            </div>

            <div className="project-grid">
              {projects.slice(0, 3).map((project) => (
                <article className="project-card" key={project.id}>
                  <img src={project.image} alt={project.title} />
                  <div className="project-tags">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand-mark">S</div>
            <div>
              <strong>{Bio.name}</strong>
              <small>Frontend Developer</small>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="#about">About</a>
            <a href="#skills">Skills</a>
            <a href="#experience">Experience</a>
            <a href="#education">Education</a>
            <a href="#projects">Projects</a>
          </nav>

          <div className="socials">
            <a href={Bio.github} target="_blank" rel="noreferrer">GH</a>
            <a href={Bio.linkedin} target="_blank" rel="noreferrer">IN</a>
            <a href={Bio.github} target="_blank" rel="noreferrer">X</a>
          </div>
        </div>

        <div className="footer-meta">
          <span>© 2024 Shubham Sakhare. All rights reserved.</span>
          <span>Made with ♥ for a better web</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
