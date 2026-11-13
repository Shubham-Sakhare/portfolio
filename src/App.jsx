import { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { Bio, education, experiences, projects, skills } from "./data/constants";
import ShubhamPhoto from "./images/Shubham.webp";

const HeroAiCore = lazy(() => import("./components/TechSolarSystem"));

/* ── Typewriter for roles ─────────────────────────────── */
function RoleCycle({ roles }) {
  const [idx, setIdx]     = useState(0);
  const [text, setText]   = useState("");
  const [phase, setPhase] = useState("type"); // "type" | "pause" | "erase"
  const charRef           = useRef(0);

  useEffect(() => {
    const current = roles[idx];
    let timer;
    if (phase === "type") {
      if (charRef.current < current.length) {
        timer = setTimeout(() => {
          setText(current.slice(0, charRef.current + 1));
          charRef.current++;
        }, 72);
      } else {
        timer = setTimeout(() => setPhase("pause"), 1800);
      }
    } else if (phase === "pause") {
      timer = setTimeout(() => setPhase("erase"), 400);
    } else {
      if (charRef.current > 0) {
        timer = setTimeout(() => {
          charRef.current--;
          setText(current.slice(0, charRef.current));
        }, 36);
      } else {
        const next = (idx + 1) % roles.length;
        setIdx(next); setPhase("type");
      }
    }
    return () => clearTimeout(timer);
  }, [phase, text, idx, roles]);

  return (
    <span className="role-typewriter">
      {text}<span className="role-cursor" aria-hidden="true">|</span>
    </span>
  );
}

/* ── Scroll-reveal wrapper ────────────────────────────── */
function Reveal({ children, className = "", delay = 0 }) {
  const ref  = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${vis ? "revealed" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SKILLS CAROUSEL
═══════════════════════════════════════════════ */
function SkillsCarousel() {
  const [activeTab, setActiveTab] = useState(skills.length); // "All" by default
  const trackRef = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);

  const allSkills    = skills.flatMap(g => g.skills);
  const currentSkills = activeTab === skills.length
    ? allSkills
    : skills[activeTab].skills;

  // Check scroll position to show/hide arrows
  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  }, [activeTab, updateArrows]);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <section className="skills-section" id="skills">
      <Reveal>
        <div className="section-header center-header">
          <h2>My Skills</h2>
          <p>Technologies and tools I work with</p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="skill-tabs">
          {skills.map((group, i) => (
            <button
              key={group.title}
              className={`skill-tab${activeTab === i ? " skill-tab--active" : ""}`}
              onClick={() => setActiveTab(i)}
              type="button"
            >
              {group.title}
            </button>
          ))}
          <button
            className={`skill-tab${activeTab === skills.length ? " skill-tab--active" : ""}`}
            onClick={() => setActiveTab(skills.length)}
            type="button"
          >
            All
          </button>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <div className="skill-carousel-wrap">
          {/* Left arrow */}
          <button
            className={`skill-arrow skill-arrow--left${canLeft ? "" : " skill-arrow--hidden"}`}
            onClick={() => scroll(-1)}
            aria-label="Scroll skills left"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Scrollable track */}
          <div className="skill-track" ref={trackRef}>
            {currentSkills.map((skill, i) => (
              <div className="skill-card" key={`${skill.name}-${i}`}>
                <div className="skill-card-icon-wrap">
                  <img src={skill.image} alt={skill.name} />
                </div>
                <span>{skill.name}</span>
              </div>
            ))}
          </div>

          {/* Right arrow */}
          <button
            className={`skill-arrow skill-arrow--right${canRight ? "" : " skill-arrow--hidden"}`}
            onClick={() => scroll(1)}
            aria-label="Scroll skills right"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   APP
