import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, HeartHandshake, Menu, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";
import "@/App.css";
import { copy, locations, resolveLocation } from "@/data/siteConfig";
import AdminMedia from "@/pages/AdminMedia";
import AdminStories from "@/pages/AdminStories";
import { StoriesList, StoryDetail } from "@/pages/Stories";

function Header({ location, lang, setLang }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const navigate = useNavigate();
  const t = copy[lang];
  const basePath = location.slug === "mathura" ? "" : `/${location.slug}`;
  const nav = [[basePath || "/", t.nav[0]], [`${basePath}/about`, t.nav[1]], ["/stories", t.journal], ["/#work", t.nav[2]], ["/#contact", t.nav[3]]];
  const selectLocation = (slug) => { setLocationOpen(false); navigate(slug === "mathura" ? "/" : `/${slug}`); };
  return <>
    <div className="topline"><span>जय महावर समाज</span><span>{t.locationNote} <strong>{location.city}</strong></span></div>
    <header className="site-header">
      <Link className="brand" to={location.slug === "mathura" ? "/" : `/${location.slug}`} data-testid="site-brand-link">
        <span className="brand-mark">ॐ</span><span><b>Mahawar</b><small> SABHA · {location.city.toUpperCase()}</small></span>
      </Link>
      <nav className={`nav-links ${menuOpen ? "is-open" : ""}`} data-testid="main-navigation">
        {nav.map(([href, label], index) => <Link key={href} to={href} onClick={() => setMenuOpen(false)} data-testid={`nav-link-${index}`}>{label}</Link>)}
        <Link to="/admin" className="admin-link" onClick={() => setMenuOpen(false)} data-testid="admin-space-link"><ShieldCheck size={15} /> {t.admin}</Link>
      </nav>
      <div className="header-actions">
        <button className="language-button" onClick={() => setLang(lang === "en" ? "hi" : "en")} data-testid="language-toggle" aria-label="Change language">Aa <span>{t.language}</span></button>
        <div className="location-menu"><button className="location-button" onClick={() => setLocationOpen(!locationOpen)} data-testid="location-switcher">{location.city}<ChevronDown size={15} /></button>
          {locationOpen && <div className="location-popover" data-testid="location-options">{Object.values(locations).map(item => <button key={item.slug} onClick={() => selectLocation(item.slug)} data-testid={`location-option-${item.slug}`}><span>{item.city}</span><small>{item.name}</small></button>)}</div>}
        </div>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} data-testid="mobile-menu-toggle" aria-label="Open menu">{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>
  </>;
}

function Footer({ location, lang }) { const t = copy[lang]; return <footer id="contact" className="footer"><div><span className="footer-om">ॐ</span><h3>Mahawar Sabha</h3><p>{t.footer}</p></div><div className="footer-contact"><span>CONNECT WITH US</span><strong>{location.phone}</strong><a href="mailto:hello@mahawarsabha.org" data-testid="footer-email-link">hello@mahawarsabha.org</a></div><div className="footer-bottom">© 2025 Mahawar Sabha · {location.city} <span>Made with seva & care</span></div></footer>; }

function Home({ location, lang }) {
  const t = copy[lang];
  return <main>
    <section className="hero" style={{ "--hero": `url(${location.heroImage})` }}><div className="hero-wash" /><div className="hero-content"><div className="eyebrow"><Sparkles size={15} /> {t.eyebrow}</div><h1 data-testid="hero-heading">{t.welcome}<br /><em>{location.city} Sabha</em></h1><p data-testid="hero-description">{location.description}</p><div className="hero-actions"><Link className="primary-button" to={location.slug === "mathura" ? "/about" : `/${location.slug}/about`} data-testid="hero-explore-button">{t.cta} <ArrowRight size={17} /></Link><a className="text-link" href="#work" data-testid="hero-story-link">{t.storyCta} <span>↗</span></a></div></div><div className="hero-caption"><span>01 / 03</span><span>सर्वे भवन्तु सुखिनः</span></div></section>
    <section className="intro section-wrap"><div className="section-label">01 — {t.pillars}</div><div className="intro-grid"><div><h2>{t.aboutTitle}</h2><Link className="under-link" to={location.slug === "mathura" ? "/about" : `/${location.slug}/about`} data-testid="intro-about-link">{t.about} <ArrowRight size={16} /></Link></div><p>{t.aboutBody}</p></div><div className="pillar-grid" id="work"><article data-testid="pillar-community"><UsersRound /><span>01</span><h3>Community</h3><p>Spaces where families meet, listen, and belong.</p></article><article data-testid="pillar-service"><HeartHandshake /><span>02</span><h3>Seva</h3><p>Turning shared values into action for our neighbours.</p></article><article data-testid="pillar-heritage"><Sparkles /><span>03</span><h3>Heritage</h3><p>Keeping our stories alive for the next generation.</p></article></div></section>
    <section className="quote-section"><div className="quote-mark">“</div><blockquote>समाज तभी आगे बढ़ता है,<br /><em>जब हर परिवार साथ चलता है।</em></blockquote><span>— Mahawar Sabha principle</span></section>
  </main>;
}

function About({ location, lang }) { const t = copy[lang]; return <main className="about-page"><section className="about-hero"><div className="section-label">02 — {t.about}</div><h1>{t.aboutTitle}</h1><p>{t.aboutBody}</p></section><section className="about-details"><div className="detail-image" style={{ backgroundImage: `url(${location.heroImage})` }} /><div className="detail-copy"><span className="eyebrow">Our foundation</span><h2>A sabha is more than a gathering.</h2><p>It is a promise to show up for one another — in celebration, in difficulty, and in the everyday moments that make a community feel like home.</p><div className="stats"><strong>{location.stats[0]}<small>{location.stats[1]}</small></strong><strong>02<small>Locations growing together</small></strong></div></div></section></main>; }

function AppShell() { const [location, setLocation] = useState(resolveLocation); const [lang, setLang] = useState("en"); const path = useLocation().pathname; useEffect(() => { setLocation(resolveLocation()); document.title = `${location.name} | Mahawar Sabha`; }, [path, location.name]); const page = useMemo(() => <Routes><Route path="/" element={<Home location={location} lang={lang} />} /><Route path="/stories" element={<StoriesList />} /><Route path="/stories/:slug" element={<StoryDetail />} /><Route path="/about" element={<About location={location} lang={lang} />} /><Route path="/admin" element={<AdminMedia />} /><Route path="/admin/media" element={<AdminMedia />} /><Route path="/admin/stories" element={<AdminStories />} /><Route path="/:location" element={<Home location={location} lang={lang} />} /><Route path="/:location/about" element={<About location={location} lang={lang} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>, [location, lang]); return <div className="app-shell"><Header location={location} lang={lang} setLang={setLang} />{page}<Footer location={location} lang={lang} /></div>; }

export default function App() { return <BrowserRouter><AppShell /></BrowserRouter>; }