═══════════════════════════════════════════════ */
export default function App() {
  const [showAllProjects, setShowAllProjects] = useState(false);

  const displayedProjects = showAllProjects ? projects : projects.slice(0, 3);

  return (
    <div className="portfolio-app">
      {/* ── Navbar ──────────────────────────────── */}
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
          <a href="#contact">Contact</a>
        </nav>

        <div className="nav-right">
          {/* GitHub icon */}
          <a href={Bio.github} target="_blank" rel="noreferrer" className="nav-icon-btn" aria-label="GitHub">
            <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
          {/* LinkedIn icon */}
          <a href={Bio.linkedin} target="_blank" rel="noreferrer" className="nav-icon-btn" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="19" height="19">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a className="nav-button" href={Bio.resume} target="_blank" rel="noreferrer">
            Resume <span>↗</span>
          </a>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section className="hero-section" id="about">
        <Suspense fallback={<div className="hero-scene-wrap hero-ai-loading" aria-hidden="true" />}>
          <div className="hero-scene-wrap"><HeroAiCore /></div>
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
            I am a&nbsp;<span className="role-static">Software Engineer</span>
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

        <div className="hero-bottom-fade" aria-hidden="true" />
      </section>

      <main className="page-shell">

        {/* ── Skills ──────────────────────────────── */}
        <SkillsCarousel />

        {/* ── About ───────────────────────────────── */}
        <section className="about-section" id="about-me">
          <Reveal>
            <div className="about-visual">

              {/* ── LinkedIn-style ID Card ── */}
              <div className="linkedin-card">
                {/* gloss overlay */}
                <div className="lc-gloss" aria-hidden="true" />

                {/* header bar */}
                <div className="lc-header">
                  <svg className="lc-li-icon" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="lc-header-label">Professional Network ID</span>
                </div>

                {/* profile row */}
                <div className="lc-profile">
                  <div className="lc-avatar-wrap">
                    <img src={ShubhamPhoto} alt="Shubham Sakhare" className="lc-avatar" />
                    <span className="lc-online-dot" aria-label="Online" />
                  </div>
                  <div className="lc-profile-info">
                    <h3 className="lc-name">{Bio.name}</h3>
                    <span className="lc-connections">500+ Connections</span>
                  </div>
                </div>

                {/* role */}
                <p className="lc-role">Web &amp; WordPress Developer</p>

                {/* detail rows */}
                <div className="lc-details">
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Location</span>
                    <span className="lc-detail-val">Nanded, India</span>
                  </div>
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Experience</span>
                    <span className="lc-detail-val">3+ Years</span>
                  </div>
                  <div className="lc-detail-row">
                    <span className="lc-detail-key">Projects</span>
                    <span className="lc-detail-val">10+ Delivered</span>
                  </div>
                </div>

                {/* CTA */}
                <a
                  href={Bio.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="lc-connect-btn"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Connect on LinkedIn
                </a>

                {/* QR placeholder — scan goes to LinkedIn */}
                <a
                  href={Bio.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="lc-qr-wrap"
                  aria-label="Scan to open LinkedIn profile"
                >
                  <svg viewBox="0 0 100 100" width="52" height="52" fill="currentColor" opacity="0.85">
                    {/* QR code SVG pattern */}
                    <rect x="5"  y="5"  width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="5"/>
                    <rect x="14" y="14" width="12" height="12" rx="1"/>
                    <rect x="65" y="5"  width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="5"/>
                    <rect x="74" y="14" width="12" height="12" rx="1"/>
                    <rect x="5"  y="65" width="30" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="5"/>
                    <rect x="14" y="74" width="12" height="12" rx="1"/>
                    <rect x="45" y="5"  width="8"  height="8"/>
                    <rect x="45" y="17" width="8"  height="8"/>
                    <rect x="57" y="5"  width="8"  height="8"/>
                    <rect x="45" y="45" width="8"  height="8"/>
                    <rect x="57" y="45" width="8"  height="8"/>
                    <rect x="69" y="45" width="8"  height="8"/>
                    <rect x="81" y="45" width="14" height="8"/>
                    <rect x="45" y="57" width="8"  height="8"/>
                    <rect x="69" y="57" width="8"  height="8"/>
                    <rect x="81" y="57" width="8"  height="8"/>
                    <rect x="57" y="69" width="8"  height="8"/>
                    <rect x="69" y="69" width="8"  height="8"/>
                    <rect x="81" y="69" width="14" height="14"/>
                    <rect x="45" y="81" width="8"  height="14"/>
                    <rect x="57" y="81" width="8"  height="8"/>
                  </svg>
                  <span>Scan to connect</span>
                </a>
              </div>

            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="about-content">
              <div className="section-header left-header">
                <h2>About Me</h2>
                <p>Passionate developer crafting premium web experiences</p>
              </div>

              <p className="about-desc">{Bio.description}</p>

              {/* Stats row */}
              <div className="about-metrics">
                <div className="metric-box">
                  <div className="metric-icon-wrap">
                    <span className="metric-emoji">🚀</span>
                  </div>
                  <div className="metric-text">
                    <strong>4+</strong>
                    <small>Years of Experience</small>
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-icon-wrap green">
                    <span className="metric-emoji">✦</span>
                  </div>
                  <div className="metric-text">
                    <strong>30+</strong>
                    <small>Projects Delivered</small>
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-icon-wrap pink">
                    <span className="metric-emoji">♥</span>
                  </div>
                  <div className="metric-text">
                    <strong>100%</strong>
                    <small>Client Satisfaction</small>
                  </div>
                </div>
              </div>

              {/* skill highlight tags */}
              <div className="about-tags">
                {["WordPress", "React", "PHP", "JavaScript", "WooCommerce", "SEO", "Elementor", "MySQL"].map(t => (
                  <span key={t} className="about-tag">{t}</span>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="about-cta">
                <a className="primary-btn" href={Bio.linkedin} target="_blank" rel="noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Connect on LinkedIn
                </a>
                <a className="secondary-btn" href={Bio.resume} target="_blank" rel="noreferrer">
                  Download Resume ↗
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Experience ──────────────────────────── */}
        <section className="experience-section" id="experience">
          <Reveal>
            <div className="section-header center-header">
              <h2>My Experience</h2>
              <p>Where I've worked and what I've built</p>
            </div>
          </Reveal>

          <div className="exp-wrapper">
            {experiences.map((job, i) => (
              <Reveal key={job.id} delay={i * 90}>
                <div className={`exp-item exp-item--${i % 2 === 0 ? "left" : "right"}`}>

                  {/* index number */}
                  <div className="exp-index">{String(i + 1).padStart(2,"0")}</div>

                  {/* connector dot on timeline */}
                  <div className="exp-node">
                    <div className="exp-node-inner" />
                    <div className="exp-node-ping" />
                  </div>

                  {/* card */}
                  <article className="exp-flip-card">
                    {/* glow border top */}
                    <div className={`exp-flip-bar exp-bar-${i}`} />

                    {/* logo + meta row */}
                    <div className="exp-flip-top">
                      <div className="exp-flip-logo">
                        <img src={job.img} alt={job.company} />
                      </div>
                      <div>
                        <span className={`exp-status-pill exp-status-${i}`}>
                          {i === 0 ? "● Current" : "✓ Completed"}
                        </span>
                        <p className="exp-flip-company">{job.company}</p>
                      </div>
                    </div>

                    {/* role headline */}
                    <h3 className="exp-flip-role">{job.role}</h3>

                    {/* duration */}
                    <div className="exp-flip-duration">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      {job.date}
                    </div>

                    {/* description */}
                    <p className="exp-flip-desc">{job.desc}</p>

                    {/* skill chips */}
                    {job.skills?.length > 0 && (
                      <div className="exp-chip-wrap">
                        <div className="exp-chip-label">Tech Stack</div>
                        <div className="exp-chips">
                          {job.skills.map(s => (
                            <span key={s} className="exp-chip">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              </Reveal>
            ))}

            {/* vertical centre line */}
            <div className="exp-vline" aria-hidden="true" />
          </div>
        </section>

        {/* ── Education ───────────────────────────── */}
        <section className="education-section" id="education">
          <Reveal>
            <div className="section-header center-header">
              <h2>Education</h2>
              <p>My academic background</p>
            </div>
          </Reveal>

          <div className="edu-grid">
            {education.map((item, i) => (
              <Reveal key={item.id} delay={i * 100}>
                <div className="edu-card">
                  <div className="edu-card-left">
                    <div className="edu-logo">
                      <img src={item.img} alt={item.collage} />
                    </div>
                    <div className="edu-grade-badge">
                      Grade&nbsp;<strong>{item.grade}</strong>
                    </div>
                  </div>
                  <div className="edu-card-body">
                    <span className="edu-degree">{item.degree}</span>
                    <h3 className="edu-college">{item.collage}</h3>
                    <span className="edu-date">{item.date}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Projects ────────────────────────────── */}
        <section className="projects-section" id="projects">
          <Reveal>
            <div className="section-header center-header">
              <h2>My Projects</h2>
              <p>A collection of real-world work I've shipped</p>
            </div>
          </Reveal>

          <div className="project-grid">
            {displayedProjects.map((project, i) => (
              <Reveal key={project.id} delay={(i % 3) * 80}>
                <article className="project-card">
                  <div className="project-img-wrap">
                    <img src={project.image} alt={project.title} />
                    <div className="project-overlay">
                      {project.webapp && (
                        <a
                          href={project.webapp}
                          target="_blank"
                          rel="noreferrer"
                          className="project-live-btn"
                        >
                          Live Demo →
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="project-body">
                    <div className="project-tags">
                      {project.tags.slice(0, 3).map(tag => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="project-actions">
                      {project.webapp && (
                        <a href={project.webapp} target="_blank" rel="noreferrer" className="proj-action-btn proj-action-btn--primary">
                          Live Site <span>↗</span>
                        </a>
                      )}
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noreferrer" className="proj-action-btn proj-action-btn--ghost">
                          Code <span>↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {!showAllProjects && projects.length > 3 && (
            <div className="project-load-more">
              <button
                type="button"
                className="load-more-btn"
                onClick={() => setShowAllProjects(true)}
              >
                View All {projects.length} Projects <span>↓</span>
              </button>
            </div>
          )}
        </section>

        {/* ── Contact ─────────────────────────────── */}
        <section className="contact-section" id="contact">
          <Reveal>
            <div className="contact-inner">
              <div className="contact-text">
                <h2>Let's Work Together</h2>
                <p>Have a project in mind? I'd love to help you build something great.</p>
                <div className="contact-links">
                  <a href={`mailto:sakhareshubham588@gmail.com`} className="contact-link">
                    <span className="contact-link-icon">✉</span>
                    sakhareshubham588@gmail.com
                  </a>
                  <a href={Bio.linkedin} target="_blank" rel="noreferrer" className="contact-link">
                    <span className="contact-link-icon">in</span>
                    LinkedIn Profile
                  </a>
                </div>
              </div>
              <div className="contact-cta">
                <a className="primary-btn contact-btn" href={Bio.linkedin} target="_blank" rel="noreferrer">
                  Get in Touch <span>→</span>
                </a>
                <a className="secondary-btn contact-btn" href={Bio.resume} target="_blank" rel="noreferrer">
                  Download Resume
                </a>
              </div>
            </div>
          </Reveal>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand-mark">S</div>
            <div>
              <strong>{Bio.name}</strong>
              <small>Web &amp; WordPress Developer</small>
            </div>
          </div>

          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="#about">Home</a>
            <a href="#skills">Skills</a>
            <a href="#experience">Experience</a>
            <a href="#education">Education</a>
            <a href="#projects">Projects</a>
          </nav>

          <div className="socials">
            <a href={Bio.github}   target="_blank" rel="noreferrer" aria-label="GitHub">GH</a>
            <a href={Bio.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">IN</a>
          </div>
        </div>

        <div className="footer-meta">
          <span>© {new Date().getFullYear()} Shubham Sakhare. All rights reserved.</span>
          <span>Built with React &amp; Three.js ♥</span>
        </div>
      </footer>
    </div>
  );
}
